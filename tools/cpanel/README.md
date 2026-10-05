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

## Run order
1. **Run workflow** with "dry run" ticked (the default). The log lists every top-level item in public_html as
   REPLACE, OVERWRITE, OVERLAY, ADD or KEEP. Nothing on the server changes.
2. Run again with "dry run" unticked to go live.

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

## Demos become /work/

The build moves every demo from /demos/<x>/ to /work/<x>/ (`tools/build-work.mjs`) and 301s the old addresses. Only demos marked `"grade": "A+"` in hub/data.json are indexed, with a self canonical and a sitemap entry; the rest stay noindex. Each demo's business schema is replaced by a CreativeWork page and breadcrumb, its notice bar reads "Sample design for a fictional business", and it ends with a short case study linking its trade's subdomain. /work/ lists the indexed demos by trade. The GitHub Pages copies are not changed and stay noindex.

## Rolling back
Every real run first saves `~/site-backups/public_html-YYYYMMDD-HHMMSS.tar.gz` (the last 10 are kept). To restore one, in
cPanel **Terminal**:

    cd ~ && rm -rf public_html && tar -xzf site-backups/public_html-YYYYMMDD-HHMMSS.tar.gz
