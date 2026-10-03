"""CSV exports: verified emails for the sequencer, prospects for personalization,
a no-website call list, and rows appended to the shared sales pipeline."""
import csv
import json
import os
import re
import time

from . import crawl, extract, store

# Merge fields agreed with the cold email specialist, 2026-10-03. service stays blank
# (not in our data); flaw is only filled when the site check actually ran.
EMAIL_COLUMNS = ["email", "first_name", "company_name", "name_source", "niche", "segment", "service", "flaw",
                 "email_type", "email_source", "email_source_url", "website", "phone", "city", "state", "rating",
                 "reviews", "site_launch_estimate", "place_id", "maps_url"]
# Nobody dials a number until it is scrubbed against the National Do Not Call Registry:
# without a scrub file every row says ok_to_dial=no and dnc_checked stays empty.
CALL_COLUMNS = ["company_name", "phone", "ok_to_dial", "dnc_checked", "dnc_source", "city", "state", "rating",
                "reviews", "web_presence", "place_id", "maps_url"]
# Agreed with the personalization thread, 2026-10-03.
REVIEW_COLUMNS = [f"review_{i}_{k}" for i in (1, 2, 3) for k in ("author", "text", "stars", "date")]
PROSPECT_COLUMNS = ["place_id", "name", "niche", "email", "email_status", "email_type", "email_source_url",
                    "segment", "phone", "website", "gbp_url", "category", "city", "state", "zip", "rating",
                    "review_count", *REVIEW_COLUMNS, "hours_text", "source", "fetched_at"]
ZIP_RE = re.compile(r"\b[A-Z]{2}\s+(\d{5})(?:-\d{4})?,\s*USA$")
DEFAULT_SALES_PIPELINE = "/mnt/project-files/sales/pipeline.csv"


def sales_pipeline_path():
    """The shared sales pipeline CSV, if present. Its do-not-contact rows are suppressed on every export."""
    path = os.environ.get("SALES_PIPELINE", DEFAULT_SALES_PIPELINE)
    return path if os.path.exists(path) else None


def eligible_places(db, niche):
    """Fresh, operating places that pass the niche's type, name and review filters and aren't suppressed."""
    excluded = set(niche.get("exclude_types", []))
    names = [n.lower() for n in niche.get("name_exclude", [])]
    min_reviews = niche.get("min_reviews", 0)
    rows = db.execute(
        """SELECT p.*, c.signals FROM places p LEFT JOIN crawls c ON c.domain = p.domain
           WHERE p.niche = ? AND p.fetched_at >= ?
           AND (p.business_status IS NULL OR p.business_status = 'OPERATIONAL')""",
        (niche["name"], store.fresh_cutoff())).fetchall()
    return [r for r in rows if r["primary_type"] not in excluded
            and (r["reviews"] or 0) >= min_reviews
            and not any(n in (r["name"] or "").lower() for n in names)
            and not store.is_suppressed(db, domain=r["domain"], place_id=r["place_id"], phone=r["phone"])]


def segment(p):
    if not p["domain"]:
        return "no_site"
    return "social_only" if crawl.is_platform(p["domain"]) else "has_site"


def best_email(db, p, used=(), statuses=("valid",)):
    """Best sendable email for a place among the given verify statuses (earlier status wins), or None.

    Addresses on another business's domain are never returned (see extract.rank).
    """
    marks = ",".join("?" * len(statuses))
    rows = [r for r in db.execute(f"SELECT * FROM emails WHERE domain = ? AND verify_status IN ({marks})",
                                  (p["domain"], *statuses))
            if r["email"] not in used and extract.rank(r["email"], p["domain"]) is not None
            and not store.is_suppressed(db, email=r["email"], domain=r["email"].rsplit("@", 1)[1])]
    if not rows:
        return None
    return min(rows, key=lambda r: (statuses.index(r["verify_status"]), extract.rank(r["email"], p["domain"]),
                                    r["email"]))


def email_type(email, domain):
    c = extract.classify(email, domain)
    return "free" if c["is_free"] else ("role" if c["is_role"] else "personal")


def email_rows(db, niche):
    """One row per shop with a verified address. Name and phone come from the shop's own site when it shows
    them (name_source says which); the Google values are only a fallback inside the 30-day window."""
    out, used = [], set()
    for p in eligible_places(db, niche):
        best = best_email(db, p, used) if p["domain"] else None
        if not best:
            continue
        used.add(best["email"])
        sig = json.loads(p["signals"]) if p["signals"] else {}
        found = extract.flaws(sig)
        out.append({
            "email": best["email"], "first_name": "",
            "company_name": sig.get("site_name") or p["name"],
            "name_source": "website" if sig.get("site_name") else "google",
            "niche": niche.get("slug", niche["name"]), "segment": "has_site", "service": "",
            "flaw": found[0] if found else "", "email_type": email_type(best["email"], p["domain"]),
            "email_source": "website", "email_source_url": best["source_url"], "website": p["website"],
            "phone": sig.get("site_phone") or p["phone"], "city": p["city"], "state": p["state"],
            "rating": p["rating"], "reviews": p["reviews"], "site_launch_estimate": sig.get("copyright_first") or "",
            "place_id": p["place_id"], "maps_url": p["maps_url"],
        })
    return out


