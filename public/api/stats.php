<?php
/**
 * GroundWork analytics dashboard. Private: requires ?key= matching GW_STATS_KEY.
 * Example: https://yourdomain.com/api/stats.php?key=YOUR_KEY&days=30
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

if (GW_STATS_KEY === '' || !hash_equals(GW_STATS_KEY, (string)($_GET['key'] ?? ''))) {
    http_response_code(GW_STATS_KEY === '' ? 503 : 403);
    echo GW_STATS_KEY === '' ? 'Set GW_STATS_KEY in api/config.php to enable the dashboard.' : 'Forbidden';
    exit;
}

$days = max(1, min(400, (int)($_GET['days'] ?? 30)));
$since = time() - $days * 86400;
$db = gw_db();
$q = function (string $sql, array $p = []) use ($db): array { $s = $db->prepare($sql); $s->execute($p); return $s->fetchAll(); };
$one = fn(string $sql, array $p = []) => $q($sql, $p)[0] ?? [];

$totals = $one("SELECT
    SUM(type='pageview') AS pageviews,
    SUM(type='click') AS clicks,
    SUM(type='submit') AS submits,
    COUNT(DISTINCT CASE WHEN type='pageview' THEN vhash||date(ts,'unixepoch') END) AS daily_uniques
  FROM events WHERE ts >= ?", [$since]);

$byDay   = $q("SELECT date(ts,'unixepoch') d, SUM(type='pageview') pv, COUNT(DISTINCT CASE WHEN type='pageview' THEN vhash END) uv, SUM(type='click') ck, SUM(type='submit') sb FROM events WHERE ts>=? GROUP BY d ORDER BY d DESC", [$since]);
$pages   = $q("SELECT path, COUNT(*) n, COUNT(DISTINCT vhash||date(ts,'unixepoch')) u FROM events WHERE type='pageview' AND ts>=? GROUP BY path ORDER BY n DESC LIMIT 30", [$since]);
$clicks  = $q("SELECT target, label, path AS from_page, COUNT(*) n FROM events WHERE type='click' AND ts>=? GROUP BY target,label,path ORDER BY n DESC LIMIT 60", [$since]);
$ctas    = $q("SELECT label, COUNT(*) n FROM events WHERE type='click' AND ts>=? AND (target LIKE '/audit/%' OR target LIKE '/start/%' OR target LIKE '%buy.stripe.com%' OR target LIKE '%calendly.com%') GROUP BY label ORDER BY n DESC", [$since]);
$ui      = $q("SELECT path, label, COUNT(*) n FROM events WHERE type='ui' AND ts>=? GROUP BY path,label ORDER BY path, n DESC", [$since]);
$refs    = $q("SELECT ref, COUNT(*) n FROM events WHERE type='pageview' AND ref<>'' AND ts>=? GROUP BY ref ORDER BY n DESC LIMIT 20", [$since]);
$camps   = $q("SELECT utm_source s, utm_medium m, utm_campaign c, COUNT(*) n, COUNT(DISTINCT vhash||date(ts,'unixepoch')) u FROM events WHERE type='pageview' AND (utm_source<>'' OR utm_campaign<>'') AND ts>=? GROUP BY s,m,c ORDER BY n DESC LIMIT 30", [$since]);
$demos   = $q("SELECT demo, COUNT(*) n FROM events WHERE demo<>'' AND ts>=? GROUP BY demo ORDER BY n DESC", [$since]);
$devices = $q("SELECT device, COUNT(*) n FROM events WHERE type='pageview' AND device<>'' AND ts>=? GROUP BY device ORDER BY n DESC", [$since]);
$submits = $q("SELECT label, COUNT(*) n FROM events WHERE type='submit' AND ts>=? GROUP BY label ORDER BY n DESC", [$since]);

// Funnel: visitors who saw home/demos → saw audit or start → submitted
$funnel = $one("SELECT
    COUNT(DISTINCT CASE WHEN type='pageview' THEN vhash||date(ts,'unixepoch') END) visitors,
    COUNT(DISTINCT CASE WHEN type='pageview' AND path LIKE '/demos/%' THEN vhash||date(ts,'unixepoch') END) saw_demo,
    COUNT(DISTINCT CASE WHEN type='pageview' AND (path='/audit/' OR path='/start/') THEN vhash||date(ts,'unixepoch') END) reached_cta_page,
    COUNT(DISTINCT CASE WHEN type='submit' THEN vhash||date(ts,'unixepoch') END) submitted
  FROM events WHERE ts>=?", [$since]);

$hasLeads = (bool)$q("SELECT 1 FROM sqlite_master WHERE type='table' AND name='leads'");
$leads = $hasLeads ? $q("SELECT * FROM leads WHERE ts>=? ORDER BY ts DESC LIMIT 50", [$since]) : [];

$h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$pct = fn($a, $b) => $b ? round(100 * $a / $b) . '%' : '—';
$key = $h($_GET['key']);
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GroundWork analytics — last <?= $days ?> days</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--void:#0C0D10;--panel:#16181E;--bone:#E6E1D6;--mute:#8B909A;--steel:#3A3F48;--signal:#E5A00D}
body{margin:0;background:var(--void);color:var(--bone);font:16px/1.5 "Source Sans 3",system-ui,sans-serif;padding:32px clamp(16px,4vw,48px)}
h1,h2{font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.02em;margin:0 0 14px}
h1{font-size:28px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}h1 span{color:var(--mute);font-size:14px;letter-spacing:.14em}
h2{font-size:15px;letter-spacing:.14em;color:var(--signal);margin-top:34px}
.range a{color:var(--mute);margin-right:12px;font-size:14px}.range a.on{color:var(--bone);border-bottom:1px solid var(--signal)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:22px}
.kpi{background:var(--panel);border:1px solid var(--steel);border-radius:8px;padding:16px}.kpi b{display:block;font:600 34px/1 Oswald,sans-serif}.kpi span{color:var(--mute);font-size:13px;text-transform:uppercase;letter-spacing:.1em}
table{width:100%;border-collapse:collapse;font-size:15px;background:var(--panel);border:1px solid var(--steel);border-radius:8px;overflow:hidden}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--steel)}th{color:var(--mute);font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:600}
td.n{text-align:right;font-variant-numeric:tabular-nums;width:1%}tr:last-child td{border-bottom:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}
.funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.funnel div{background:var(--panel);border:1px solid var(--steel);border-radius:8px;padding:14px}.funnel b{display:block;font:600 26px/1 Oswald,sans-serif}.funnel small{color:var(--mute)}
.empty{color:var(--mute);font-style:italic;padding:12px}
p.note{color:var(--mute);font-size:13px;margin-top:40px}
</style></head><body>
<h1>GroundWork analytics <span>First-party · cookieless · no personal data</span></h1>
<div class="range">Range:
<?php foreach ([7, 30, 90, 400] as $d): ?><a class="<?= $d === $days ? 'on' : '' ?>" href="?key=<?= $key ?>&days=<?= $d ?>"><?= $d === 400 ? 'All (13 mo)' : "$d days" ?></a><?php endforeach; ?>
</div>

<div class="kpis">
  <div class="kpi"><b><?= (int)$totals['pageviews'] ?></b><span>Page views</span></div>
  <div class="kpi"><b><?= (int)$totals['daily_uniques'] ?></b><span>Daily unique visitors</span></div>
  <div class="kpi"><b><?= (int)$totals['clicks'] ?></b><span>Link clicks</span></div>
  <div class="kpi"><b><?= (int)$totals['submits'] ?></b><span>Form submits</span></div>
</div>

<h2>Leads (<?= count($leads) ?>)</h2>
<table><tr><th>When</th><th>Form</th><th>Shop</th><th>Contact</th><th>Plan</th><th>Demo</th><th>Notes</th></tr>
<?php if (!$leads): ?><tr><td colspan="7" class="empty">No submissions yet.</td></tr><?php endif; ?>
<?php foreach ($leads as $l): ?><tr>
  <td><?= date('M j, g:ia', (int)$l['ts']) ?></td>
  <td><?= $l['form'] === 'start' ? '<b style="color:var(--signal)">BUILD</b>' : 'Audit' ?></td>
  <td><?= $h($l['shop']) ?><br><small style="color:var(--mute)"><?= $h($l['city']) ?> · <?= $h($l['type']) ?></small></td>
  <td><?= $h($l['name']) ?><br><small><a style="color:var(--bone)" href="mailto:<?= $h($l['email']) ?>"><?= $h($l['email']) ?></a> <?= $h($l['phone']) ?></small></td>
  <td><?= $h(strtoupper($l['plan'])) ?></td>
  <td><?= $h($l['demo']) ?></td>
  <td style="max-width:320px"><small><?= $h($l['notes']) ?><?= $l['times'] ? ' · Times: ' . $h($l['times']) : '' ?><?= $l['links'] ? '<br>' . $h($l['links']) : '' ?></small></td>
</tr><?php endforeach; ?></table>

<h2>Funnel (unique visitors)</h2>
<div class="funnel">
  <div><b><?= (int)$funnel['visitors'] ?></b><small>Visited site</small></div>
  <div><b><?= (int)$funnel['saw_demo'] ?></b><small>Opened a demo · <?= $pct($funnel['saw_demo'], $funnel['visitors']) ?></small></div>
  <div><b><?= (int)$funnel['reached_cta_page'] ?></b><small>Reached /audit or /start · <?= $pct($funnel['reached_cta_page'], $funnel['visitors']) ?></small></div>
  <div><b><?= (int)$funnel['submitted'] ?></b><small>Submitted a form · <?= $pct($funnel['submitted'], $funnel['visitors']) ?></small></div>
</div>

<div class="grid">
<section><h2>Conversion clicks (audit / start / Stripe / Calendly)</h2>
<table><tr><th>Link text</th><th>Clicks</th></tr>
<?php if (!$ctas): ?><tr><td colspan="2" class="empty">No CTA clicks yet.</td></tr><?php endif; ?>
<?php foreach ($ctas as $r): ?><tr><td><?= $h($r['label']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></section>

<section><h2>Form submits</h2>
<table><tr><th>Form</th><th>Count</th></tr>
<?php if (!$submits): ?><tr><td colspan="2" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($submits as $r): ?><tr><td><?= $h($r['label']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></section>
</div>

<h2>Interactions (picker, slider, phone demo, price section)</h2>
<table><tr><th>Page</th><th>Interaction</th><th>Count</th></tr>
<?php if (!$ui): ?><tr><td colspan="3" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($ui as $r): ?><tr><td><?= $h($r['path']) ?></td><td><?= $h($r['label']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table>

<h2>Pages</h2>
<table><tr><th>Path</th><th>Views</th><th>Uniques</th></tr>
<?php foreach ($pages as $r): ?><tr><td><?= $h($r['path']) ?></td><td class="n"><?= $r['n'] ?></td><td class="n"><?= $r['u'] ?></td></tr><?php endforeach; ?></table>

<h2>Every link clicked</h2>
<table><tr><th>Target</th><th>Link text</th><th>From page</th><th>Clicks</th></tr>
<?php if (!$clicks): ?><tr><td colspan="4" class="empty">No clicks yet.</td></tr><?php endif; ?>
<?php foreach ($clicks as $r): ?><tr><td><?= $h($r['target']) ?></td><td><?= $h($r['label']) ?></td><td><?= $h($r['from_page']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table>

<div class="grid">
<section><h2>Campaigns (UTM)</h2>
<table><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Views</th><th>Uniques</th></tr>
<?php if (!$camps): ?><tr><td colspan="5" class="empty">Tag your cold-email links with ?utm_source=email&amp;utm_campaign=tx1</td></tr><?php endif; ?>
<?php foreach ($camps as $r): ?><tr><td><?= $h($r['s']) ?></td><td><?= $h($r['m']) ?></td><td><?= $h($r['c']) ?></td><td class="n"><?= $r['n'] ?></td><td class="n"><?= $r['u'] ?></td></tr><?php endforeach; ?></table></section>

<section><h2>Referrers</h2>
<table><tr><th>Site</th><th>Visits</th></tr>
<?php if (!$refs): ?><tr><td colspan="2" class="empty">Direct traffic only so far.</td></tr><?php endif; ?>
<?php foreach ($refs as $r): ?><tr><td><?= $h($r['ref']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></section>

<section><h2>Demo interest</h2>
<table><tr><th>Demo</th><th>Events</th></tr>
<?php if (!$demos): ?><tr><td colspan="2" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($demos as $r): ?><tr><td><?= $h($r['demo']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></section>

<section><h2>Devices</h2>
<table><tr><th>Device</th><th>Views</th></tr>
<?php foreach ($devices as $r): ?><tr><td><?= $h($r['device']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></section>
</div>

<h2>By day</h2>
<table><tr><th>Day</th><th>Views</th><th>Uniques</th><th>Clicks</th><th>Submits</th></tr>
<?php foreach ($byDay as $r): ?><tr><td><?= $h($r['d']) ?></td><td class="n"><?= $r['pv'] ?></td><td class="n"><?= $r['uv'] ?></td><td class="n"><?= $r['ck'] ?></td><td class="n"><?= $r['sb'] ?></td></tr><?php endforeach; ?></table>

<p class="note">Uniques are counted per day using a hash that rotates every 24 hours; the same person on two days counts twice. This is by design — it's what lets us run without cookies or a consent banner. Retention: <?= GW_RETENTION_DAYS ?> days.</p>
</body></html>
