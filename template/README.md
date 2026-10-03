# GroundWork Funnel Template

One page, built for a phone, that turns a local search into a call or a booking. Works for any local service business (detailers, cleaners, lawn care, trades). Content lives in `clients/<slug>/site.json`; the template never changes per client.

## Make a site

1. `cp -r clients/_example clients/<slug>` and edit `site.json`.
2. Put real job photos in `clients/<slug>/img/` and point `hero.image`, `work.compare.before/after` and `work.gallery[].image` at `img/...`.
3. Set colors in `theme` (keep `accent` for buttons only so the next step is always obvious).
4. `node tools/build.mjs clients/<slug>` and open `dist/<slug>/index.html`.
5. Upload the folder to the client's host. It is plain static files.

Set `"demo": true` for sales demos: it adds the GroundWork bar, `noindex`, and labels sample reviews and images. To put a demo on groundwork-web.com: `node tools/build.mjs clients/<slug> --out public/demos/<slug>`.

## The funnel, top to bottom

| Section | Job |
|---------|-----|
| Offer bar (optional) | One time-bound reason to act now. |
| Header | Tap-to-call and Book always visible; sticky. |
| Hero | Rating pill (from `reviews`), outcome headline, the area, one primary CTA, call as second. Proof numbers under it. |
| Trust strip | Insured, prices shown, guarantee: kill the top fears early. |
| Services | What they do, each with a "from" price. |
| Pricing | 3 packages, middle one highlighted. Add `member` prices to get a One-time / Member toggle (sells the client's recurring plan). Each button pre-selects that package in the form. |
| How it works | 3 steps, to make booking feel small. |
| Our work | Before/after slider + gallery of real jobs. |
| Reviews | Real reviews only, linked to the Google profile. Swipeable row on phones, grid on desktop. |
| Guarantee | Risk reversal with a CTA. |
| Service area | City list + map, so out-of-area visitors don't waste a lead. |
| Book | Booking embed (Square, Booksy, Calendly, Google) or a 4-field quote form. Call/text option next to it. |
| FAQ | Objections answered; also marked up as FAQPage for search and AI answers. |
| Final CTA, footer | Last chance + consistent name/phone/area for local SEO. |
| Sticky bar (phones) | Call + Book under the thumb on every scroll position. |

## Design references

Layout patterns are adapted from [21st.dev](https://21st.dev) (rating badge over the headline, gradient emphasis text, swipeable testimonial row, pricing toggle), rebuilt as plain HTML/CSS so pages stay fast with no framework. CSS is inlined into each page; the only other file is the 4KB `funnel.js`.

## Leads

`lead.endpoint` gets a JSON POST (`name, phone, service, zip, notes, site, page`). Formspree, Getform or our own `api/lead.php`-style endpoint all work. If no endpoint is set, or sending fails, the form opens a pre-filled text message to the business so a lead is never lost. Or set `booking.embedUrl` to show the client's booking tool instead of the form.

## Results tracking (for the monthly results text and the 60-day guarantee)

Set `"tracking": "groundwork"` in site.json. The page then reports visits, call taps, text taps, booking clicks and quote requests to `groundwork-web.com/api/sites.php`, and quote requests are emailed to the client and to us. Add the site to `GW_CLIENT_SITES` in the server's `api/config.php` (slug, owner email, the site's origins); unknown sites and other origins are refused. Read results at `/api/site-report.php?key=<GW_STATS_KEY>&site=<slug>&days=60`. Lead details stay in the database above the web root, never in git. No cookies; GPC and Do Not Track are honored for counts.

## SEO and AI search, built in

LocalBusiness JSON-LD (set `business.schemaType`, e.g. `AutoWash`, `HousePainter`, `Plumber`), FAQPage, WebPage with date and publisher, `robots.txt` that welcomes AI crawlers, `sitemap.xml`, `llms.txt`, and a Markdown copy (`index.md`). The non-demo sample scores 90% on the AEOTester audit before any client-specific content.

## Rules the build enforces on real sites

The build fails (exit 1) when a non-demo site has: a 555 phone, no live URL, reviews without a source link or without `"verified": true` on each one, or no way to receive leads. This follows the FTC review rule and our no-go list: never ship invented reviews, and never show a demo as a real client.

No cookies, no tracking unless `analytics.endpoint` is set; even then Global Privacy Control and Do Not Track are respected.
