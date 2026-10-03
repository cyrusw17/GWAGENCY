"""Command line: python -m leadpipe <command> --niche niches/auto-detailers.json"""
import argparse
import json
import os
import sys
from pathlib import Path

from . import crawl, export, places, report, store, verify

# USD per 1,000 requests and free requests per month (Google Maps Platform, 2026).
PRICES = {
    places.SKU: (35.0, 1000),
    places.GEOCODE_SKU: (5.0, 10000),
}


def load_niche(path):
    with open(path) as f:
        return json.load(f)


def cmd_search(db, niche, a):
    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        raise SystemExit("Set GOOGLE_MAPS_API_KEY (Places API (New) and Geocoding API enabled).")
    areas = [x for x in niche["areas"] if not a.area or x["name"] in a.area]
    s = places.Searcher(db, key, niche, a.max_requests, max_pages=a.max_pages)
    try:
        s.run(areas, split_full=not a.no_split, queries=a.query)
    except places.BudgetExceeded as e:
        print(f"Stopped: {e}. Re-run to resume where it left off.")
    print(f"Requests this run: {s.spent}")
    cmd_stats(db, niche, a)


def cmd_crawl(db, niche, a):
    print(crawl.run(db, niche["name"], limit=a.limit, workers=a.workers, delay=a.delay, sample_only=a.sample_only))


def cmd_verify(db, niche, a):
    print(verify.run(db, niche["name"], a.provider, a.max, sample_only=a.sample_only))


def cmd_export(db, niche, a):
    kinds = {
        "email": (export.EMAIL_COLUMNS, lambda: export.email_rows(db, niche)),
        "prospects": (export.PROSPECT_COLUMNS, lambda: export.prospect_rows(db, niche)),
        "calls": (export.CALL_COLUMNS, lambda: export.call_rows(db, niche, a.min_reviews)),
    }
    columns, rows = kinds[a.kind]
    rows = rows()
    if a.pipeline:
        if a.kind != "calls":
            raise SystemExit("--pipeline only applies to calls exports.")
        rows = export.not_in_pipeline(a.pipeline, rows)  # so --limit picks the next shops, not repeats
    rows = rows[: a.limit]
    path = Path(a.file) if a.file else store.data_dir() / f"{niche['name']}-{a.kind}.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Wrote {export.write_csv(path, columns, rows)} rows to {path}")
    if a.pipeline:
        n = export.append_to_pipeline(a.pipeline, rows, niche.get("slug", niche["name"]))
        print(f"Added {n} new rows to {a.pipeline} (shops already there were skipped)")


def cmd_sample(db, niche, a):
    if a.action == "pick":
        n, areas = report.pick(db, niche, a.n)
        print(f"Sampled {n} places across {areas} areas.")
    else:
        if a.lighthouse:
            print(f"Lighthouse measured on {report.measure_lighthouse(db, niche)} sites.")
        print(report.report(db, niche))


def cmd_purge(db, niche, a):
    print(f"Cleared Google content from {store.purge(db, a.days)} places older than {a.days} days.")


def cmd_suppress(db, niche, a):
    with open(a.file) as f:
        print(f"Added {store.add_suppression(db, f, a.reason)} suppression entries.")


def cmd_stats(db, niche, a):
    n = niche["name"]
    q = lambda sql, *p: db.execute(sql, (n, *p)).fetchone()[0]
    total = q("SELECT COUNT(*) FROM places WHERE niche=?")
    with_site = q("SELECT COUNT(*) FROM places WHERE niche=? AND domain IS NOT NULL")
    print(f"Places: {total}  with website: {with_site}  without: {total - with_site}")
    for row in db.execute("""SELECT c.status, COUNT(*) FROM crawls c WHERE c.domain IN
                             (SELECT domain FROM places WHERE niche=?) GROUP BY c.status""", (n,)):
        print(f"  crawl {row[0]}: {row[1]}")
    for row in db.execute("""SELECT COALESCE(verify_status, 'unverified'), COUNT(*) FROM emails WHERE domain IN
                             (SELECT domain FROM places WHERE niche=?) GROUP BY 1""", (n,)):
        print(f"  email {row[0]}: {row[1]}")
    cost = 0.0
    for sku, (price, free) in PRICES.items():
        used = store.usage(db, sku)
        cost += max(0, used - free) * price / 1000
        print(f"  {store.month()} {sku}: {used} requests ({free} free)")
    print(f"  Estimated Google bill this month: ${cost:.2f}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="leadpipe")
    p.add_argument("--niche", required=True, help="niche config JSON, e.g. niches/auto-detailers.json")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("search", help="Google Places Text Search over each area")
    s.add_argument("--area", action="append", help="limit to these area names (repeatable)")
    s.add_argument("--max-requests", type=int, required=True, help="hard cap on billed requests this run")
    s.add_argument("--no-split", action="store_true", help="one search per area and query (samples)")
    s.add_argument("--max-pages", type=int, default=3, help="pages of 20 per search, 1 to 3")
    s.add_argument("--query", action="append", help="use only these queries (repeatable)")

    c = sub.add_parser("crawl", help="find published emails on business websites")
    c.add_argument("--limit", type=int, default=1000)
    c.add_argument("--workers", type=int, default=8)
    c.add_argument("--delay", type=float, default=1.0, help="seconds between pages on one site")
    c.add_argument("--sample-only", action="store_true", help="only sites in the current sample")

    v = sub.add_parser("verify", help="verify found emails")
    v.add_argument("--provider", choices=sorted(verify.PROVIDERS), default="reoon")
    v.add_argument("--max", type=int, required=True, help="hard cap on verifications this run")
    v.add_argument("--sample-only", action="store_true", help="only emails in the current sample")

    e = sub.add_parser("export", help="write a CSV (default: in the data dir)")
    e.add_argument("kind", choices=["email", "prospects", "calls"])
    e.add_argument("--file", help="output CSV path (never inside a git checkout)")
    e.add_argument("--limit", type=int, help="keep only the first N rows")
    e.add_argument("--min-reviews", type=int, default=5, help="calls only")
    e.add_argument("--pipeline", help="calls only: also append new shops to this sales pipeline CSV")

    sm = sub.add_parser("sample", help="pick a sample, or report its metrics")
    sm.add_argument("action", choices=["pick", "report"])
    sm.add_argument("-n", type=int, default=200)
    sm.add_argument("--lighthouse", action="store_true", help="report: measure mobile performance via PageSpeed")

    pg = sub.add_parser("purge", help="drop Google content past the caching window")
    pg.add_argument("--days", type=int, default=30)

    sp = sub.add_parser("suppress", help="add emails, domains or place IDs (one per line) to suppression")
    sp.add_argument("file")
    sp.add_argument("--reason", default="manual")

    sub.add_parser("stats", help="counts and this month's Google usage")

    a = p.parse_args(argv)
    if a.cmd == "export":
        for target in filter(None, (a.file, a.pipeline)):
            if store.inside_git_checkout(Path(target).resolve().parent):
                raise SystemExit(f"Refusing to write {target}: it is inside a git checkout.")
    niche = load_niche(a.niche)
    db = store.connect()
    globals()[f"cmd_{a.cmd}"](db, niche, a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
