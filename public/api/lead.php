<?php
/**
 * GroundWork lead intake. Receives the /start/ and /audit/ forms (JSON POST),
 * stores them in the private SQLite DB above the web root, and emails you.
 *
 * This is data the visitor chose to send us (see /privacy/ "Forms you send us").
 * Nothing here is tracking; it is the form itself.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

header('Cache-Control: no-store');
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$raw = file_get_contents('php://input', false, null, 0, 16384);
$in = json_decode((string)$raw, true);
if (!is_array($in)) { http_response_code(400); echo '{"ok":false}'; exit; }

// Honeypot: real users never fill this field.
if (!empty($in['company_url'])) { echo '{"ok":true}'; exit; }

$form = in_array($in['form'] ?? $in['page'] ?? '', ['start', '/start/'], true) ? 'start' : 'audit';
$f = fn(string $k, int $max) => gw_trim((string)($in[$k] ?? ''), $max);

$lead = [
    'ts'          => time(),
    'form'        => $form,
    'shop'        => $f('shop', 100),
    'city'        => $f('city', 100),
    'name'        => $f('name', 100),
    'email'       => filter_var($f('email', 200), FILTER_VALIDATE_EMAIL) ?: '',
    'phone'       => $f('phone', 40),
    'type'        => $f('type', 20),
    'links'       => $f('links', 300),
    'plan'        => in_array($in['plan'] ?? '', ['grow', 'host'], true) ? $in['plan'] : '',
    'demo'        => $f('demo', 30),
    'times'       => $f('times', 200),
    'notes'       => $f('notes', 2000),
    'attribution' => $f('attribution', 500),
];

if ($lead['email'] === '' && $lead['phone'] === '') { http_response_code(422); echo '{"ok":false,"error":"contact"}'; exit; }

$db = gw_db();
$db->exec('CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, form TEXT NOT NULL,
    shop TEXT, city TEXT, name TEXT, email TEXT, phone TEXT, type TEXT, links TEXT,
    plan TEXT, demo TEXT, times TEXT, notes TEXT, attribution TEXT
)');
$cols = array_keys($lead);
$db->prepare('INSERT INTO leads (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
   ->execute(array_values($lead));

// Email it to you (cPanel's PHP mail() works out of the box for the site's own domain)
if (defined('GW_LEAD_EMAIL') && GW_LEAD_EMAIL !== '') {
    $subject = sprintf('[GroundWork] %s — %s%s', $form === 'start' ? 'NEW BUILD ($99 today)' : 'Audit request',
        $lead['shop'] ?: $lead['name'], $lead['plan'] ? ' · ' . strtoupper($lead['plan']) : '');
    $body = '';
    foreach ($lead as $k => $v) { if ($k !== 'ts' && $v !== '') $body .= str_pad($k, 12) . ': ' . $v . "\n"; }
    $body .= "\n" . ($form === 'start'
        ? "They were sent to Stripe checkout next. Match this to the payment by shop name (client_reference_id)."
        : "They were shown the confirmation page. Reply within one business day.");
    $host = gw_own_host() ?: 'localhost';
    $headers = "From: GroundWork <no-reply@$host>\r\n" . ($lead['email'] ? "Reply-To: {$lead['email']}\r\n" : '') . "Content-Type: text/plain; charset=UTF-8\r\n";
    @mail(GW_LEAD_EMAIL, $subject, $body, $headers);
}

echo '{"ok":true}';
