<?php
/** Shared helpers for the GroundWork analytics endpoints. */
declare(strict_types=1);

// Optional overrides live in config.php (git-ignored). See config.sample.php.
if (is_file(__DIR__ . '/config.php')) require __DIR__ . '/config.php';

// Data directory: one level ABOVE the web root so the database is never
// downloadable. Locally that's the repo root; on cPanel it's above public_html.
if (!defined('GW_DATA_DIR')) define('GW_DATA_DIR', dirname(__DIR__, 2) . '/gw-data');
if (!defined('GW_RETENTION_DAYS')) define('GW_RETENTION_DAYS', 400);   // ~13 months
if (!defined('GW_STATS_KEY')) define('GW_STATS_KEY', '');               // set in config.php to unlock /api/stats.php
if (!defined('GW_LEAD_EMAIL')) define('GW_LEAD_EMAIL', 'groundworkweb@proton.me');

function gw_db(): PDO {
    static $db = null;
    if ($db) return $db;
    if (!is_dir(GW_DATA_DIR)) mkdir(GW_DATA_DIR, 0750, true);
    $db = new PDO('sqlite:' . GW_DATA_DIR . '/analytics.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        ref TEXT NOT NULL DEFAULT "",
        target TEXT NOT NULL DEFAULT "",
        label TEXT NOT NULL DEFAULT "",
        utm_source TEXT NOT NULL DEFAULT "",
        utm_medium TEXT NOT NULL DEFAULT "",
        utm_campaign TEXT NOT NULL DEFAULT "",
        demo TEXT NOT NULL DEFAULT "",
        device TEXT NOT NULL DEFAULT "",
        vhash TEXT NOT NULL
    )');
    // Columns added with opt-in analytics (2026-10). vhash now holds the consented visitor id.
    $cols = array_column($db->query('PRAGMA table_info(events)')->fetchAll(), 'name');
    foreach (['host' => 'TEXT NOT NULL DEFAULT ""', 'sid' => 'TEXT NOT NULL DEFAULT ""', 'entry' => 'INTEGER NOT NULL DEFAULT 0'] as $c => $def) {
        if (!in_array($c, $cols, true)) $db->exec("ALTER TABLE events ADD COLUMN $c $def");
    }
    $db->exec('CREATE INDEX IF NOT EXISTS ix_events_ts ON events(ts)');
    $db->exec('CREATE INDEX IF NOT EXISTS ix_events_sid ON events(sid)');
    $db->exec('CREATE INDEX IF NOT EXISTS ix_events_type_ts ON events(type, ts)');
    return $db;
}

/** Secret used to salt the daily visitor hash. Generated once, stored outside web root. */
function gw_secret(): string {
    if (defined('GW_HASH_SECRET') && GW_HASH_SECRET !== '') return GW_HASH_SECRET;
    $f = GW_DATA_DIR . '/secret.txt';
    if (!is_dir(GW_DATA_DIR)) mkdir(GW_DATA_DIR, 0750, true);
    if (!is_file($f)) { file_put_contents($f, bin2hex(random_bytes(32))); chmod($f, 0600); }
    return (string)file_get_contents($f);
}

function gw_trim(string $s, int $max): string {
    $s = trim(preg_replace('/\s+/', ' ', strip_tags($s)) ?? '');
    return mb_substr($s, 0, $max);
}

/** Path only — strips query string and fragment so no personal data rides along. */
function gw_clean_path(string $p): string {
    $p = parse_url($p, PHP_URL_PATH) ?: '/';
    if ($p[0] !== '/') $p = '/' . $p;
    return mb_substr($p, 0, 200);
}

/** This site's host, lowercased, without port. */
function gw_own_host(): string {
    $h = strtolower($_SERVER['HTTP_HOST'] ?? '');
    return preg_replace('/:\d+$/', '', $h) ?? $h;
}

function gw_host_only(string $url): string {
    $h = strtolower((string)(parse_url($url, PHP_URL_HOST) ?? ''));
    return preg_replace('/^www\./', '', $h) ?? '';
}

/** Click targets: internal links keep their path; external keep scheme+host+path. Query strings dropped. */
function gw_clean_target(string $url): string {
    if ($url === '') return '';
    if (str_starts_with($url, '#')) return $url;                      // in-page anchors like #book
    if (preg_match('/^(tel|sms|mailto):/i', $url)) return strtolower(explode(':', $url, 2)[0]) . ':';
    $u = parse_url($url);
    if (!$u) return '';
    $host = strtolower($u['host'] ?? '');
    $path = $u['path'] ?? '/';
    $frag = isset($u['fragment']) ? '#' . $u['fragment'] : '';
    $own = gw_own_host();
    if ($host === '' || $host === $own || $host === 'www.' . $own || 'www.' . $host === $own) return mb_substr($path . $frag, 0, 200);
    return mb_substr(($u['scheme'] ?? 'https') . '://' . $host . $path, 0, 200);
}
