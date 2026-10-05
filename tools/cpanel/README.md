# Going live on cPanel

groundwork-web.com is served from Cyrus's cPanel host. Every page lives in a folder on the one domain,
with no subdomains:

| Page | Address |
|---|---|
| Agency home | groundwork-web.com/ |
| Auto detailing offer and blog | groundwork-web.com/auto-detailing/ and /auto-detailing/blog/ |
| Exterior cleaning offer and blog | groundwork-web.com/exterior-cleaning/ and /exterior-cleaning/blog/ |
| Landscaping offer and blog | groundwork-web.com/landscaping/ and /landscaping/blog/ |
| Commercial cleaning offer and blog | groundwork-web.com/commercial-cleaning/ and /commercial-cleaning/blog/ |
| Real estate agents offer and blog | groundwork-web.com/real-estate/ and /real-estate/blog/ |
| Sample sites | groundwork-web.com/work/ |

Never deploy from offer1.

## How it deploys (the gwweb repo)
1. `node tools/build-cpanel.mjs` copies `public/` to `_cpanel/site/`, turns the demos into the /work/ portfolio,
   and adds the /demos/ to /work/ redirect to `.htaccess`.
2. The contents of `_cpanel/` (site/, .cpanel.yml, deploy.sh) are committed to the main branch of
   [cyrusw17/gwweb](https://github.com/cyrusw17/gwweb).
3. In cPanel **Git Version Control**, the gwweb clone gets **Update from Remote**, then **Deploy HEAD Commit**.
   That runs `.cpanel.yml`, which runs `deploy.sh`.
4. `deploy.sh` saves `~/site-backups/public_html-<time>.tar.gz` (last 10 kept), then replaces the folders the site owns
   and overlays `api/` so `api/config.php` survives. Anything else in public_html is never deleted, including the
   private list folder, `.well-known` and `cgi-bin`.

The GitHub Actions workflow (**Actions > Deploy to cPanel**) does the same through the cPanel API if the repo secrets
`CPANEL_HOST`, `CPANEL_USER` and `CPANEL_TOKEN` are ever added. Run it with "dry run" ticked first.

## Demos become /work/
The build moves every demo from /demos/<x>/ to /work/<x>/ (`tools/build-work.mjs`) and 301s the old addresses. Only demos marked `"grade": "A+"` in hub/data.json are indexed, with a self canonical and a sitemap entry; the rest stay noindex. Each demo's business schema is replaced by a CreativeWork page and breadcrumb, its notice bar reads "Sample design for a fictional business", and it ends with a short case study linking its trade's selling page. /work/ lists the indexed demos by trade. The GitHub Pages copies are not changed and stay noindex.

## Rolling back
Every deploy first saves `~/site-backups/public_html-YYYYMMDD-HHMMSS.tar.gz`. To restore one, in cPanel **Terminal**:

    cd ~ && rm -rf public_html && tar -xzf site-backups/public_html-YYYYMMDD-HHMMSS.tar.gz
