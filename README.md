# offer1 — groundwork-web.com production deploy

This repo is the **cPanel deploy mirror** for [groundwork-web.com](https://groundwork-web.com). Everything under `public/` becomes `~/public_html/` on the server.

Source of truth is the [GroundWork-Web](https://github.com/cyrusw17/GroundWork-Web) repo (`site/` folder). Edit there, then sync here:

```bash
rsync -a --delete --exclude .DS_Store --exclude 'api/config.php' \
  /Users/cyrus/Desktop/remod/site/  /path/to/offer1/public/
cd /path/to/offer1 && git add -A && git commit -m "Deploy: <what changed>" && git push origin main
```

Then in cPanel → **Git Version Control → offer1**: **Update from Remote**, wait, **Deploy HEAD Commit**.

## What's here

| Path | Purpose |
|------|---------|
| `public/` | Static HTML/CSS/JS site + `api/` (PHP: analytics collector, lead intake, dashboard) |
| `public/.htaccess` | HTTPS + no-www redirect, security headers, compression, caching |
| `.cpanel.yml` | Deploy tasks: clears old app, copies `public/`, creates `api/config.php` once, makes `~/gw-data/` |

## Server layout after deploy

```
/home/grouevbi/
├── public_html/            ← the site (from public/)
│   └── api/config.php      ← created on first deploy, never overwritten (dashboard key, lead email)
├── gw-data/                ← analytics.sqlite + secret.txt (auto-created, outside web root)
└── repositories/offer1/    ← git source (cPanel manages)
```

Full checklist: `docs/cpanel-deploy.md`.
