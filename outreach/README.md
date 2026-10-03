# Outreach engine: personalized first line + free preview site per prospect

Turns the lead list into rows ready for the sending tool, each with a first line built from checked facts and a private preview site of the shop's future website. No dependencies, no model calls, no paid APIs.

```
PREVIEW_SALT=<secret> node outreach/run.mjs \
  --in /mnt/project-files/leads/<file>.csv \
  --out /mnt/project-files/personalization/runs/<date> \
  --suppress /mnt/project-files/personalization/suppress.txt --check-sites
node --test outreach/test/*.test.mjs
```

`--out` must be outside this repo (the script refuses otherwise). Prospect data is never committed.

## Gates (a prospect must pass all four)

1. **Qualify** (`lib/qualify.mjs`): verified email only, 15+ reviews, 4.5+ stars, data under 14 days old, detailer category, no chains, no duplicates, not on the suppression list.
2. **Site check** (`lib/sitecheck.mjs`, has-site shops only): reads the homepage plus up to 3 linked service/booking pages. A flaw (no booking, no prices, slow on mobile with `PSI_API_KEY`) is only claimed when seen; any load error drops the prospect.
3. **First line** (`lib/lines.mjs`): wording comes from `copy/first-lines.json` (owned by the cold email specialist). The engine only fills variables with checked facts; QA rejects unfilled variables, banned words, over 240 characters, or any number that isn't the shop's rating or review count.
4. **Preview** (`lib/preview.mjs`): fills the funnel template with the shop's real name, phone, city, rating and up to 3 of its real Google reviews; everything else is labeled as a sample. Always `noindex`, never shows invented reviews or claims (insured, warranty, guarantee). QA checks name, phone, noindex and leftover template text.

## Output (in `--out`)

| File | What |
|---|---|
| `approved.csv` | Ready to import: email, first_name, company_name, personalization, preview_url, plus city, rating, review_count, service, flaw, segment, line_variant |
| `rejected.csv` | Every dropped prospect with its reasons |
| `previews/<shop>-<hash>/` | Static preview site; upload the folder to the preview host |
| `report.md`, `review.html` | Cost per prospect, rejection reasons, and a 10% (min 20) sample for a person to check before loading |

Preview links are `--preview-base` + `<shop>-<hash>/`; the hash comes from `PREVIEW_SALT` and the place ID, so links are stable but can't be guessed.
