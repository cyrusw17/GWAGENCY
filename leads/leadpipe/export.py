"""CSV exports: verified emails for the sequencer, and a no-website call list."""
import csv

from . import crawl, extract, store

EMAIL_COLUMNS = ["email", "company_name", "website", "phone", "city", "state", "rating", "reviews",
                 "email_type", "place_id", "maps_url"]
CALL_COLUMNS = ["company_name", "phone", "city", "state", "rating", "reviews", "web_presence",
                "place_id", "maps_url"]


def _places(db, niche):
    excluded = set(niche.get("exclude_types", []))
    rows = db.execute(
        """SELECT * FROM places WHERE niche = ? AND fetched_at >= ?
           AND (business_status IS NULL OR business_status = 'OPERATIONAL')""",
        (niche["name"], store.fresh_cutoff())).fetchall()
    return [r for r in rows if r["primary_type"] not in excluded
            and not store.is_suppressed(db, domain=r["domain"], place_id=r["place_id"])]


def email_rows(db, niche):
    out, used = [], set()
    for p in _places(db, niche):
        if not p["domain"]:
            continue
        cands = [r["email"] for r in db.execute(
            "SELECT email FROM emails WHERE domain = ? AND verify_status = 'valid'", (p["domain"],))
            if r["email"] not in used
            and not store.is_suppressed(db, email=r["email"], domain=r["email"].rsplit("@", 1)[1])]
        if not cands:
            continue
        best = min(cands, key=lambda e: (extract.rank(e, p["domain"]), e))
        used.add(best)
        c = extract.classify(best, p["domain"])
        out.append({
            "email": best, "company_name": p["name"], "website": p["website"], "phone": p["phone"],
            "city": p["city"], "state": p["state"], "rating": p["rating"], "reviews": p["reviews"],
            "email_type": "free" if c["is_free"] else ("role" if c["is_role"] else "personal"),
            "place_id": p["place_id"], "maps_url": p["maps_url"],
        })
    return out


def call_rows(db, niche, min_reviews=5):
    """Shops with a phone and no real website: the playbook's main outbound list."""
    out = []
    for p in _places(db, niche):
        no_site = not p["domain"]
        if not p["phone"] or (p["reviews"] or 0) < min_reviews or not (no_site or crawl.is_platform(p["domain"])):
            continue
        out.append({
            "company_name": p["name"], "phone": p["phone"], "city": p["city"], "state": p["state"],
            "rating": p["rating"], "reviews": p["reviews"],
            "web_presence": "none" if no_site else p["domain"],
            "place_id": p["place_id"], "maps_url": p["maps_url"],
        })
    out.sort(key=lambda r: (-(r["reviews"] or 0), -(r["rating"] or 0)))
    return out


def _cell(key, value):
    """Neutralize spreadsheet formulas in text taken from listings (names, URLs)."""
    if key != "phone" and isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def write_csv(path, columns, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows({k: _cell(k, v) for k, v in r.items()} for r in rows)
    return len(rows)
