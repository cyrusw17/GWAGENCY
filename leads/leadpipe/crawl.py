"""Polite crawl of each business's own website for published email addresses.

Per domain: robots.txt is honored, at most `max_pages` pages (home plus
contact/about/privacy links), one request per `delay` seconds. Social and
marketplace sites are never crawled (their terms ban automated collection);
they are marked so a person can look them up by hand.
"""
import functools
import json
import time
import urllib.parse
import urllib.robotparser
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

from . import extract, http, store

PLATFORM_DOMAINS = (
    "facebook.com", "fb.com", "instagram.com", "tiktok.com", "twitter.com", "x.com", "youtube.com",
    "linkedin.com", "yelp.com", "linktr.ee", "linkin.bio", "nextdoor.com", "google.com", "g.page",
    "business.site", "booksy.com", "square.site", "squareup.com", "vagaro.com", "thumbtack.com",
    "angi.com", "homeadvisor.com", "urable.com", "calendly.com",
)


def is_platform(domain):
    return any(domain == d or domain.endswith("." + d) for d in PLATFORM_DOMAINS)


def fetch_site(website, max_pages=5, delay=1.0, fetch=functools.partial(http.request, public_only=True),
               sleep=time.sleep):
    """Crawl one site. Returns dict(status, pages, emails={email: page_url}, note, signals).

    status: ok, no_email, form_only (a contact form but no printed address),
    robots_blocked, error, no_transfer_notice.
    """
    parts = urllib.parse.urlsplit(website if "://" in website else "http://" + website)
    root = f"{parts.scheme}://{parts.netloc}"
    robots = urllib.robotparser.RobotFileParser()
    try:
        _, _, _, txt = fetch(root + "/robots.txt", timeout=10, retries=0, max_bytes=200_000)
        robots.parse(txt.splitlines())
    except http.HttpError as e:
        robots.parse([])  # missing robots.txt: everything allowed
        robots.disallow_all = e.status in (401, 403)  # access denied: stay out
    except Exception:
        robots.parse([])
    queue, seen, emails, pages, signals, has_form = [website], set(), {}, 0, None, False
    while queue and pages < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if not robots.can_fetch(http.USER_AGENT, url):
            if pages == 0:
                return {"status": "robots_blocked", "pages": 0, "emails": {}, "note": url, "signals": None}
            continue
        if pages:
            sleep(delay)
        try:
            _, final_url, ctype, body = fetch(url, timeout=15, retries=1)
        except Exception as e:
            if pages == 0:
                return {"status": "error", "pages": 0, "emails": {}, "note": str(e)[:200], "signals": None}
            continue
        pages += 1
        if ctype not in ("text/html", "application/xhtml+xml", "text/plain"):
            continue
        if extract.has_no_transfer_notice(body):
            return {"status": "no_transfer_notice", "pages": pages, "emails": {}, "note": url, "signals": signals}
        for email in extract.emails_in(body):
            emails.setdefault(email, url)
        page_signals = extract.site_signals(body)
        has_form = has_form or page_signals["has_form"]
        if pages == 1:
            signals = page_signals
            queue.extend(extract.same_site_links(body, final_url))
    site = (parts.hostname or "").removeprefix("www.")
    sendable = any(extract.rank(e, site) is not None for e in emails)  # a designer credit alone doesn't count
    status = "ok" if sendable else ("form_only" if has_form else "no_email")
    return {"status": status, "pages": pages, "emails": emails, "note": None, "signals": signals}


def pending_sites(db, niche, limit, sample_only=False):
    sample = "AND p.place_id IN (SELECT place_id FROM sample WHERE niche = p.niche)" if sample_only else ""
    return db.execute(
        f"""SELECT p.domain, MIN(p.website) AS website FROM places p
           LEFT JOIN crawls c ON c.domain = p.domain
           WHERE p.niche = ? AND p.domain IS NOT NULL AND p.website IS NOT NULL AND c.domain IS NULL
             AND (p.business_status IS NULL OR p.business_status = 'OPERATIONAL') {sample}
           GROUP BY p.domain LIMIT ?""", (niche, limit)).fetchall()


def run(db, niche, limit=1000, workers=8, sample_only=False, **kw):
    todo, counts = [], Counter()
    for row in pending_sites(db, niche, limit, sample_only):
        dom = row["domain"]
        status = "platform" if is_platform(dom) else "suppressed" if store.is_suppressed(db, domain=dom) else None
        if status:
            db.execute("INSERT INTO crawls VALUES (?, ?, 0, NULL, ?, NULL)", (dom, status, store.now()))
            counts[status] += 1
        else:
            todo.append(row)
    db.commit()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_site, r["website"], **kw): r["domain"] for r in todo}
        for fut in as_completed(futures):
            dom, res = futures[fut], fut.result()
            db.execute("INSERT OR REPLACE INTO crawls VALUES (?, ?, ?, ?, ?, ?)",
                       (dom, res["status"], res["pages"], res["note"], store.now(),
                        json.dumps(res["signals"]) if res["signals"] else None))
            for email, url in res["emails"].items():
                c = extract.classify(email, dom)
                db.execute("INSERT OR IGNORE INTO emails (email, domain, source_url, found_at, is_free, is_role) "
                           "VALUES (?, ?, ?, ?, ?, ?)", (email, dom, url, store.now(),
                                                         int(c["is_free"]), int(c["is_role"])))
            db.commit()
            counts[res["status"]] += 1
    return dict(counts)
