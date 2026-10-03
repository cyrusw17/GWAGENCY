<?php
/**
 * Copy to config.php (git-ignored) and fill in.
 *
 * On cPanel: File Manager → public_html/api/ → create config.php.
 */

// Long random string. Unlocks the dashboard at /api/stats.php?key=...
// Generate one: openssl rand -hex 24
define('GW_STATS_KEY', '');

// Where /api/lead.php emails new start/audit submissions. Leads are always
// stored in the DB (visible on the dashboard) even if this is empty.
define('GW_LEAD_EMAIL', 'groundworkweb@proton.me');

// Optional. Where the SQLite database lives. Default is one folder ABOVE the
// web root (…/gw-data), which is correct for cPanel when the site is in public_html.
// define('GW_DATA_DIR', '/home/YOUR_CPANEL_USER/gw-data');

// Optional. Days of analytics to keep. Default 400 (~13 months).
// define('GW_RETENTION_DAYS', 400);

// Optional. Fixed secret for the daily visitor hash. If unset, one is generated
// and stored in GW_DATA_DIR/secret.txt.
// define('GW_HASH_SECRET', '');

// Client sites built from the Funnel Template that report to /api/sites.php.
// Only these slugs are accepted, only from their own origins. Lead emails go to "email" and GW_LEAD_EMAIL.
// define('GW_CLIENT_SITES', [
//     'harbor-line' => ['name' => 'Harbor Line Mobile Detail', 'email' => 'owner@example.com',
//                       'origins' => ['https://harborlinedetail.com', 'https://www.harborlinedetail.com']],
// ]);
