<?php
/**
 * GroundWork first-party analytics collector.
 *
 * Privacy design (see /privacy/ and docs/analytics.md):
 *  - Opt-in only. Stores nothing unless the visitor allowed analytics on the
 *    banner (gw_consent=1 cookie) and the event carries the random visitor id
 *    that analytics.js creates only after that choice. No third parties.
 *  - IP address and user agent are NEVER stored.
 *  - Query strings are stripped from paths (so no emails/tokens leak in).
 *  - Honors Global Privacy Control (Sec-GPC) and Do Not Track headers.
 *  - Rows older than the retention window are pruned automatically.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

// Respect browser privacy signals: acknowledge, store nothing.
if (($_SERVER['HTTP_SEC_GPC'] ?? '') === '1' || ($_SERVER['HTTP_DNT'] ?? '') === '1') { http_response_code(204); exit; }

// No consent, no record. The browser script already stays silent; this is the server-side guarantee.
if (($_COOKIE['gw_consent'] ?? '') !== '1') { http_response_code(204); exit; }

$raw = file_get_contents('php://input', false, null, 0, 4096);
$in = json_decode((string)$raw, true);
if (!is_array($in)) { http_response_code(400); exit; }

$vid = (string)($in['vid'] ?? '');
$sid = (string)($in['sid'] ?? '');
if (!preg_match('/^[0-9a-f]{24}$/', $vid) || !preg_match('/^[0-9a-f]{24}$/', $sid)) { http_response_code(400); exit; }

$type = $in['type'] ?? '';
if (!in_array($type, ['pageview', 'click', 'submit', 'ui'], true)) { http_response_code(400); exit; }

// Interaction events: fixed whitelist, never free text. Keep in sync with docs/analytics.md.
const GW_UI_LABELS = ['plan_host', 'plan_grow', 'compare_use', 'demo_package', 'demo_book', 'price_seen'];
if ($type === 'ui' && !in_array((string)($in['label'] ?? ''), GW_UI_LABELS, true)) { http_response_code(400); exit; }

$path = gw_clean_path((string)($in['path'] ?? '/'));
$ref  = gw_host_only((string)($in['ref'] ?? ''));
// Ignore self-referrals (any of our own hosts) so "referrer" means where the visit came from.
if ($ref !== '' && ($ref === gw_own_host() || 'www.' . $ref === gw_own_host() || preg_match('/(^|\.)groundwork-web\.com$/', $ref))) $ref = '';

$target = $type === 'click' ? gw_clean_target((string)($in['target'] ?? '')) : '';
$label  = gw_trim((string)($in['label'] ?? ''), 80);
$utm_s  = gw_trim((string)($in['utm_source'] ?? ''), 40);
$utm_m  = gw_trim((string)($in['utm_medium'] ?? ''), 40);
$utm_c  = gw_trim((string)($in['utm_campaign'] ?? ''), 60);
$demo   = gw_trim((string)($in['demo'] ?? ''), 30);
$w      = (int)($in['w'] ?? 0);
$device = $w <= 0 ? '' : ($w < 700 ? 'mobile' : ($w < 1100 ? 'tablet' : 'desktop'));

$host  = gw_own_host();
// Only our own hosts count, so local test servers and previews never land in the live numbers.
if (!preg_match('/(^|\.)groundwork-web\.com$/', $host)) { http_response_code(204); exit; }
// The owner's own visits don't count (the dashboard sign-in cookie is sent to /api/).
if (GW_STATS_KEY !== '' && hash_equals(hash_hmac('sha256', 'gw-dashboard', GW_STATS_KEY), (string)($_COOKIE['gw_admin'] ?? ''))) { http_response_code(204); exit; }
$host  = mb_substr($host, 0, 100);
$entry = !empty($in['newvisit']) ? 1 : 0;

$db = gw_db();
$db->prepare('INSERT INTO events (ts,type,host,path,ref,target,label,utm_source,utm_medium,utm_campaign,demo,device,vhash,sid,entry)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   ->execute([time(), $type, $host, $path, $ref, $target, $label, $utm_s, $utm_m, $utm_c, $demo, $device, $vid, $sid, $entry]);

// Occasionally prune old rows (cheap, keeps retention promise without cron).
if (random_int(1, 100) === 1) {
    $db->prepare('DELETE FROM events WHERE ts < ?')->execute([time() - GW_RETENTION_DAYS * 86400]);
}

http_response_code(204);
