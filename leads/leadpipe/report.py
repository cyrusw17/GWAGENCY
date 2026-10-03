"""Niche samples measured with marketing's definitions (marketing thread, 2026-10-03).

pick() draws up to N places spread evenly across the niche's areas; crawl and
verify then run on the sample only; report() prints the metrics.
"""
import hashlib
import json
import os
import statistics
import urllib.parse
from collections import defaultdict

from . import crawl, export, extract, http, store

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


def pick(db, niche, n):
    by_area = defaultdict(list)
    for p in export.eligible_places(db, niche):
        by_area[p["area"]].append(p["place_id"])
    for ids in by_area.values():  # stable pseudo-random order, so re-picking gives the same sample
        ids.sort(key=lambda i: hashlib.sha1(i.encode()).hexdigest())
    chosen, i = [], 0
    while len(chosen) < n and any(i < len(v) for v in by_area.values()):
        chosen += [v[i] for v in by_area.values() if i < len(v)][: n - len(chosen)]
        i += 1
    db.execute("DELETE FROM sample WHERE niche = ?", (niche["name"],))
    db.executemany("INSERT INTO sample VALUES (?, ?)", [(niche["name"], pid) for pid in chosen])
    db.commit()
    return len(chosen), len(by_area)


def lighthouse(url, key=None, get=http.get_json):
    q = {"url": url, "strategy": "mobile", "category": "performance"}
    if key:
        q["key"] = key
    res = get(f"{PSI_URL}?{urllib.parse.urlencode(q)}", timeout=120, retries=1)
    score = res["lighthouseResult"]["categories"]["performance"]["score"]
    return None if score is None else round(score * 100)


def measure_lighthouse(db, niche):
    """Store a mobile Lighthouse performance score in each sampled site's crawl signals."""
    key = os.environ.get("PAGESPEED_API_KEY")
    rows = db.execute("""SELECT c.domain, c.signals, MIN(p.website) AS website FROM sample s
                         JOIN places p ON p.place_id = s.place_id AND p.niche = s.niche
                         JOIN crawls c ON c.domain = p.domain
                         WHERE s.niche = ? AND c.signals IS NOT NULL GROUP BY c.domain""", (niche["name"],))
    done = 0
    for r in rows.fetchall():
        sig = json.loads(r["signals"])
        if "lighthouse" in sig:
            continue
        try:
            sig["lighthouse"] = lighthouse(r["website"], key)
        except Exception as e:
            print(f"  lighthouse failed for {r['domain']}: {str(e)[:120]}")
            continue
        db.execute("UPDATE crawls SET signals = ? WHERE domain = ?", (json.dumps(sig), r["domain"]))
        db.commit()
        done += 1
    return done


def pct(part, whole):
    return f"{100 * part / whole:.0f}%" if whole else "n/a"


def report(db, niche):
    rows = db.execute("""SELECT p.*, c.status AS crawl_status, c.signals FROM sample s
                         JOIN places p ON p.place_id = s.place_id AND p.niche = s.niche
                         LEFT JOIN crawls c ON c.domain = p.domain WHERE s.niche = ?""", (niche["name"],)).fetchall()
    n = len(rows)
    site = social = none = dead = uncrawled = findable = form_only = verifiable = unsure = own = free = weak = 0
    weak_base = lh_measured = 0
    for r in rows:
        if not r["domain"]:
            none += 1
            continue
        if crawl.is_platform(r["domain"]):
            social += 1
            continue
        if r["crawl_status"] is None:
            uncrawled += 1
            continue
        if r["crawl_status"] == "error":
            dead += 1
            continue
        site += 1
        if r["signals"]:
            sig = json.loads(r["signals"])
            weak_base += 1
            lh_measured += sig.get("lighthouse") is not None
            weak += extract.weak_site(sig, sig.get("lighthouse"))
        if r["crawl_status"] == "form_only":
            form_only += 1
        emails = db.execute("SELECT email, verify_status FROM emails WHERE domain = ?", (r["domain"],)).fetchall()
        if not emails:
            continue
        findable += 1
        valid = [e["email"] for e in emails if e["verify_status"] == "valid"]
        if valid:
            verifiable += 1
        elif any(e["verify_status"] in ("catch_all", "unknown") for e in emails):
            unsure += 1
        best = min(valid or [e["email"] for e in emails], key=lambda e: extract.rank(e, r["domain"]))
        if extract.classify(best, r["domain"])["is_free"]:
            free += 1
        else:
            own += 1
    reviews = [r["reviews"] or 0 for r in rows]
    areas = len({r["area"] for r in rows})
    lines = [
        f"## {niche['name']}",
        "",
        f"Sampled listings: {n} across {areas} areas (closed, excluded types and excluded names removed"
        + (f", {niche['min_reviews']}+ reviews" if niche.get("min_reviews") else "") + ").",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Has website (own domain, loads) | {pct(site, n)} ({site}) |",
        f"| Social-only | {pct(social, n)} ({social}) |",
        f"| No website listed | {pct(none, n)} ({none}) |",
        f"| Website listed but did not load | {pct(dead, n)} ({dead}) |",
        f"| Findable email | {pct(findable, n)} ({findable}) |",
        f"| Form-only | {pct(form_only, n)} ({form_only}) |",
        f"| Verifiable (valid) | {pct(verifiable, n)} ({verifiable}) |",
        f"| Catch-all or unknown only | {pct(unsure, n)} ({unsure}) |",
        f"| Own-domain vs free (of findable) | {pct(own, findable)} / {pct(free, findable)} |",
        f"| Weak site (of sites with a home page) | {pct(weak, weak_base)} ({weak} of {weak_base}; "
        f"Lighthouse measured on {lh_measured}) |",
        f"| Median Google reviews | {statistics.median(reviews) if reviews else 'n/a'} |",
        f"| 15+ reviews | {pct(sum(x >= 15 for x in reviews), n)} |",
    ]
    if uncrawled:
        lines += ["", f"Note: {uncrawled} sampled websites are not crawled yet; run crawl --sample-only."]
    return "\n".join(lines)
