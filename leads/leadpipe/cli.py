"""Command line: python -m leadpipe <command> --niche niches/auto-detailers.json"""
import argparse
import json
import os
import sys
from pathlib import Path

from . import crawl, export, places, store, verify

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
    s = places.Searcher(db, key, niche, a.max_requests)
    try:
        s.run(areas)
    except places.BudgetExceeded as e:
        print(f"Stopped: {e}. Re-run to resume where it left off.")
    print(f"Requests this run: {s.spent}")
    cmd_stats(db, niche, a)


def cmd_crawl(db, niche, a):
    print(crawl.run(db, niche["name"], limit=a.limit, workers=a.workers, delay=a.delay))


def cmd_verify(db, niche, a):
    print(verify.run(db, niche["name"], a.provider, a.max))


def cmd_export(db, niche, a):
    out = Path(a.out) if a.out else store.data_dir()
    out.mkdir(parents=True, exist_ok=True)
    if a.kind == "email":
        path = out / f"{niche['name']}-emails.csv"
        n = export.write_csv(path, export.EMAIL_COLUMNS, export.email_rows(db, niche))
    else:
        path = out / f"{niche['name']}-calls.csv"
        n = export.write_csv(path, export.CALL_COLUMNS, export.call_rows(db, niche, a.min_reviews))
    print(f"Wrote {n} rows to {path}")


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

    c = sub.add_parser("crawl", help="find published emails on business websites")
    c.add_argument("--limit", type=int, default=1000)
    c.add_argument("--workers", type=int, default=8)
    c.add_argument("--delay", type=float, default=1.0, help="seconds between pages on one site")

    v = sub.add_parser("verify", help="verify found emails")
    v.add_argument("--provider", choices=sorted(verify.PROVIDERS), default="reoon")
    v.add_argument("--max", type=int, required=True, help="hard cap on verifications this run")

    e = sub.add_parser("export", help="write CSVs to the data dir")
    e.add_argument("kind", choices=["email", "calls"])
    e.add_argument("--out", help="directory (default: data dir)")
    e.add_argument("--min-reviews", type=int, default=5)

    pg = sub.add_parser("purge", help="drop Google content past the caching window")
    pg.add_argument("--days", type=int, default=30)

    sp = sub.add_parser("suppress", help="add emails, domains or place IDs (one per line) to suppression")
    sp.add_argument("file")
    sp.add_argument("--reason", default="manual")

    sub.add_parser("stats", help="counts and this month's Google usage")

    a = p.parse_args(argv)
    if a.cmd == "export" and a.out:
        store.data_dir()  # validates LEADS_DATA_DIR
        if store.inside_git_checkout(Path(a.out).resolve()):
            raise SystemExit("Refusing to export into a git checkout.")
    niche = load_niche(a.niche)
    db = store.connect()
    globals()[f"cmd_{a.cmd}"](db, niche, a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
