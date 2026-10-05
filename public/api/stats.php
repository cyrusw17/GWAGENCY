<?php
/**
 * GroundWork analytics dashboard. Private: sign in with GW_STATS_KEY (api/config.php).
 * Open https://groundwork-web.com/api/stats.php and paste the key once; a sign-in cookie
 * (HttpOnly, this folder only, 30 days) keeps you in. Old ?key= bookmarks still work and
 * are swapped for the cookie so the key leaves the address bar.
 * Data comes only from visitors who tapped "Allow" on the cookie banner.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');

if (GW_STATS_KEY === '') { http_response_code(503); echo 'Set GW_STATS_KEY in api/config.php to enable the dashboard.'; exit; }

$token = hash_hmac('sha256', 'gw-dashboard', GW_STATS_KEY);
$cookie = fn(string $v, int $age) => setcookie('gw_admin', $v, ['expires' => $age ? time() + $age : 1, 'path' => '/api/',
    'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
$self = strtok($_SERVER['REQUEST_URI'] ?? '/api/stats.php', '?');

if (isset($_GET['logout'])) { $cookie('', 0); header('Location: ' . $self); exit; }
$given = (string)($_POST['key'] ?? $_GET['key'] ?? '');
if ($given !== '') {
    // Rate limit: 5 wrong keys locks the address out for 15 minutes. Stored as sha256(IP + day) only, never the IP.
    $who = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . gmdate('Y-m-d'));
    if (!is_dir(GW_DATA_DIR)) mkdir(GW_DATA_DIR, 0750, true);
    $ff = GW_DATA_DIR . '/login-fails.json';
    $fails = is_file($ff) ? (json_decode((string)file_get_contents($ff), true) ?: []) : [];
    $fails = array_filter(array_map(fn($l) => array_values(array_filter($l, fn($t) => $t > time() - 900)), $fails));
    if (count($fails[$who] ?? []) >= 5) { http_response_code(429); header('Retry-After: 900'); echo 'Too many tries. Wait 15 minutes.'; exit; }
    if (!hash_equals(GW_STATS_KEY, $given)) {
        $fails[$who][] = time();
        file_put_contents($ff, json_encode($fails), LOCK_EX);
        usleep(400000); http_response_code(403); $bad = true;
    }
    else { $cookie($token, 30 * 86400); header('Location: ' . $self . (isset($_GET['days']) ? '?days=' . (int)$_GET['days'] : '')); exit; }
}
if (!hash_equals($token, (string)($_COOKIE['gw_admin'] ?? ''))) {
    ?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Sign in · GroundWork analytics</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0C0D10;color:#E6E1D6;font:16px/1.5 system-ui,sans-serif;padding:16px}
form{background:#16181E;border:1px solid #3A3F48;border-radius:10px;padding:24px;max-width:360px;width:100%;box-sizing:border-box}
label{display:block;font-weight:600;margin-bottom:8px}input{width:100%;box-sizing:border-box;padding:12px;border-radius:7px;border:1px solid #3A3F48;background:#0C0D10;color:inherit;font:inherit}
button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:7px;background:#E5A00D;color:#0C0D10;font:600 16px system-ui,sans-serif;cursor:pointer}p{color:#d98a8a;margin:10px 0 0}</style></head><body>
<form method="post"><label for="k">Dashboard key</label><input id="k" name="key" type="password" autocomplete="current-password" required autofocus>
<button>Open dashboard</button><?php if (!empty($bad)): ?><p>That key didn't match.</p><?php endif; ?></form></body></html><?php
    exit;
}

$days = max(1, min(400, (int)($_GET['days'] ?? 30)));
$since = time() - $days * 86400;
$db = gw_db();
$q = function (string $sql, array $p = []) use ($db): array { $s = $db->prepare($sql); $s->execute($p); return $s->fetchAll(); };
$one = fn(string $sql, array $p = []) => $q($sql, $p)[0] ?? [];
$S = [$since];

// Headline numbers. A "visit" is one sid (ends after 30 idle minutes); a "visitor" is one consented vid.
$totals = $one("SELECT
    SUM(type='pageview') pageviews, SUM(type='click') clicks, SUM(type='submit') submits,
    COUNT(DISTINCT CASE WHEN type='pageview' THEN vhash END) visitors,
    COUNT(DISTINCT CASE WHEN sid<>'' THEN sid END) visits,
    COUNT(DISTINCT CASE WHEN type='submit' AND sid<>'' THEN sid END) converting_visits
  FROM events WHERE ts>=?", $S);
$newVisitors = (int)($one("SELECT COUNT(*) n FROM (SELECT vhash FROM events WHERE type='pageview' AND sid<>'' GROUP BY vhash HAVING MIN(ts)>=?)", $S)['n'] ?? 0);
$returning = max(0, (int)$totals['visitors'] - $newVisitors);

// Conversion clicks: anything that moves a prospect toward a call, a form or a payment.
$ctaWhere = "type='click' AND (target LIKE '/audit/%' OR target LIKE '/start/%' OR target LIKE '/site-check/%' OR target LIKE '%buy.stripe.com%'
    OR target LIKE '%calendly.com%' OR target IN ('tel:','sms:','mailto:') OR target LIKE '#book%' OR target LIKE '#quote%')";
$ctaTotal = (int)($one("SELECT COUNT(*) n FROM events WHERE $ctaWhere AND ts>=?", $S)['n'] ?? 0);

$byDay   = $q("SELECT date(ts,'unixepoch') d, SUM(type='pageview') pv, COUNT(DISTINCT CASE WHEN sid<>'' THEN sid END) vi, SUM(type='click') ck, SUM(type='submit') sb FROM events WHERE ts>=? GROUP BY d ORDER BY d DESC", $S);
$pagesRaw = $q("SELECT host, path, COUNT(*) n, COUNT(DISTINCT vhash) u FROM events WHERE type='pageview' AND ts>=? GROUP BY host, path ORDER BY n DESC", $S);
$clicks  = $q("SELECT target, label, host, path AS from_page, COUNT(*) n FROM events WHERE type='click' AND ts>=? GROUP BY target,label,host,path ORDER BY n DESC LIMIT 60", $S);
$ctas    = $q("SELECT label, target, COUNT(*) n FROM events WHERE $ctaWhere AND ts>=? GROUP BY label, target ORDER BY n DESC LIMIT 30", $S);
$ui      = $q("SELECT host, path, label, COUNT(*) n FROM events WHERE type='ui' AND ts>=? GROUP BY host,path,label ORDER BY n DESC", $S);
$submits = $q("SELECT label, COUNT(*) n FROM events WHERE type='submit' AND ts>=? GROUP BY label ORDER BY n DESC", $S);
$camps   = $q("SELECT utm_source s, utm_medium m, utm_campaign c, COUNT(DISTINCT sid) v, SUM(type='pageview') n, COUNT(DISTINCT CASE WHEN type='submit' THEN sid END) f FROM events WHERE (utm_source<>'' OR utm_campaign<>'') AND ts>=? GROUP BY s,m,c ORDER BY v DESC LIMIT 30", $S);
$demos   = $q("SELECT demo, COUNT(*) n FROM events WHERE demo<>'' AND ts>=? GROUP BY demo ORDER BY n DESC", $S);
$devices = $q("SELECT device, COUNT(DISTINCT sid) n FROM events WHERE device<>'' AND sid<>'' AND ts>=? GROUP BY device ORDER BY n DESC", $S);
// The first page of each visit: where they came from and where they landed.
$entries = $q("SELECT e.host, e.path, e.ref, e.utm_source, e.utm_medium, e.sid,
    EXISTS(SELECT 1 FROM events s WHERE s.sid=e.sid AND s.type='submit') conv
  FROM events e WHERE e.type='pageview' AND e.sid<>'' AND e.ts>=? AND e.id=(SELECT MIN(id) FROM events f WHERE f.sid=e.sid AND f.type='pageview')", $S);

function gw_channel(array $r): string {
    $src = strtolower($r['utm_source'] . ' ' . $r['utm_medium']);
    $ref = $r['ref'];
    if (str_contains($src, 'email') || str_contains($src, 'newsletter')) return 'Email';
    if ($ref === '' && trim($src) === '') return 'Direct';
    if (preg_match('/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex|baidu)\./', $ref)) return 'Search';
    if (preg_match('/(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google|copilot\.microsoft)/', $ref)) return 'AI assistants';
    if (preg_match('/(facebook|instagram|linkedin|t\.co$|x\.com|twitter|nextdoor|youtube|tiktok|reddit|pinterest)/', $ref . ' ' . $src)) return 'Social';
    return $ref !== '' ? 'Referral' : 'Campaign';
}
function gw_section(string $host, string $path): string {
    if (str_contains($path, '/blog/')) return 'Blogs';
    if (preg_match('#^/(demos|work)/#', $path)) return 'Demos';
    if (preg_match('/^(detailing|exterior|landscaping|commercial|realestate)\./', $host)
        || preg_match('#^/(auto-detailing|exterior-cleaning|landscaping|commercial-cleaning|real-estate)/#', $path)) return 'Niche selling pages';
    return 'Agency site';
}
$channels = []; $landing = []; $refs = [];
foreach ($entries as $r) {
    $c = gw_channel($r);
    $channels[$c]['v'] = ($channels[$c]['v'] ?? 0) + 1;
    $channels[$c]['c'] = ($channels[$c]['c'] ?? 0) + (int)$r['conv'];
    $k = $r['host'] . $r['path'];
    $landing[$k]['v'] = ($landing[$k]['v'] ?? 0) + 1;
    $landing[$k]['c'] = ($landing[$k]['c'] ?? 0) + (int)$r['conv'];
    if ($r['ref'] !== '') $refs[$r['ref']] = ($refs[$r['ref']] ?? 0) + 1;
}
uasort($channels, fn($a, $b) => $b['v'] <=> $a['v']); uasort($landing, fn($a, $b) => $b['v'] <=> $a['v']); arsort($refs);
$sections = []; $hosts = [];
foreach ($pagesRaw as $r) {
    $s = gw_section($r['host'], $r['path']);
    $sections[$s] = ($sections[$s] ?? 0) + $r['n'];
    $h = $r['host'] ?: '(before host tracking)';
    $hosts[$h] = ($hosts[$h] ?? 0) + $r['n'];
}
arsort($sections); arsort($hosts);
$pages = array_slice($pagesRaw, 0, 40);

// Lead source comes from the form itself (UTM tags, form page, outside referrer), so it is
// there even for visitors who said no to analytics cookies.
function gw_lead_source(array $l): string {
    $a = (string)($l['attribution'] ?? '');
    $j = json_decode($a, true);
    if (!is_array($j)) {                       // checklist forms send the page address
        $u = parse_url(str_contains($a, '://') ? $a : 'https://' . ltrim($a, '/'));
        parse_str($u['query'] ?? '', $j);
        $j['page'] = ($u['host'] ?? '') . ($u['path'] ?? '');
    }
    $tag = trim(implode(' / ', array_filter([$j['utm_source'] ?? '', $j['utm_campaign'] ?? ''])));
    $from = $tag !== '' ? $tag : (!empty($j['ref']) ? $j['ref'] : 'no tag');
    $page = preg_replace('/^(www\.)?groundwork-web\.com/', '', (string)($j['page'] ?? ''));
    $demo = !empty($l['demo']) ? ' · demo ' . $l['demo'] : '';
    return $from . ($page !== '' ? ' · on ' . $page : '') . $demo;
}
$hasLeads = (bool)$q("SELECT 1 FROM sqlite_master WHERE type='table' AND name='leads'");
$leads = $hasLeads ? $q("SELECT * FROM leads WHERE ts>=? ORDER BY ts DESC LIMIT 50", $S) : [];

$h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$pct = fn($a, $b) => $b ? round(100 * $a / $b) . '%' : '—';
$where = fn(array $r) => ($r['host'] && !preg_match('/^(www\.)?groundwork-web\.com$/', $r['host']) ? $r['host'] : '') . $r['path'];

// Visits per day, oldest left. One series, one hue; hover a bar for the day's numbers.
$chart = array_reverse($byDay);
$max = max(1, ...array_map(fn($r) => (int)$r['vi'], $chart ?: [['vi' => 1]]));
$bw = $chart ? 100 / count($chart) : 100;
?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>GroundWork analytics · last <?= $days ?> days</title>
<style>
:root{--void:#0C0D10;--panel:#16181E;--bone:#E6E1D6;--mute:#9AA0AA;--steel:#3A3F48;--signal:#E5A00D}
body{margin:0;background:var(--void);color:var(--bone);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:28px clamp(16px,4vw,48px)}
h1,h2{margin:0 0 12px;letter-spacing:.01em}
h1{font-size:26px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}h1 span{color:var(--mute);font-size:14px;font-weight:400}
h2{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--signal);margin-top:34px}
.bar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
.range a,.bar>a{color:var(--mute);margin-right:12px;font-size:14px}.range a.on{color:var(--bone);border-bottom:1px solid var(--signal)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:20px}
.kpi{background:var(--panel);border:1px solid var(--steel);border-radius:8px;padding:14px 16px}.kpi b{display:block;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}.kpi span{color:var(--mute);font-size:13px}
.wrap{overflow-x:auto;border:1px solid var(--steel);border-radius:8px}
table{width:100%;border-collapse:collapse;font-size:15px;background:var(--panel)}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--steel);vertical-align:top}th{color:var(--mute);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
td.n{text-align:right;font-variant-numeric:tabular-nums;width:1%;white-space:nowrap}tr:last-child td{border-bottom:0}
td.u{word-break:break-all}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:0 24px}
.funnel{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.funnel div{background:var(--panel);border:1px solid var(--steel);border-radius:8px;padding:14px}.funnel b{display:block;font-size:24px}.funnel small{color:var(--mute)}
.chart{background:var(--panel);border:1px solid var(--steel);border-radius:8px;padding:14px 14px 8px}
.chart svg{display:block;width:100%;height:160px}.chart rect{fill:#E5A00D}.chart rect:hover{fill:#F4C55A}
.chart .ax{display:flex;justify-content:space-between;color:var(--mute);font-size:12px;margin-top:6px}
.empty{color:var(--mute);font-style:italic}
p.sub{color:var(--mute);font-size:14px;margin:-6px 0 12px}
.toggle{margin-top:10px;background:none;border:1px solid var(--steel);color:var(--bone);border-radius:7px;padding:10px 14px;font:inherit;cursor:pointer;min-height:44px}
p.note{color:var(--mute);font-size:13px;margin-top:40px;max-width:70ch}
</style></head><body>
<div class="bar"><h1>GroundWork analytics <span>Opted-in visitors only · first-party · nothing shared</span></h1><a href="?logout=1">Sign out</a></div>
<div class="range">Range:
<?php foreach ([1, 7, 30, 90, 400] as $d): ?><a class="<?= $d === $days ? 'on' : '' ?>" href="?days=<?= $d ?>"><?= $d === 400 ? 'All (13 mo)' : ($d === 1 ? 'Today' : "$d days") ?></a><?php endforeach; ?>
</div>

<div class="kpis">
  <div class="kpi"><b><?= (int)$totals['visitors'] ?></b><span>Visitors (<?= $newVisitors ?> new, <?= $returning ?> returning)</span></div>
  <div class="kpi"><b><?= (int)$totals['visits'] ?></b><span>Visits</span></div>
  <div class="kpi"><b><?= (int)$totals['pageviews'] ?></b><span>Page views · <?= $totals['visits'] ? round($totals['pageviews'] / $totals['visits'], 1) : 0 ?> per visit</span></div>
  <div class="kpi"><b><?= (int)$totals['clicks'] ?></b><span>Link clicks</span></div>
  <div class="kpi"><b><?= $ctaTotal ?></b><span>CTA clicks (call, text, book, start, pay)</span></div>
  <div class="kpi"><b><?= (int)$totals['submits'] ?></b><span>Forms sent · <?= $pct($totals['converting_visits'], $totals['visits']) ?> of visits</span></div>
</div>

<h2>Visits per day</h2>
<div class="chart">
<?php if (!$chart): ?><p class="empty">No visits yet.</p><?php else: ?>
<svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Visits per day, see the By day table for numbers">
<?php foreach ($chart as $i => $r): $bh = 38 * $r['vi'] / $max; ?><rect x="<?= round($i * $bw + $bw * .12, 3) ?>" y="<?= round(40 - $bh, 3) ?>" width="<?= round($bw * .76, 3) ?>" height="<?= round(max($bh, .4), 3) ?>" rx=".6"><title><?= $h($r['d']) ?>: <?= (int)$r['vi'] ?> visits, <?= (int)$r['pv'] ?> views, <?= (int)$r['ck'] ?> clicks, <?= (int)$r['sb'] ?> forms</title></rect><?php endforeach; ?>
</svg>
<div class="ax"><span><?= $h($chart[0]['d']) ?></span><span>peak <?= $max ?> visits</span><span><?= $h(end($chart)['d']) ?></span></div>
<?php endif; ?>
</div>

<div class="grid">
<section><h2>Where visits came from</h2>
<div class="wrap"><table><tr><th>Channel</th><th>Visits</th><th>Sent a form</th></tr>
<?php if (!$channels): ?><tr><td colspan="3" class="empty">No visits yet.</td></tr><?php endif; ?>
<?php foreach ($channels as $c => $r): ?><tr><td><?= $h($c) ?></td><td class="n"><?= $r['v'] ?></td><td class="n"><?= $r['c'] ?> · <?= $pct($r['c'], $r['v']) ?></td></tr><?php endforeach; ?></table></div></section>

<section><h2>Referring sites</h2>
<div class="wrap"><table><tr><th>Site</th><th>Visits</th></tr>
<?php if (!$refs): ?><tr><td colspan="2" class="empty">No referring sites yet.</td></tr><?php endif; ?>
<?php foreach (array_slice($refs, 0, 20, true) as $r => $n): ?><tr><td class="u"><?= $h($r) ?></td><td class="n"><?= $n ?></td></tr><?php endforeach; ?></table></div></section>
</div>

<h2>Leads (<?= count($leads) ?>)</h2>
<div class="wrap"><table><tr><th>When (UTC)</th><th>Form</th><th>Business</th><th>Contact</th><th>Source</th><th>Plan</th><th>Notes</th></tr>
<?php if (!$leads): ?><tr><td colspan="7" class="empty">No submissions yet.</td></tr><?php endif; ?>
<?php foreach ($leads as $l): ?><tr>
  <td><?= gmdate('M j, g:ia', (int)$l['ts']) ?></td>
  <td><?= $l['form'] === 'start' ? '<b style="color:var(--signal)">BUILD</b>' : $h(ucfirst($l['form'])) ?></td>
  <td><?= $h($l['shop']) ?><br><small style="color:var(--mute)"><?= $h($l['city']) ?> · <?= $h($l['type']) ?></small></td>
  <td><?= $h($l['name']) ?><br><small><a style="color:var(--bone)" href="mailto:<?= $h($l['email']) ?>"><?= $h($l['email']) ?></a> <?= $h($l['phone']) ?></small></td>
  <td class="u"><?= $h(gw_lead_source($l)) ?></td>
  <td><?= $h(strtoupper((string)$l['plan'])) ?></td>
  <td style="max-width:320px"><small><?= $h($l['notes'] ?? '') ?><?= !empty($l['times']) ? ' · Times: ' . $h($l['times']) : '' ?><?= !empty($l['links']) ? '<br>' . $h($l['links']) : '' ?></small></td>
</tr><?php endforeach; ?></table></div>

<h2>Campaigns (UTM tags)</h2>
<div class="wrap"><table><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Visits</th><th>Views</th><th>Sent a form</th></tr>
<?php if (!$camps): ?><tr><td colspan="6" class="empty">Tag cold-email links like ?utm_source=email&amp;utm_campaign=tx1 to see them here.</td></tr><?php endif; ?>
<?php foreach ($camps as $r): ?><tr><td><?= $h($r['s']) ?></td><td><?= $h($r['m']) ?></td><td><?= $h($r['c']) ?></td><td class="n"><?= $r['v'] ?></td><td class="n"><?= $r['n'] ?></td><td class="n"><?= $r['f'] ?></td></tr><?php endforeach; ?></table></div>

<div class="grid">
<section><h2>Views by part of the site</h2>
<div class="wrap"><table><tr><th>Section</th><th>Views</th></tr>
<?php if (!$sections): ?><tr><td colspan="2" class="empty">No views yet.</td></tr><?php endif; ?>
<?php foreach ($sections as $s => $n): ?><tr><td><?= $h($s) ?></td><td class="n"><?= $n ?></td></tr><?php endforeach; ?></table></div></section>

<section><h2>Views by site address</h2>
<div class="wrap"><table><tr><th>Host</th><th>Views</th></tr>
<?php if (!$hosts): ?><tr><td colspan="2" class="empty">No views yet.</td></tr><?php endif; ?>
<?php foreach ($hosts as $s => $n): ?><tr><td class="u"><?= $h($s) ?></td><td class="n"><?= $n ?></td></tr><?php endforeach; ?></table></div></section>
</div>

<h2>Funnel (visits)</h2>
<p class="sub">Forms also sit on the blogs and selling pages, so a visit can send one without a CTA click.</p>
<?php
$fn = $one("SELECT
    COUNT(DISTINCT CASE WHEN sid<>'' THEN sid END) visits,
    COUNT(DISTINCT CASE WHEN type='click' AND ($ctaWhere) THEN sid END) clicked_cta,
    COUNT(DISTINCT CASE WHEN type='submit' THEN sid END) submitted
  FROM events WHERE sid<>'' AND ts>=?", $S);
?>
<div class="funnel">
  <div><b><?= (int)$fn['visits'] ?></b><small>Visits</small></div>
  <div><b><?= (int)$fn['clicked_cta'] ?></b><small>Clicked a CTA · <?= $pct($fn['clicked_cta'], $fn['visits']) ?></small></div>
  <div><b><?= (int)$fn['submitted'] ?></b><small>Sent a form · <?= $pct($fn['submitted'], $fn['visits']) ?></small></div>
</div>

<div class="grid">
<section><h2>CTA clicks</h2>
<div class="wrap"><table><tr><th>Button or link</th><th>Goes to</th><th>Clicks</th></tr>
<?php if (!$ctas): ?><tr><td colspan="3" class="empty">No CTA clicks yet.</td></tr><?php endif; ?>
<?php foreach ($ctas as $r): ?><tr><td><?= $h($r['label']) ?></td><td class="u"><?= $h($r['target']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div></section>

<section><h2>Forms sent</h2>
<div class="wrap"><table><tr><th>Form</th><th>Count</th></tr>
<?php if (!$submits): ?><tr><td colspan="2" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($submits as $r): ?><tr><td><?= $h($r['label']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div></section>
</div>

<div class="grid">
<section><h2>Landing pages</h2>
<div class="wrap"><table><tr><th>First page of the visit</th><th>Visits</th><th>Sent a form</th></tr>
<?php if (!$landing): ?><tr><td colspan="3" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach (array_slice($landing, 0, 20, true) as $p => $r): ?><tr><td class="u"><?= $h(preg_replace('/^(www\.)?groundwork-web\.com/', '', $p)) ?></td><td class="n"><?= $r['v'] ?></td><td class="n"><?= $r['c'] ?> · <?= $pct($r['c'], $r['v']) ?></td></tr><?php endforeach; ?></table></div></section>

<section><h2>All pages</h2>
<div class="wrap"><table><tr><th>Page</th><th>Views</th><th>Visitors</th></tr>
<?php if (!$pages): ?><tr><td colspan="3" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($pages as $r): ?><tr><td class="u"><?= $h($where($r)) ?></td><td class="n"><?= $r['n'] ?></td><td class="n"><?= $r['u'] ?></td></tr><?php endforeach; ?></table></div></section>
</div>

<h2>Every link clicked</h2>
<div class="wrap"><table><tr><th>Goes to</th><th>Link text</th><th>On page</th><th>Clicks</th></tr>
<?php if (!$clicks): ?><tr><td colspan="4" class="empty">No clicks yet.</td></tr><?php endif; ?>
<?php foreach ($clicks as $i => $r): ?><tr<?= $i >= 15 ? ' class="more" hidden' : '' ?>><td class="u"><?= $h($r['target']) ?></td><td><?= $h($r['label']) ?></td><td class="u"><?= $h($where(['host' => $r['host'], 'path' => $r['from_page']])) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div>
<?php if (count($clicks) > 15): ?><button type="button" class="toggle" onclick="document.querySelectorAll('tr.more').forEach(function(t){t.hidden=false});this.remove()">Show all <?= count($clicks) ?> links</button><?php endif; ?>

<div class="grid">
<section><h2>Interactions (price picker, slider, sample booking)</h2>
<div class="wrap"><table><tr><th>Page</th><th>Interaction</th><th>Count</th></tr>
<?php if (!$ui): ?><tr><td colspan="3" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($ui as $r): ?><tr><td class="u"><?= $h($where($r)) ?></td><td><?= $h($r['label']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div></section>

<section><h2>Devices</h2>
<div class="wrap"><table><tr><th>Device</th><th>Visits</th></tr>
<?php if (!$devices): ?><tr><td colspan="2" class="empty">None yet.</td></tr><?php endif; ?>
<?php foreach ($devices as $r): ?><tr><td><?= $h($r['device']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div>
<?php if ($demos): ?><h2>Demo links (?demo=)</h2>
<div class="wrap"><table><tr><th>Demo</th><th>Events</th></tr>
<?php foreach ($demos as $r): ?><tr><td><?= $h($r['demo']) ?></td><td class="n"><?= $r['n'] ?></td></tr><?php endforeach; ?></table></div><?php endif; ?>
</section>
</div>

<h2>By day</h2>
<div class="wrap"><table><tr><th>Day (UTC)</th><th>Visits</th><th>Views</th><th>Clicks</th><th>Forms</th></tr>
<?php if (!$byDay): ?><tr><td colspan="5" class="empty">No data yet.</td></tr><?php endif; ?>
<?php foreach ($byDay as $r): ?><tr><td><?= $h($r['d']) ?></td><td class="n"><?= $r['vi'] ?></td><td class="n"><?= $r['pv'] ?></td><td class="n"><?= $r['ck'] ?></td><td class="n"><?= $r['sb'] ?></td></tr><?php endforeach; ?></table></div>

<p class="note">Only visitors who tapped "Allow" on the cookie banner are counted, so these numbers undercount real traffic; leads are always complete because forms don't depend on the banner. A visit ends after 30 idle minutes. Visitor ids last 6 months from the last visit. Events are deleted after <?= GW_RETENTION_DAYS ?> days.</p>
</body></html>
