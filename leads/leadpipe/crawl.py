"""Polite crawl of each business's own website for published email addresses.

Per domain: robots.txt is honored, at most `max_pages` pages (home plus
contact/about/privacy links), one request per `delay` seconds. Social and
marketplace sites are never crawled (their terms ban automated collection);
they are marked so a person can look them up by hand.
"""
import functools
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
    """Crawl one site. Returns dict(status, pages, emails={email: page_url}, note)."""
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
    queue, seen, emails, pages = [website], set(), {}, 0
    while queue and pages < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        if not robots.can_fetch(http.USER_AGENT, url):
            if pages == 0:
                return {"status": "robots_blocked", "pages": 0, "emails": {}, "note": url}
            continue
        if pages:
            sleep(delay)
        try:
            _, final_url, ctype, body = fetch(url, timeout=15, retries=1)
        except Exception as e:
            if pages == 0:
                return {"status": "error", "pages": 0, "emails": {}, "note": str(e)[:200]}
            continue
        pages += 1
        if ctype not in ("text/html", "application/xhtml+xml", "text/plain"):
            continue
        if extract.has_no_transfer_notice(body):
            return {"status": "no_transfer_notice", "pages": pages, "emails": {}, "note": url}
        for email in extract.emails_in(body):
            emails.setdefault(email, url)
        if pages == 1:
            queue.extend(extract.same_site_links(body, final_url))
    return {"status": "ok" if emails else "no_email", "pages": pages, "emails": emails, "note": None}


def pending_sites(db, niche, limit):
    return db.execute(
        """SELECT p.domain, MIN(p.website) AS website FROM places p
           LEFT JOIN crawls c ON c.domain = p.domain
           WHERE p.niche = ? AND p.domain IS NOT NULL AND p.website IS NOT NULL AND c.domain IS NULL
             AND (p.business_status IS NULL OR p.business_status = 'OPERATIONAL')
           GROUP BY p.domain LIMIT ?""", (niche, limit)).fetchall()


def run(db, niche, limit=1000, workers=8, **kw):
    todo, counts = [], Counter()
    for row in pending_sites(db, niche, limit):
        dom = row["domain"]
        status = "platform" if is_platform(dom) else "suppressed" if store.is_suppressed(db, domain=dom) else None
        if status:
            db.execute("INSERT INTO crawls VALUES (?, ?, 0, NULL, ?)", (dom, status, store.now()))
            counts[status] += 1
        else:
            todo.append(row)
    db.commit()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_site, r["website"], **kw): r["domain"] for r in todo}
        for fut in as_completed(futures):
            dom, res = futures[fut], fut.result()
            db.execute("INSERT OR REPLACE INTO crawls VALUES (?, ?, ?, ?, ?)",
                       (dom, res["status"], res["pages"], res["note"], store.now()))
            for email, url in res["emails"].items():
                c = extract.classify(email, dom)
                db.execute("INSERT OR IGNORE INTO emails (email, domain, source_url, found_at, is_free, is_role) "
                           "VALUES (?, ?, ?, ?, ?, ?)", (email, dom, url, store.now(),
                                                         int(c["is_free"]), int(c["is_role"])))
            db.commit()
            counts[res["status"]] += 1
    return dict(counts)
