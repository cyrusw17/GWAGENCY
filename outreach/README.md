# Outreach engine: personalized first line + free mockup site per prospect

Turns the lead list into rows ready for the sending tool, each with a first line built from checked facts and a free mockup of the shop's future website ("mockup" is the free page before payment; the paid private "preview" comes after the $99). No dependencies, no model calls, no paid APIs.

```
MOCKUP_SALT=<secret> node outreach/run.mjs \
  --in /mnt/project-files/leads/<file>.csv \
  --out /mnt/project-files/personalization/runs/<date> \
  --pipeline /mnt/project-files/sales/pipeline.csv \
  --suppress /mnt/project-files/personalization/suppress.txt \
  --check-sites --send-date <first send day> [--mockup-base https://<approved mockup host>/]
node --test outreach/test/*.test.mjs
```

`--out` must be outside this repo (the script refuses otherwise). Prospect data is never committed.

## Gates (a prospect must pass all four)

Niches: `auto-detailing`, `exterior-cleaning`, `landscaping-lawn-care` (a `niche` column per row, or `--niche`). Each has `niches/<niche>.json` (qualifying rules, flaws checked, mockup content) and a block in `copy/first-lines.json` (wording). A niche without a segment in the copy file isn't emailed in it (exterior cleaning and landscaping email has-site shops only).

1. **Qualify** (`lib/qualify.mjs`): verified email only, the niche's minimum reviews, 4.5+ stars, data under 14 days old, niche category, no chains, no duplicates. Drops every shop in the sales pipeline that isn't `new` (do-not-contact, or already in a sequence) and anything on the suppression list.
2. **Site check** (`lib/sitecheck.mjs`, has-site shops only): reads the homepage plus up to 4 linked services, booking, quote, gallery or reviews pages. Flaws: no booking, no prices, no quote form, fewer than 3 photos, no reviews, no tap-to-call, fewer than 2 services named, slow on mobile (with `PSI_API_KEY`). Each niche checks its own list in its own order. A flaw is only claimed when we looked and didn't find it; a load error or a JavaScript-only page drops the prospect. An old copyright year is exported as `old_copyright`, only as a supporting detail.
3. **First line** (`lib/lines.mjs`): wording comes from `copy/first-lines.json` (owned by the cold email specialist). The engine only fills variables with checked facts; QA rejects unfilled variables, banned words, over 240 characters, or any number that isn't the shop's rating or review count. "New review this week" is only used when it's true on `--send-date` and the data was fetched at most 2 days before it.
4. **Mockup** (`lib/mockup.mjs`): fills the funnel template with the shop's real name, phone, city, rating and up to 3 of its real Google reviews; everything else is labeled as a sample. Always `noindex`, never shows invented reviews or claims (insured, warranty, guarantee). QA checks name, phone, noindex and leftover template text.

## Output (in `--out`)

| File | What |
|---|---|
| `approved.csv` | Ready to import: email, first_name, company_name, personalization, mockup_url, plus niche, niche_plural, city, rating, review_count, service, flaw / flaw_line, old_copyright, segment, line_variant, send_date |
| `rejected.csv` | Every dropped prospect with its reasons |
| `mockups/<shop>-<hash>/` | Static mockup site; upload the folder to the mockup host |
| `report.md`, `review.html` | Cost per prospect, rejection reasons, and a 10% (min 20) sample for a person to check before loading |

Mockups hold Google Places data, which we may keep only 30 days: each row has `mockup_expires`, and by then the mockup must be taken down or rebuilt from a fresh export.

Mockup links are `--mockup-base` + `<shop>-<hash>/`; the hash comes from `MOCKUP_SALT` and the place ID, so links are stable but can't be guessed. With no `--mockup-base` (no host approved yet) `mockup_url` is empty and copy must not link to mockups. Team lead decision: host mockups on one of the secondary cold email domains, never on groundwork-web.com.
