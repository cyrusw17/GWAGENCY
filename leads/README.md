# Lead pipeline

Builds per-niche lead lists from public business listings: Google Places search, a polite crawl of each business's own website for published email addresses, verification, and CSV exports for the sequencer and the call list.

Python 3.10+, standard library only. Run from this folder.

## Contact data never goes in this repo

The repo is public. The pipeline writes only to `$LEADS_DATA_DIR` (default `~/gw-leads`, mode 700) and refuses any path inside a git checkout, for both the database and exports. `.gitignore` also blocks `*.db`, `*.csv` and `*.jsonl` here as a second guard.

## Setup

| Variable | Needed for | Notes |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | `search` | Enable Places API (New) and Geocoding API. Restrict the key to those two APIs and set a daily quota in Google Cloud. |
| `LEADPIPE_MONTHLY_CAP` | `search` | Optional. Paid search pages allowed per calendar month across all runs (default 900, inside the 1,000 free). |
| `REOON_API_KEY` or `MILLIONVERIFIER_API_KEY` | `verify` | Reoon power mode is the default provider. |
| `LEADS_DATA_DIR` | all | Optional. Must be outside any git checkout. |

The crawl reaches arbitrary business websites, so run it on a machine with open outbound HTTPS.

## Run

```sh
N=niches/auto-detailers.json
python3 -m leadpipe --niche $N search --area "Houston, TX" --max-requests 200   # billed Google requests, hard cap
python3 -m leadpipe --niche $N crawl --limit 500                                # websites found by search
python3 -m leadpipe --niche $N verify --max 300                                 # paid verifications, hard cap
python3 -m leadpipe --niche $N export email                                     # verified, one per shop
python3 -m leadpipe --niche $N export prospects --file /path/prospects.csv      # every shop, for personalization
python3 -m leadpipe --niche $N export calls --limit 100 --file /path/calls.csv --pipeline /path/pipeline.csv
python3 -m leadpipe --niche $N stats                                            # counts and this month's Google bill
python3 -m leadpipe --niche $N suppress optouts.txt --reason opt-out            # emails, domains or place IDs
python3 -m leadpipe --niche $N purge                                            # run daily, see below
```

Every step is resumable: finished search tiles, crawled domains and verified emails are skipped on the next run.

### Niche samples

Marketing's metric definitions (has website, social-only, findable, form-only, verifiable, catch-all or unknown, own-domain vs free, weak site) are built into `sample report`. A cheap sample searches each area once with one page per query:

```sh
python3 -m leadpipe --niche $N search --no-split --max-pages 1 --query "lawn care service" --query "landscaper" --max-requests 40
python3 -m leadpipe --niche $N sample pick -n 200     # spread evenly across areas, repeatable
python3 -m leadpipe --niche $N crawl --sample-only
python3 -m leadpipe --niche $N verify --sample-only --max 250
python3 -m leadpipe --niche $N sample report --lighthouse   # PageSpeed mobile score; PAGESPEED_API_KEY optional
```

Page 1 of a Google search favors prominent shops, so a one-page sample overstates websites and reviews a little.

## How each step works

**Search.** Text Search (New) returns at most 20 places per page and 60 per query. Each area's viewport is searched per query; a tile that comes back full is split into four and searched again, down to `min_tile_deg`. Phone, website and rating put each page in the Text Search Enterprise SKU (about $35 per 1,000 pages, first 1,000 a month free), so a page of 20 places costs about $0.035. `stats` tracks usage per month.

**Crawl.** For each website domain: robots.txt is honored, at most five pages are fetched (home, then contact, about, privacy, booking or quote links), one page per second per site, with an identifying user agent. Social and marketplace links (Facebook, Instagram, Yelp, Square sites and similar) are never crawled because their terms forbid automated collection; those shops land in the call list.

**What counts as an email.** Only addresses printed on the business's own pages: `mailto:` links, plain text, Cloudflare-protected addresses and `name [at] domain [dot] com` forms. The pipeline never guesses addresses from name patterns, and it drops every address from a site whose pages say it will not share or sell addresses or that refuse solicitation. Both are aggravated violations under CAN-SPAM (15 U.S.C. 7704(b)).

**Verify.** Results are normalized to `valid`, `catch_all`, `invalid` or `unknown`. Only `valid` is exported.

**Export.** One email per shop, preferring a personal address on the shop's own domain, then a free mailbox, then a role address (`info@`). Addresses on any other business's domain are never verified or exported: on small sites they are usually the web designer's "site by" credit. Company name and phone come from the shop's own site when it shows them (`name_source` says which). `flaw` holds the first failed site check (`no_booking`, `no_tap_to_call`, `no_reviews`, `slow_mobile`) and is blank when unchecked; `site_launch_estimate` is the earliest footer copyright year. Every export first reloads suppression from the sales pipeline (`$SALES_PIPELINE`, default `/mnt/project-files/sales/pipeline.csv`): the email and phone of every `do-not-contact` or bounced row. Suppressed emails, domains and place IDs are always skipped, as are closed businesses and the niche file's `exclude_types`, `name_exclude` (franchises) and `min_reviews`. The calls export lists shops with no website first, then social-only ones, by review count; `--pipeline` appends them to the sales pipeline CSV, skipping any shop already in it under any status, `do-not-contact` included (matched by phone, or by name and city). No call row is dialable until it's scrubbed against the National Do Not Call Registry. Without `--dnc-file`, every row says `ok_to_dial=no` with `dnc_checked` empty. With the registry download, registered numbers are removed and suppressed, and the rest get `ok_to_dial=yes`, `dnc_checked` (date) and `dnc_source` (file).

**Purge.** Google's Places policy allows storing place IDs indefinitely but not other Places content. `purge` clears every Google field older than 30 days and keeps the place ID and our own crawl results. Exports only include places fetched in the last 30 days, so export, load the campaign, then re-search when you need fresh rows.

## Adding a niche

Copy `niches/auto-detailers.json`, change `name`, `slug` (the pipeline's niche value), `queries`, `exclude_types`, `name_exclude`, `min_reviews` and `areas` (`{"name": "City, ST"}` is geocoded; `{"name": ..., "bbox": [south, west, north, east]}` skips geocoding).

## Tests

```sh
python3 -m unittest discover -s tests -t .
```
