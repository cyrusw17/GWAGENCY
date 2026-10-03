<?php
/**
 * GroundWork first-party analytics collector.
 *
 * Privacy design (see /privacy/ and ops/LEGAL_TRACKING.md):
 *  - No cookies. No localStorage identifiers. No third parties.
 *  - IP address and user agent are NEVER stored. They are hashed with a
 *    secret salt that rotates daily, so the resulting "visitor hash" can only
 *    count unique visitors within one day and cannot identify anyone later.
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

$raw = file_get_contents('php://input', false, null, 0, 4096);
$in = json_decode((string)$raw, true);
if (!is_array($in)) { http_response_code(400); exit; }

$type = $in['type'] ?? '';
if (!in_array($type, ['pageview', 'click', 'submit', 'ui'], true)) { http_response_code(400); exit; }

// Interaction events: fixed whitelist, never free text. Keep in sync with docs/redesign/TRACKING.md.
const GW_UI_LABELS = ['plan_host', 'plan_grow', 'compare_use', 'demo_package', 'demo_book', 'price_seen'];
if ($type === 'ui' && !in_array((string)($in['label'] ?? ''), GW_UI_LABELS, true)) { http_response_code(400); exit; }

$path = gw_clean_path((string)($in['path'] ?? '/'));
$ref  = gw_host_only((string)($in['ref'] ?? ''));
// Ignore self-referrals so "referrer" means where the visit came from.
if ($ref !== '' && ($ref === gw_own_host() || 'www.' . $ref === gw_own_host())) $ref = '';

$target = $type === 'click' ? gw_clean_target((string)($in['target'] ?? '')) : '';
$label  = gw_trim((string)($in['label'] ?? ''), 80);
$utm_s  = gw_trim((string)($in['utm_source'] ?? ''), 40);
$utm_m  = gw_trim((string)($in['utm_medium'] ?? ''), 40);
$utm_c  = gw_trim((string)($in['utm_campaign'] ?? ''), 60);
$demo   = gw_trim((string)($in['demo'] ?? ''), 30);
$w      = (int)($in['w'] ?? 0);
$device = $w <= 0 ? '' : ($w < 700 ? 'mobile' : ($w < 1100 ? 'tablet' : 'desktop'));

// Daily-rotating anonymous visitor hash (never stores IP or UA).
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
$salt = hash('sha256', gw_secret() . gmdate('Y-m-d'));
$vhash = substr(hash('sha256', $salt . $ip . $ua), 0, 16);

$db = gw_db();
$db->prepare('INSERT INTO events (ts,type,path,ref,target,label,utm_source,utm_medium,utm_campaign,demo,device,vhash)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
   ->execute([time(), $type, $path, $ref, $target, $label, $utm_s, $utm_m, $utm_c, $demo, $device, $vhash]);

// Occasionally prune old rows (cheap, keeps retention promise without cron).
if (random_int(1, 100) === 1) {
    $db->prepare('DELETE FROM events WHERE ts < ?')->execute([time() - GW_RETENTION_DAYS * 86400]);
}

http_response_code(204);
