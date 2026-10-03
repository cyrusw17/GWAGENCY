<?php
/**
 * Client-site collector. One endpoint for every site built from the GroundWork Funnel Template.
 *
 *   POST /api/sites.php?a=event   conversion counts: pageview, call, text, book, lead (no personal data)
 *   POST /api/sites.php?a=lead    the quote form: stored here, emailed to the client and to us
 *
 * Only slugs listed in GW_CLIENT_SITES (config.php, never in git) are accepted, and only from
 * that site's own origins. Bodies are read as text so browsers send them without a CORS preflight.
 * Same privacy rules as track.php: no cookies, no IP or user agent stored, GPC/DNT honored.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

header('Cache-Control: no-store');
if (!defined('GW_CLIENT_SITES')) define('GW_CLIENT_SITES', []);

$raw = file_get_contents('php://input', false, null, 0, 8192);
$in = json_decode((string)$raw, true);
$slug = is_array($in) ? (string)($in['site'] ?? '') : '';
$site = GW_CLIENT_SITES[$slug] ?? null;

// CORS: echo the origin back only when it belongs to this site.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = $site && in_array($origin, (array)($site['origins'] ?? []), true);
if ($allowed) { header("Access-Control-Allow-Origin: $origin"); header('Vary: Origin'); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
if (!$site || ($origin !== '' && !$allowed)) { http_response_code(403); exit; }

$db = gw_db();
$db->exec('CREATE TABLE IF NOT EXISTS site_events (
    id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, site TEXT NOT NULL, type TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT "", path TEXT NOT NULL DEFAULT "", device TEXT NOT NULL DEFAULT "", vhash TEXT NOT NULL
)');
$db->exec('CREATE INDEX IF NOT EXISTS ix_site_events ON site_events(site, ts)');

$w = (int)($in['w'] ?? 0);
$device = $w <= 0 ? '' : ($w < 700 ? 'mobile' : ($w < 1100 ? 'tablet' : 'desktop'));
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$vhash = substr(hash('sha256', hash('sha256', gw_secret() . gmdate('Y-m-d')) . $ip . ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 16);
$event = fn(string $type, string $label) => $db->prepare('INSERT INTO site_events (ts,site,type,label,path,device,vhash) VALUES (?,?,?,?,?,?,?)')
    ->execute([time(), $slug, $type, gw_trim($label, 60), gw_clean_path((string)($in['path'] ?? '/')), $device, $vhash]);

$action = $_GET['a'] ?? '';

if ($action === 'event') {
    if (($_SERVER['HTTP_SEC_GPC'] ?? '') === '1' || ($_SERVER['HTTP_DNT'] ?? '') === '1') { http_response_code(204); exit; }
    $type = (string)($in['type'] ?? '');
    if (!in_array($type, ['pageview', 'call', 'text', 'book'], true)) { http_response_code(400); exit; }
    $event($type, (string)($in['label'] ?? ''));
    http_response_code(204);
    exit;
}

if ($action === 'lead') {
    header('Content-Type: application/json');
    if (!empty($in['company_url'])) { echo '{"ok":true}'; exit; } // honeypot
    $f = fn(string $k, int $max) => gw_trim((string)($in[$k] ?? ''), $max);
    $lead = ['name' => $f('name', 100), 'phone' => $f('phone', 40), 'service' => $f('service', 100), 'zip' => $f('zip', 10), 'notes' => $f('notes', 1000)];
    // Phone or email: forms that ask for either one (funnel checklist item 7). Email rides in notes.
    $email = $f('email', 120);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
    if ($lead['name'] === '' || ($lead['phone'] === '' && $email === '')) { http_response_code(422); echo '{"ok":false}'; exit; }
    if ($email !== '') $lead['notes'] = gw_trim("Email: $email\n" . $lead['notes'], 1000);

    $db->exec('CREATE TABLE IF NOT EXISTS site_leads (
        id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, site TEXT NOT NULL,
        name TEXT, phone TEXT, service TEXT, zip TEXT, notes TEXT
    )');
    $db->prepare('INSERT INTO site_leads (ts,site,name,phone,service,zip,notes) VALUES (?,?,?,?,?,?,?)')
       ->execute([time(), $slug, ...array_values($lead)]);
    $event('lead', $lead['service']); // counted even under GPC: the visitor chose to send this form

    $body = '';
    foreach ($lead as $k => $v) if ($v !== '') $body .= str_pad(ucfirst($k), 9) . ': ' . $v . "\n";
    $body .= $lead['phone'] !== '' ? "\nReply fast: text them back at the number above.\n" : "\nReply fast: they left an email, no phone.\n";
    $host = gw_own_host() ?: 'localhost';
    $headers = "From: " . ($site['name'] ?? 'Website') . " website <no-reply@$host>\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    $to = array_filter([(string)($site['email'] ?? ''), GW_LEAD_EMAIL]);
    @mail(implode(',', $to), 'New quote request: ' . ($lead['service'] ?: 'website') . ' - ' . $lead['name'], $body, $headers);
    echo '{"ok":true}';
    exit;
}

http_response_code(400);
