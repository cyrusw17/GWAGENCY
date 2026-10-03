"""Google Places API (New) Text Search with adaptive tiling.

One Text Search page returns up to 20 places and a query tops out at 60, so a
metro is covered by splitting its viewport into tiles and splitting again
wherever a tile comes back full. Each page is one billed request.
"""
import json
import re
import time
import urllib.parse

from . import http, store

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
# Phone, website and rating put the request in the Text Search Enterprise SKU.
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
    "places.websiteUri", "places.rating", "places.userRatingCount", "places.primaryType",
    "places.businessStatus", "places.googleMapsUri", "nextPageToken",
])
ATMOSPHERE_FIELDS = ",places.reviews,places.regularOpeningHours"
SKU = "text_search_enterprise"
ATMOSPHERE_SKU = "text_search_enterprise_atmosphere"
GEOCODE_SKU = "geocoding"
MAX_PER_QUERY = 60
PAGE_SIZE = 20


class BudgetExceeded(Exception):
    pass


def domain_of(url):
    if not url:
        return None
    host = urllib.parse.urlsplit(url if "://" in url else "http://" + url).hostname or ""
    host = host.lower()
    return host[4:] if host.startswith("www.") else host or None


ADDRESS_RE = re.compile(r",\s*([^,]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?,\s*USA$")


def city_state(address):
    m = ADDRESS_RE.search(address or "")
    return (m.group(1).strip(), m.group(2)) if m else (None, None)


def review_samples(p, n=3):
    """Up to n public reviews as JSON: author, text, stars, date (YYYY-MM-DD)."""
    revs = [{"author": (r.get("authorAttribution") or {}).get("displayName"),
             "text": (r.get("text") or r.get("originalText") or {}).get("text"),
             "stars": r.get("rating"), "date": (r.get("publishTime") or "")[:10] or None}
            for r in p.get("reviews") or []][:n]
    return json.dumps(revs) if revs else None


def hours_text(p):
    days = (p.get("regularOpeningHours") or {}).get("weekdayDescriptions")
    return "; ".join(days) if days else None


def rect_key(r):
    return ",".join(f"{v:.5f}" for v in r)


def split(r):
    s, w, n, e = r
    mlat, mlng = (s + n) / 2, (w + e) / 2
    return [(s, w, mlat, mlng), (s, mlng, mlat, e), (mlat, w, n, mlng), (mlat, mlng, n, e)]


