<?php
/**
 * Results for one client site, for the monthly results text and the 60-day guarantee.
 * Private: curl -H 'X-GW-Key: <GW_STATS_KEY>' 'https://groundwork-web.com/api/site-report.php?site=<slug>&days=60'
 * Returns counts only (visits, calls, texts, booking clicks, quote requests), never lead details.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

header('Cache-Control: no-store');
header('Content-Type: application/json');
// Key in a header so it stays out of server logs and browser history: curl -H "X-GW-Key: ..." ...
if (GW_STATS_KEY === '' || !hash_equals(GW_STATS_KEY, (string)($_SERVER['HTTP_X_GW_KEY'] ?? ''))) { http_response_code(403); echo '{"ok":false}'; exit; }

$site = (string)($_GET['site'] ?? '');
$days = max(1, min(400, (int)($_GET['days'] ?? 30)));
$since = time() - $days * 86400;
$db = gw_db();
$db->exec('CREATE TABLE IF NOT EXISTS site_events (id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, site TEXT NOT NULL, type TEXT NOT NULL, label TEXT NOT NULL DEFAULT "", path TEXT NOT NULL DEFAULT "", device TEXT NOT NULL DEFAULT "", vhash TEXT NOT NULL)');

$s = $db->prepare('SELECT type, COUNT(*) n, COUNT(DISTINCT vhash || date(ts, "unixepoch")) people FROM site_events WHERE site = ? AND ts >= ? GROUP BY type');
$s->execute([$site, $since]);
$out = ['ok' => true, 'site' => $site, 'days' => $days, 'counts' => []];
foreach ($s->fetchAll() as $r) $out['counts'][$r['type']] = ['events' => (int)$r['n'], 'visitors' => (int)$r['people']];
foreach (['pageview', 'call', 'text', 'book', 'lead'] as $t) $out['counts'][$t] ??= ['events' => 0, 'visitors' => 0];
$c = $out['counts'];
$out['contacts'] = $c['call']['visitors'] + $c['text']['visitors'] + $c['lead']['events']; // people who reached out
echo json_encode($out, JSON_PRETTY_PRINT);
