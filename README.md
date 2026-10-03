# GWAGENCY: GroundWork agency repo

Home for groundwork-web.com and the client sites we build.

| Path | What it is |
|------|------------|
| `public/` | groundwork-web.com, ported as-is from cyrusw17/offer1 (fca2a33). Includes the Detailer Kit (`public/kit/`) and its demos. The private cold-call list was left out on purpose because this repo is public. |
| `template/` | The GroundWork Funnel Template: mobile-first conversion site for any local service business. See `template/README.md`. |
| `clients/<slug>/site.json` | One file per client or niche demo. `clients/_example/` is a fictional detailer showing every option. |
| `hub/` | Public status page for GitHub Pages: the offer, the demo site and where things stand. `node tools/build-hub.mjs` builds it into `_site/`; see `hub/README.md`. |
| `tools/build.mjs` | `node tools/build.mjs clients/<slug>` builds a site into `dist/<slug>/`. No dependencies, Node 18+. |

The live site still deploys from cyrusw17/offer1 until cPanel is pointed here. Notes from that repo follow.

---

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
