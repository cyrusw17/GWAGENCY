"""Whole pipeline on a hand-made 20-shop fixture: search, crawl, verify, sample, and every export.

Proves the hand-off into the preview engine's input format without a Google key. All shops,
domains and numbers are invented (555-01xx numbers, .example domains).
"""
import csv
import os
import tempfile
import unittest
from pathlib import Path

from leadpipe import cli, crawl, export, http, places, store, verify

N_SHOPS = 20


def fixture_places():
    out = []
    for i in range(N_SHOPS):
        kind = ("no_site", "social", "site", "site", "site")[i % 5]
        site = {"no_site": None, "social": f"https://facebook.com/fixture{i}",
                "site": f"https://www.fixture{i}.example/"}[kind]
        out.append({"id": f"ChIJfixture{i:02d}", "displayName": {"text": f"Fixture Shine {i:02d}"},
                    "formattedAddress": f"{100 + i} Main St, Deer Park, TX 77536, USA",
                    "nationalPhoneNumber": f"(281) 555-01{i:02d}", "websiteUri": site, "rating": 4.5 + (i % 5) / 10,
                    "userRatingCount": 10 + i * 3, "primaryType": "car_wash", "businessStatus": "OPERATIONAL",
                    "googleMapsUri": f"https://maps.google.com/?cid={i}",
                    "reviews": [{"rating": 5, "text": {"text": f"Fixture review {i}"},
                                 "authorAttribution": {"displayName": "Fixture Reviewer"},
                                 "publishTime": "2026-09-15T12:00:00Z"}],
                    "regularOpeningHours": {"weekdayDescriptions": ["Monday: 8 AM to 6 PM"]}})
    return out


def fixture_fetch(url, **kw):
    """Each fixture site: owner address, a designer credit, or a contact form only."""
    host = url.split("/")[2]
    if url.endswith("/robots.txt"):
        raise http.HttpError(404)
    i = int(host.split(".")[1].replace("fixture", ""))
    footer = '<footer>&copy; 2020 <a href="mailto:hello@designstudio.example">site by Studio</a></footer>'
    body = {0: f'<a href="mailto:owner@{host[4:]}">Email us</a>', 1: f"fixtureshine{i}@gmail.com",
            2: '<form><input type="email"><textarea></textarea></form>'}[i % 3]
    return 200, url, "text/html", (f'<html><head><title>Fixture Shine {i:02d} | Detailing</title></head><body>'
                                   f'<a href="tel:2815550{100 + i}">Call</a>{body}{footer}</body></html>')


class EndToEndTest(unittest.TestCase):
    def test_fixture_run_into_preview_engine_format(self):
        niche = {"name": "auto-detailers", "slug": "auto-detailing", "queries": ["auto detailing"],
                 "areas": [{"name": "Deer Park, TX", "bbox": [29.6, -95.2, 29.8, -95.0]}]}
        db = store.connect(":memory:")
        s = places.Searcher(db, "k", niche, 10, post=lambda url, body, headers=None: {"places": fixture_places()},
                            sleep=lambda _: None, with_reviews=True)
        s.run(niche["areas"])
        crawl_counts = crawl.run(db, niche["name"], workers=2, fetch=fixture_fetch, sleep=lambda _: None)
        verify_counts = verify.run(db, niche["name"], "reoon", 100, check=lambda e: ("valid", {}))

        with tempfile.TemporaryDirectory() as d:
            files = {k: Path(d) / f"{k}.csv" for k in ("prospects", "email", "calls")}
            export.write_csv(files["prospects"], export.PROSPECT_COLUMNS, export.prospect_rows(db, niche))
            export.write_csv(files["email"], export.EMAIL_COLUMNS, export.email_rows(db, niche))
            export.write_csv(files["calls"], export.CALL_COLUMNS, export.call_rows(db, niche))
            prospects, emails, calls = (list(csv.DictReader(files[k].open())) for k in ("prospects", "email", "calls"))
            if os.environ.get("LEADPIPE_FIXTURE_OUT"):  # writes the fixture outputs for other threads to try
                out = Path(os.environ["LEADPIPE_FIXTURE_OUT"])
                out.mkdir(parents=True, exist_ok=True)
                for k, f in files.items():
                    (out / f"fixture-{k}.csv").write_text(f.read_text())

        self.assertEqual(len(prospects), N_SHOPS)
        self.assertEqual(list(prospects[0]), export.PROSPECT_COLUMNS)
        self.assertEqual({p["segment"] for p in prospects}, {"no_site", "social_only", "has_site"})
        self.assertTrue(all(p["review_1_text"] and p["hours_text"] and p["niche"] == "auto-detailing"
                            for p in prospects))
        # 12 sites: 4 publish an owner address, 4 a gmail, 4 only a form; every designer credit is dropped.
        self.assertEqual(crawl_counts, {"platform": 1, "ok": 8, "form_only": 4})  # 4 Facebook pages, 1 domain
        self.assertEqual(verify_counts, {"valid": 8, "off_domain": 1})  # one shared designer address
        self.assertEqual(len(emails), 8)
        self.assertFalse(any("designstudio" in e["email"] for e in emails))
        self.assertTrue(all(e["name_source"] == "website" and e["site_launch_estimate"] == "2020" for e in emails))
        self.assertEqual(len(calls), 8)  # 4 no-site + 4 social-only, none dialable before the DNC scrub
        self.assertTrue(all(c["ok_to_dial"] == "no" for c in calls))
        cost = s.spent * cli.PRICES[places.ATMOSPHERE_SKU][0] / 1000
        self.assertEqual(s.spent, 1)
        self.assertAlmostEqual(cost / len(emails) * 1000, 5.0)  # $0.04 for 8 verified: $5 per 1,000 here


if __name__ == "__main__":
    unittest.main()
