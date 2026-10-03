"""CSV exports: verified emails for the sequencer, prospects for personalization,
a no-website call list, and rows appended to the shared sales pipeline."""
import csv
import re
import time

from . import crawl, extract, store

EMAIL_COLUMNS = ["email", "company_name", "website", "phone", "city", "state", "rating", "reviews",
                 "email_type", "place_id", "maps_url"]
CALL_COLUMNS = ["company_name", "phone", "city", "state", "rating", "reviews", "web_presence",
                "place_id", "maps_url"]
# Agreed with the personalization thread, 2026-10-03.
PROSPECT_COLUMNS = ["place_id", "name", "email", "email_status", "email_type", "email_source_url", "segment",
                    "phone", "website", "gbp_url", "category", "city", "state", "zip", "rating", "review_count",
                    "source", "fetched_at"]
ZIP_RE = re.compile(r"\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?,\s*USA$")


def eligible_places(db, niche):
    """Fresh, operating places that pass the niche's type, name and review filters and aren't suppressed."""
    excluded = set(niche.get("exclude_types", []))
    names = [n.lower() for n in niche.get("name_exclude", [])]
    min_reviews = niche.get("min_reviews", 0)
    rows = db.execute(
        """SELECT * FROM places WHERE niche = ? AND fetched_at >= ?
           AND (business_status IS NULL OR business_status = 'OPERATIONAL')""",
        (niche["name"], store.fresh_cutoff())).fetchall()
    return [r for r in rows if r["primary_type"] not in excluded
            and (r["reviews"] or 0) >= min_reviews
            and not any(n in (r["name"] or "").lower() for n in names)
            and not store.is_suppressed(db, domain=r["domain"], place_id=r["place_id"])]


def segment(p):
    if not p["domain"]:
        return "no-site"
    return "social-only" if crawl.is_platform(p["domain"]) else "has-site"


def best_email(db, p, used=(), statuses=("valid",)):
    """Best email for a place among the given verify statuses (earlier status wins), or None."""
    marks = ",".join("?" * len(statuses))
    rows = [r for r in db.execute(f"SELECT * FROM emails WHERE domain = ? AND verify_status IN ({marks})",
                                  (p["domain"], *statuses))
            if r["email"] not in used
            and not store.is_suppressed(db, email=r["email"], domain=r["email"].rsplit("@", 1)[1])]
    if not rows:
        return None
    return min(rows, key=lambda r: (statuses.index(r["verify_status"]), extract.rank(r["email"], p["domain"]),
                                    r["email"]))


def email_type(email, domain):
    c = extract.classify(email, domain)
    return "free" if c["is_free"] else ("role" if c["is_role"] else "personal")


def email_rows(db, niche):
    out, used = [], set()
    for p in eligible_places(db, niche):
        best = best_email(db, p, used) if p["domain"] else None
        if not best:
            continue
        used.add(best["email"])
        out.append({
            "email": best["email"], "company_name": p["name"], "website": p["website"], "phone": p["phone"],
            "city": p["city"], "state": p["state"], "rating": p["rating"], "reviews": p["reviews"],
            "email_type": email_type(best["email"], p["domain"]), "place_id": p["place_id"],
            "maps_url": p["maps_url"],
        })
    return out


def prospect_rows(db, niche):
    """Every eligible place, with its best email if any (valid first, then catch_all, then unknown)."""
    out = []
    for p in eligible_places(db, niche):
        e = best_email(db, p, statuses=("valid", "catch_all", "unknown")) if p["domain"] else None
        m = ZIP_RE.search(p["address"] or "")
        out.append({
            "place_id": p["place_id"], "name": p["name"], "email": e and e["email"],
            "email_status": e and e["verify_status"], "email_type": e and email_type(e["email"], p["domain"]),
            "email_source_url": e and e["source_url"], "segment": segment(p),
            "phone": p["phone"], "website": p["website"], "gbp_url": p["maps_url"], "category": p["primary_type"],
            "city": p["city"], "state": p["state"], "zip": m and m.group(1), "rating": p["rating"],
            "review_count": p["reviews"], "source": "google-places-api",
            "fetched_at": time.strftime("%Y-%m-%d", time.gmtime(p["fetched_at"])),
        })
    return out


def call_rows(db, niche, min_reviews=5):
    """Shops with a phone and no real website: the playbook's main outbound list."""
    out = []
    for p in eligible_places(db, niche):
        if not p["phone"] or (p["reviews"] or 0) < min_reviews or segment(p) == "has-site":
            continue
        out.append({
            "company_name": p["name"], "phone": p["phone"], "city": p["city"], "state": p["state"],
            "rating": p["rating"], "reviews": p["reviews"],
            "web_presence": "none" if not p["domain"] else p["domain"],
            "place_id": p["place_id"], "maps_url": p["maps_url"],
        })
    # No site first, then social-only; within each, most reviews, then best rating.
    out.sort(key=lambda r: (r["web_presence"] != "none", -(r["reviews"] or 0), -(r["rating"] or 0)))
    return out


def digits(phone):
    return re.sub(r"\D", "", phone or "")[-10:]


def _pipeline_key(name, city):
    return (name or "").strip().lower(), (city or "").strip().lower()


def not_in_pipeline(path, rows):
    """Call rows for shops not yet in the sales pipeline under any status (do-not-contact included),
    matched by phone or by name and city; also drops repeats within rows."""
    with open(path, newline="") as f:
        existing = list(csv.DictReader(f))
    phones = {digits(r["contact_phone"]) for r in existing if r.get("contact_phone")}
    names = {_pipeline_key(r["shop"], r["city"]) for r in existing}
    out = []
    for r in rows:
        key = _pipeline_key(r["company_name"], r["city"])
        if digits(r["phone"]) in phones or key in names:
            continue
        phones.add(digits(r["phone"]))
        names.add(key)
        out.append(r)
    return out


def append_to_pipeline(path, rows, niche_slug, channel="call"):
    """Append call rows that are not already in the sales pipeline. Returns the number added."""
    rows = not_in_pipeline(path, rows)
    with open(path, newline="") as f:
        columns = next(csv.reader(f))
        f.seek(0)
        text = f.read()
    new = []
    for r in rows:
        web = r["web_presence"]
        row = dict.fromkeys(columns, "")
        row.update({
            "shop": r["company_name"], "city": r["city"] or "", "state": r["state"] or "", "niche": niche_slug,
            "segment": "facebook-only" if web in ("facebook.com", "fb.com") or web.endswith(".facebook.com")
            else "no-site",
            "channel": channel, "contact_phone": r["phone"], "touches": "0", "status": "new",
            "notes": f"Google {r['rating']} stars, {r['reviews']} reviews"
                     + ("" if web in ("none", "facebook.com", "fb.com") else f"; only web presence: {web}")
                     + f"; {r['maps_url']}",
        })
        new.append(row)
    if new:
        with open(path, "a", newline="") as f:
            if text and not text.endswith("\n"):
                f.write("\n")
            csv.DictWriter(f, fieldnames=columns).writerows(_clean(r) for r in new)
    return len(new)


def _clean(row):
    """Neutralize spreadsheet formulas in text taken from listings (names, URLs)."""
    return {k: "'" + v if "phone" not in k and isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r")
            else v for k, v in row.items()}


def write_csv(path, columns, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows(map(_clean, rows))
    return len(rows)
