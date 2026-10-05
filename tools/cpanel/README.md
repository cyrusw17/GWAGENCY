# Going live on cPanel

groundwork-web.com is served from Cyrus's cPanel host. Deploys run from GitHub Actions
(**Actions > Deploy to cPanel > Run workflow**), never by hand and never from offer1.

## One-time setup (Cyrus)
1. In cPanel: **Security > Manage API Tokens > Create**. Name it `github-deploy`, set an expiry date. Revoke it there any time.
2. In GitHub, cyrusw17/GWAGENCY: **Settings > Secrets and variables > Actions > New repository secret**, add:
   - `CPANEL_HOST`: the server name cPanel shows (the host in your cPanel login URL, without `:2083`)
   - `CPANEL_USER`: your cPanel username
   - `CPANEL_TOKEN`: the token from step 1
3. Make sure **SSL/TLS Status > Run AutoSSL** is on so the subdomains get certificates.

## What a deploy does
1. `tools/build-cpanel.mjs` copies `public/` to `_cpanel/site/` and moves each niche selling page to its subdomain
   (detailing., exterior., landscaping., commercial., realestate.groundwork-web.com): canonicals, sitemap and links change,
   and `.htaccess` gets the host rules. The old paths (groundwork-web.com/auto-detailing/) 301 to the subdomains.
2. The result is committed to the `cpanel` branch.
3. `tools/cpanel/publish.sh` calls the cPanel API: adds the subdomains (sharing public_html), clones the repo once
   into `~/repositories/gwagency-live`, pulls the `cpanel` branch and runs `.cpanel.yml`.
4. On the server, `deploy.sh` saves `~/site-backups/public_html-<time>.tar.gz` (last 10 kept), then copies the site in
   the same way offer1's deploy did. Folders the site owns are replaced whole, and `api/` is overlaid so `api/config.php` survives.
   Anything else in public_html is never deleted, including the private list folder, `.well-known` and `cgi-bin`.

## Rolling back
cPanel File Manager: extract the newest `~/site-backups/public_html-*.tar.gz` over your home folder.