def prospect_rows(db, niche):
    """Every eligible place, with its best email if any (valid first, then catch_all, then unknown)."""
    out = []
    for p in eligible_places(db, niche):
        e = best_email(db, p, statuses=("valid", "catch_all", "unknown")) if p["domain"] else None
        m = ZIP_RE.search(p["address"] or "")
        reviews = {f"review_{i}_{k}": v for i, rev in enumerate(json.loads(p["review_samples"] or "[]"), 1)
                   for k, v in rev.items()}
        out.append({
            **dict.fromkeys(REVIEW_COLUMNS, None), **reviews, "hours_text": p["hours_text"],
            "place_id": p["place_id"], "name": p["name"], "niche": niche.get("slug", niche["name"]),
            "email": e and e["email"],
            "email_status": e and e["verify_status"], "email_type": e and email_type(e["email"], p["domain"]),
            "email_source_url": e and e["source_url"], "segment": segment(p),
            "phone": p["phone"], "website": p["website"], "gbp_url": p["maps_url"], "category": p["primary_type"],
            "city": p["city"], "state": p["state"], "zip": m and m.group(1), "rating": p["rating"],
            "review_count": p["reviews"], "source": "google-places-api",
            "fetched_at": time.strftime("%Y-%m-%d", time.gmtime(p["fetched_at"])),
        })
    return out


def dnc_scrub(db, rows, registry_path):
    """Scrub call rows against a National Do Not Call Registry download (one number per line, any format).

    Registered numbers are dropped and added to suppression; the rest are marked ok_to_dial=yes with the
    scrub date and file. Returns (rows kept, numbers removed).
    """
    with open(registry_path) as f:
        registered = {store.phone_key(line) for line in f} - {""}
    hit = [r for r in rows if store.phone_key(r["phone"]) in registered]
    store.add_suppression(db, [r["phone"] for r in hit], "dnc-registry")
    today, source = time.strftime("%Y-%m-%d", time.gmtime()), os.path.basename(registry_path)
    kept = [{**r, "ok_to_dial": "yes", "dnc_checked": today, "dnc_source": source}
            for r in rows if store.phone_key(r["phone"]) not in registered]
    return kept, len(hit)


def call_rows(db, niche, min_reviews=5):
    """Shops with a phone and no real website: the playbook's main outbound list."""
    out = []
    for p in eligible_places(db, niche):
        if not p["phone"] or (p["reviews"] or 0) < min_reviews or segment(p) == "has_site":
            continue
        out.append({
            "company_name": p["name"], "phone": p["phone"], "city": p["city"], "state": p["state"],
            "rating": p["rating"], "reviews": p["reviews"],
            "web_presence": "none" if not p["domain"] else p["domain"],
            "place_id": p["place_id"], "maps_url": p["maps_url"],
            "ok_to_dial": "no", "dnc_checked": "", "dnc_source": "",
        })
    # No site first, then social-only; within each, most reviews, then best rating.
    out.sort(key=lambda r: (r["web_presence"] != "none", -(r["reviews"] or 0), -(r["rating"] or 0)))
    return out


def _pipeline_key(name, city):
    return (name or "").strip().lower(), (city or "").strip().lower()


def not_in_pipeline(path, rows):
    """Call rows for shops not yet in the sales pipeline under any status (do-not-contact included),
    matched by phone or by name and city; also drops repeats within rows."""
    with open(path, newline="") as f:
        existing = list(csv.DictReader(f))
    phones = {store.phone_key(r["contact_phone"]) for r in existing if r.get("contact_phone")}
    names = {_pipeline_key(r["shop"], r["city"]) for r in existing}
    out = []
    for r in rows:
        key = _pipeline_key(r["company_name"], r["city"])
        if store.phone_key(r["phone"]) in phones or key in names:
            continue
        phones.add(store.phone_key(r["phone"]))
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
    if rows and "dnc_checked" not in columns:  # team lead, 2026-10-03: call rows track the DNC scrub
        columns = add_column(path, "dnc_checked")
        text = "\n"
    new = []
    for r in rows:
        web = r["web_presence"]
        row = dict.fromkeys(columns, "")
        row.update({
            "shop": r["company_name"], "city": r["city"] or "", "state": r["state"] or "", "niche": niche_slug,
            "segment": "facebook-only" if web in ("facebook.com", "fb.com") or web.endswith(".facebook.com")
            else "no-site",
            "channel": channel, "contact_phone": r["phone"], "touches": "0", "status": "new",
            "dnc_checked": r.get("dnc_checked", ""),
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


def add_column(path, name):
    """Add an empty column to a CSV in place (written to a temp file, then swapped in). Returns the new header."""
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        columns, rows = reader.fieldnames + [name], list(reader)
    tmp = f"{path}.tmp"
    with open(tmp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        w.writerows(rows)
    os.replace(tmp, path)
    return columns


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