class Searcher:
    def __init__(self, db, api_key, niche, max_requests, post=http.post_json, get=http.get_json, sleep=time.sleep,
                 max_pages=MAX_PER_QUERY // PAGE_SIZE, with_reviews=False):
        self.db, self.key, self.niche = db, api_key, niche
        self.max_requests, self.max_pages = max_requests, max_pages
        self.spent = 0
        self.area = None
        # Review samples and hours move each page to the Enterprise + Atmosphere SKU.
        self.field_mask = FIELD_MASK + (ATMOSPHERE_FIELDS if with_reviews else "")
        self.sku = ATMOSPHERE_SKU if with_reviews else SKU
        self._post, self._get, self._sleep = post, get, sleep

    def _charge(self, sku):
        if self.spent >= self.max_requests:
            raise BudgetExceeded(f"request budget of {self.max_requests} reached")
        self.spent += 1
        store.bump_usage(self.db, sku)

    def viewport(self, area):
        if "bbox" in area:
            return tuple(area["bbox"])
        self._charge(GEOCODE_SKU)
        q = urllib.parse.urlencode({"address": area["name"], "key": self.key})
        res = self._get(f"{GEOCODE_URL}?{q}")
        if res.get("status") != "OK":
            raise RuntimeError(f"geocode failed for {area['name']}: {res.get('status')}")
        vp = res["results"][0]["geometry"]["viewport"]
        return (vp["southwest"]["lat"], vp["southwest"]["lng"], vp["northeast"]["lat"], vp["northeast"]["lng"])

    def search_tile(self, query, r):
        """Fetch and save every page for one tile. Returns (places, billed requests)."""
        s, w, n, e = r
        body = {
            "textQuery": query,
            "pageSize": PAGE_SIZE,
            "locationRestriction": {"rectangle": {"low": {"latitude": s, "longitude": w},
                                                  "high": {"latitude": n, "longitude": e}}},
        }
        headers = {"X-Goog-Api-Key": self.key, "X-Goog-FieldMask": self.field_mask}
        out, requests = [], 0
        while True:
            self._charge(self.sku)
            requests += 1
            res = self._post(SEARCH_URL, body, headers=headers)
            page = res.get("places", [])
            self.save(page)  # keep paid pages even if the budget stops us mid-tile
            self.db.commit()
            out.extend(page)
            token = res.get("nextPageToken")
            if not token or len(out) >= MAX_PER_QUERY or requests >= self.max_pages:
                break
            body = {**body, "pageToken": token}
            self._sleep(1)
        return out, requests

    def save(self, places):
        t = store.now()
        for p in places:
            addr = p.get("formattedAddress")
            city, state = city_state(addr)
            site = p.get("websiteUri")
            self.db.execute(
                """INSERT INTO places (place_id, niche, name, address, city, state, phone, website, rating,
                       reviews, primary_type, business_status, maps_url, review_samples, hours_text, fetched_at,
                       domain, area)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(place_id, niche) DO UPDATE SET
                       name=excluded.name, address=excluded.address, city=excluded.city, state=excluded.state,
                       phone=excluded.phone, website=excluded.website, rating=excluded.rating,
                       reviews=excluded.reviews, primary_type=excluded.primary_type,
                       business_status=excluded.business_status, maps_url=excluded.maps_url,
                       review_samples=COALESCE(excluded.review_samples, places.review_samples),
                       hours_text=COALESCE(excluded.hours_text, places.hours_text),
                       fetched_at=excluded.fetched_at, domain=excluded.domain,
                       area=COALESCE(places.area, excluded.area)""",
                (p["id"], self.niche["name"], (p.get("displayName") or {}).get("text"), addr, city, state,
                 p.get("nationalPhoneNumber"), site, p.get("rating"), p.get("userRatingCount"),
                 p.get("primaryType"), p.get("businessStatus"), p.get("googleMapsUri"), review_samples(p),
                 hours_text(p), t, domain_of(site),
                 self.area))

    def cover(self, query, r, min_deg, split_full=True):
        """Search a tile; split it into four when it comes back full.

        Tiles searched within the caching window are skipped, so runs resume and later runs refresh.
        """
        # Capped-page sample searches are cached separately so a later full search still splits.
        tag = query if self.max_pages * PAGE_SIZE >= MAX_PER_QUERY else f"{query}|pages={self.max_pages}"
        key = (self.niche["name"], tag, rect_key(r))
        done = self.db.execute("SELECT results FROM tiles WHERE niche=? AND query=? AND rect=? AND done_at >= ?",
                               (*key, store.fresh_cutoff())).fetchone()
        if done is not None:
            results = done["results"]
        else:
            places, requests = self.search_tile(query, r)
            results = len(places)
            self.db.execute("INSERT OR REPLACE INTO tiles VALUES (?, ?, ?, ?, ?, ?)",
                            (*key, results, requests, store.now()))
            self.db.commit()
        s, w, n, e = r
        if split_full and results >= MAX_PER_QUERY and min(n - s, e - w) / 2 >= min_deg:
            for sub in split(r):
                self.cover(query, sub, min_deg)

    def run(self, areas, split_full=True, queries=None):
        """For samples: split_full=False searches each area once per query, and max_pages caps pages per search."""
        min_deg = self.niche.get("min_tile_deg", 0.03)
        try:
            for area in areas:
                self.area = area["name"]
                r = self.viewport(area)
                for q in queries or self.niche["queries"]:
                    self.cover(q, r, min_deg, split_full)
        finally:
            self.db.commit()
