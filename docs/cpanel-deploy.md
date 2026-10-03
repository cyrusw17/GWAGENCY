# Deploy groundwork-web.com on cPanel

**Account:** `grouevbi` · **Web root:** `/home/grouevbi/public_html/` · **Git source:** `/home/grouevbi/repositories/offer1/`

## Each release

1. `git push origin main` (from this repo)
2. cPanel → **Git Version Control** → offer1 → **Update from Remote** — wait for it to finish
3. **Deploy HEAD Commit**

## First deploy of the new site — checklist

- [ ] **PHP version ≥ 8.1** — cPanel → *MultiPHP Manager* → groundwork-web.com. `pdo_sqlite` is on by default.
- [ ] Deploy (steps above). The script deletes the old Launch Partner files (`index.php`, `css/`, `js/`, `images/`, `~/config`, `~/lib`, `~/includes`) and copies the new site.
- [ ] Open https://groundwork-web.com — new site, HTTPS, no `www.`
- [ ] `https://groundwork-web.com/api/config.php` → **403**; `/api/stats.php` without key → **403**
- [ ] Get your dashboard key: File Manager → `public_html/api/config.php` (show hidden files not needed) → copy `GW_STATS_KEY`. Dashboard: `https://groundwork-web.com/api/stats.php?key=THE_KEY` — bookmark privately.
- [ ] Submit the `/audit/` fallback form or `/start/` form with test data → row appears in dashboard **Leads**, email arrives at groundworkweb@proton.me. If no email: cPanel → *Email Deliverability* → fix SPF/DKIM for the domain.
- [ ] **Stripe** → Payment Link → After payment → redirect to `https://groundwork-web.com/thanks/?from=start`
- [ ] **Google Search Console** → add property → submit `https://groundwork-web.com/sitemap.xml`
- [ ] Old leads from the Launch Partner page are still in `~/storage/leads.sqlite` — export before deleting that folder, if you want them.

## If Deploy HEAD Commit hangs

cPanel needs a clean working tree in `~/repositories/offer1/`. Terminal (if your plan has it):

```bash
cd ~/repositories/offer1 && git fetch origin && git reset --hard origin/main && git clean -fd
```

Then Update from Remote → Deploy HEAD Commit. Logs: `~/.cpanel/logs/vc_*_git_deploy.log`. Still stuck → Namecheap support, ask them to clear stuck Version Control tasks for `grouevbi`.

## Manual fallback

File Manager / FTP: upload contents of `public/` into `public_html/`. Create `public_html/api/config.php` from `config.sample.php` with a random `GW_STATS_KEY` and `GW_LEAD_EMAIL`. Create `~/gw-data/` (755).

## Never delete on the server

- `public_html/api/config.php` — dashboard key
- `~/gw-data/` — analytics + leads database
