# Analytics: opt-in tracking and the private dashboard

## What we use and why
Our own first-party tracker, already part of the site: `public/assets/js/analytics.js` in the browser,
`public/api/track.php` to collect, `public/api/stats.php` as the dashboard, SQLite above the web root.
- $0 and no new account. It runs on the cPanel host the site deploys to (docs/cpanel-deploy.md).
- No third party sees visitor data, so the privacy policy has no processors to list.
- Covers every page on every subdomain, including the niche blogs, with one consent choice.

GoatCounter, Umami Cloud and Cloudflare Web Analytics would each need a signup by Cyrus and would
still need this banner for click and form events, so they add an account without adding data.
On GitHub Pages `/api/` is stubbed, so the preview copies record nothing.

## Consent (legal basis)
- Nothing is sent and no tracking cookie is set until the visitor taps **Allow** on the banner.
  "No thanks" has the same size and weight as "Allow" (GDPR/ePrivacy opt-in, no dark patterns).
- Global Privacy Control or Do Not Track counts as "No thanks": no banner, nothing recorded (CCPA/CPRA GPC rule).
- `track.php` also refuses any event without the `gw_consent=1` cookie, so the server enforces it too.
- Any element with `data-cookie-settings` reopens the banner (the privacy page has one). Choosing
  "No thanks" later deletes `gw_vid` and `gw_sid`.
- Policy: `/privacy/#cookies` lists every cookie.

| Cookie | Set when | Lasts | Purpose |
|---|---|---|---|
| gw_consent | Either answer | 6 months | Remembers the answer (essential) |
| gw_vid | After Allow | 6 months from last visit | Random visitor id: new vs returning |
| gw_sid | After Allow | 30 idle minutes | Random visit id: visits, landing page, source |
| gw_admin | Owner signs in to the dashboard | 30 days, `/api/` only, HttpOnly | Dashboard sign-in |

Visitor cookies use `domain=.groundwork-web.com`, so one answer covers the selling subdomains.

## What gets recorded (after Allow)
Page views (host and path, no query string), every link click (target and link text), form submits after
delivery (form name only), the interaction labels whitelisted in `track.php`
(`plan_host`, `plan_grow`, `compare_use`, `demo_package`, `demo_book`, `price_seen`), referrer domain,
UTM source/medium/campaign, `?demo=`, and screen class. Never IP, user agent or anything typed.
Rows are deleted after `GW_RETENTION_DAYS` (400).

## The dashboard
`https://groundwork-web.com/api/stats.php`. Sign in with `GW_STATS_KEY` from `api/config.php`
(never committed). It shows visitors (new and returning), visits, views, clicks, CTA clicks, forms sent,
visits per day, leads, channels (Email, Search, AI assistants, Social, Referral, Direct), referring
sites, UTM campaigns, views by part of the site (agency, niche pages, blogs, demos) and by subdomain,
the funnel, CTA clicks, landing pages, every page, every link clicked, interactions and devices.
Leads are complete whatever the visitor chose; traffic numbers count only opted-in visitors.

## Tag cold-email links
`?utm_source=email&utm_medium=email&utm_campaign=<sequence>` so visits land in the Email channel.
