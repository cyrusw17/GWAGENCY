"""SQLite store kept outside the repo, plus the guard that keeps it there."""
import os
import sqlite3
import time
from pathlib import Path

DEFAULT_DATA_DIR = "~/gw-leads"
# Days we may hold Google Places content before purging and re-searching.
CACHE_DAYS = 30

SCHEMA = """
CREATE TABLE IF NOT EXISTS places (
    place_id TEXT NOT NULL,
    niche TEXT NOT NULL,
    -- Google Places content: must be purged within the caching window (see purge()).
    name TEXT, address TEXT, city TEXT, state TEXT, phone TEXT, website TEXT,
    rating REAL, reviews INTEGER, primary_type TEXT, business_status TEXT, maps_url TEXT,
    review_samples TEXT, hours_text TEXT,  -- only with search --with-reviews (Atmosphere fields)
    fetched_at INTEGER,
    -- Our own data, kept: the website's domain and the configured area it was found in.
    domain TEXT, area TEXT,
    PRIMARY KEY (place_id, niche)
);
CREATE INDEX IF NOT EXISTS places_domain ON places(domain);
CREATE TABLE IF NOT EXISTS tiles (
    niche TEXT, query TEXT, rect TEXT, results INTEGER, requests INTEGER, done_at INTEGER,
    PRIMARY KEY (niche, query, rect)
);
CREATE TABLE IF NOT EXISTS usage (
    month TEXT, sku TEXT, count INTEGER, PRIMARY KEY (month, sku)
);
CREATE TABLE IF NOT EXISTS crawls (
    domain TEXT PRIMARY KEY, status TEXT, pages INTEGER, note TEXT, crawled_at INTEGER,
    signals TEXT  -- JSON from extract.site_signals() for the home page
);
CREATE TABLE IF NOT EXISTS emails (
    email TEXT PRIMARY KEY, domain TEXT, source_url TEXT, found_at INTEGER,
    is_free INTEGER, is_role INTEGER,
    verify_status TEXT, verify_provider TEXT, verify_raw TEXT, verified_at INTEGER
);
CREATE INDEX IF NOT EXISTS emails_domain ON emails(domain);
CREATE TABLE IF NOT EXISTS sample (
    niche TEXT, place_id TEXT, PRIMARY KEY (niche, place_id)
);
CREATE TABLE IF NOT EXISTS suppression (
    value TEXT PRIMARY KEY, kind TEXT, reason TEXT, added_at INTEGER
);
"""


def inside_git_checkout(path):
    for p in [path, *path.parents]:
        if (p / ".git").exists():
            return True
    return False


def data_dir():
    """Resolve the data dir and refuse any location inside a git checkout."""
    path = Path(os.environ.get("LEADS_DATA_DIR", DEFAULT_DATA_DIR)).expanduser().resolve()
    if inside_git_checkout(path):
        raise SystemExit(f"Refusing data dir {path}: it is inside a git checkout. "
                         "Contact data must never be committed. Set LEADS_DATA_DIR elsewhere.")
    path.mkdir(parents=True, exist_ok=True)
    os.chmod(path, 0o700)
    return path


def connect(path=None):
    db = sqlite3.connect(path or data_dir() / "leads.db")
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)
    for table, col in (("places", "area"), ("crawls", "signals"), ("places", "review_samples"),
                       ("places", "hours_text")):  # databases created before these columns
        if col not in {r["name"] for r in db.execute(f"PRAGMA table_info({table})")}:
            db.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
    return db


def now():
    return int(time.time())


def fresh_cutoff():
    """Oldest timestamp still inside the caching window."""
    return now() - CACHE_DAYS * 86400


def month():
    return time.strftime("%Y-%m", time.gmtime())


def bump_usage(db, sku, n=1):
    db.execute("INSERT INTO usage(month, sku, count) VALUES (?, ?, ?) "
               "ON CONFLICT(month, sku) DO UPDATE SET count = count + excluded.count",
               (month(), sku, n))


def usage(db, sku):
    row = db.execute("SELECT count FROM usage WHERE month = ? AND sku = ?", (month(), sku)).fetchone()
    return row["count"] if row else 0


GOOGLE_FIELDS = ("name", "address", "city", "state", "phone", "website", "rating", "reviews",
                 "primary_type", "business_status", "maps_url", "review_samples", "hours_text", "fetched_at")


def purge(db, days=CACHE_DAYS):
    """Drop Google Places content older than `days`; keep place_id and our derived domain.

    Places policy lets us keep place IDs indefinitely but not other content, so
    export within the window and re-run search to refresh.
    """
    cutoff = now() - days * 86400  # days may differ from CACHE_DAYS
    cols = ", ".join(f"{c} = NULL" for c in GOOGLE_FIELDS)
    cur = db.execute(f"UPDATE places SET {cols} WHERE fetched_at IS NOT NULL AND fetched_at < ?", (cutoff,))
    db.commit()
    return cur.rowcount


def phone_key(phone):
    """Last 10 digits, so (713) 555-0100 and +1 713-555-0100 match."""
    return "".join(ch for ch in phone or "" if ch.isdigit())[-10:]


def is_suppressed(db, email=None, domain=None, place_id=None, phone=None):
    vals = [v.lower() for v in (email, domain, place_id) if v]
    if phone_key(phone):
        vals.append(phone_key(phone))
    if not vals:
        return False
    q = "SELECT 1 FROM suppression WHERE value IN (%s) LIMIT 1" % ",".join("?" * len(vals))
    return db.execute(q, vals).fetchone() is not None


def add_suppression(db, values, reason):
    """Add emails, domains, place IDs or phone numbers (one per value). Returns how many were read."""
    rows = []
    for v in values:
        v = v.strip().lower()
        if not v or v.startswith("#"):
            continue
        if "@" in v:
            kind = "email"
        elif v.startswith("chij"):
            kind = "place_id"
        elif not any(ch.isalpha() for ch in v) and len(phone_key(v)) == 10:
            kind, v = "phone", phone_key(v)
        else:
            kind = "domain"
        rows.append((v, kind, reason, now()))
    db.executemany("INSERT OR IGNORE INTO suppression VALUES (?, ?, ?, ?)", rows)
    db.commit()
    return len(rows)


def load_pipeline_suppression(db, path):
    """Suppress the email and phone of every do-not-contact or lost-to-bounce row in the sales pipeline."""
    import csv
    values = []
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            if r.get("status") == "do-not-contact" or "bounce" in (r.get("lost_reason") or "").lower():
                values += [r.get("contact_email") or "", r.get("contact_phone") or ""]
    return add_suppression(db, values, f"pipeline:{path}")
