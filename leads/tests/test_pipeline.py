import os
import tempfile
import unittest
from pathlib import Path

from leadpipe import crawl, export, http, places, store, verify

NICHE = {"name": "auto-detailers", "queries": ["auto detailing"], "exclude_types": ["car_dealer"],
         "min_tile_deg": 0.05, "areas": [{"name": "Test", "bbox": [29.0, -96.0, 30.0, -95.0]}]}


def place(i, site=None, phone="(713) 555-0100", reviews=20, ptype="car_wash"):
    return {"id": f"ChIJ{i}", "displayName": {"text": f"Shop {i}"},
            "formattedAddress": "1 Main St, Houston, TX 77002, USA", "nationalPhoneNumber": phone,
            "websiteUri": site, "rating": 4.8, "userRatingCount": reviews, "primaryType": ptype,
            "businessStatus": "OPERATIONAL", "googleMapsUri": "https://maps.google.com/?cid=1"}


class FakeGoogle:
    """Returns 60 results for the full test box (forcing a split) and 5 for each quarter."""

    def __init__(self):
        self.calls = 0

    def post(self, url, body, headers=None):
        self.calls += 1
        r = body["locationRestriction"]["rectangle"]
        full = r["high"]["latitude"] - r["low"]["latitude"] > 0.6
        tag = f"{r['low']['latitude']:.2f}{r['low']['longitude']:.2f}"
        if full:
            page = int(body.get("pageToken", 0))
            res = {"places": [place(f"F{page * 20 + i}") for i in range(20)]}
            if page < 2:
                res["nextPageToken"] = str(page + 1)
            return res
        return {"places": [place(f"{tag}-{i}", site=f"https://www.s{tag}{i}.com/") for i in range(5)]}


class PlacesTest(unittest.TestCase):
    def setUp(self):
        self.db = store.connect(":memory:")

    def test_full_tile_splits_and_resumes(self):
        g = FakeGoogle()
        s = places.Searcher(self.db, "k", NICHE, max_requests=100, post=g.post, sleep=lambda _: None)
        s.run(NICHE["areas"])
        self.assertEqual(g.calls, 3 + 4)  # three pages for the full box, one per quarter
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM places").fetchone()[0], 60 + 20)
        row = self.db.execute("SELECT city, state, domain FROM places WHERE domain IS NOT NULL").fetchone()
        self.assertEqual((row["city"], row["state"]), ("Houston", "TX"))
        self.assertFalse(row["domain"].startswith("www."))
        s2 = places.Searcher(self.db, "k", NICHE, max_requests=100, post=g.post, sleep=lambda _: None)
        s2.run(NICHE["areas"])
        self.assertEqual(g.calls, 7)  # finished tiles are not re-billed

    def test_capped_sample_search_does_not_block_full_search(self):
        g = FakeGoogle()
        places.Searcher(self.db, "k", NICHE, 100, post=g.post, sleep=lambda _: None, max_pages=1).run(
            NICHE["areas"], split_full=False)
        self.assertEqual(g.calls, 1)
        places.Searcher(self.db, "k", NICHE, 100, post=g.post, sleep=lambda _: None).run(NICHE["areas"])
        self.assertEqual(g.calls, 1 + 3 + 4)

    def test_budget_stops_cleanly_and_keeps_paid_pages(self):
        g = FakeGoogle()
        s = places.Searcher(self.db, "k", NICHE, max_requests=2, post=g.post, sleep=lambda _: None)
        with self.assertRaises(places.BudgetExceeded):
            s.run(NICHE["areas"])
        self.assertEqual(g.calls, 2)
        self.assertEqual(store.usage(self.db, places.SKU), 2)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM places").fetchone()[0], 40)

    def test_stale_tiles_are_searched_again(self):
        g = FakeGoogle()
        places.Searcher(self.db, "k", NICHE, 100, post=g.post, sleep=lambda _: None).run(NICHE["areas"])
        self.db.execute("UPDATE tiles SET done_at = done_at - 31 * 86400")
        places.Searcher(self.db, "k", NICHE, 100, post=g.post, sleep=lambda _: None).run(NICHE["areas"])
        self.assertEqual(g.calls, 14)

    def test_same_place_in_two_niches(self):
        other = {**NICHE, "name": "car-wash"}
        places.Searcher(self.db, "k", NICHE, 1, post=None).save([place(1)])
        places.Searcher(self.db, "k", other, 1, post=None).save([place(1)])
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM places WHERE place_id='ChIJ1'").fetchone()[0], 2)


class CrawlVerifyExportTest(unittest.TestCase):
    def setUp(self):
        self.db = store.connect(":memory:")
        s = places.Searcher(self.db, "k", NICHE, 10, post=None)
        s.save([place(1, site="https://shineco.com"), place(2, site="https://facebook.com/x"),
                place(3), place(4, site="https://dealer.com", ptype="car_dealer"), place(5, reviews=1)])

    def fake_fetch(self, url, **kw):
        pages = {
            "https://shineco.com/robots.txt": "User-agent: *\nDisallow: /private",
            "https://shineco.com": '<a href="/contact">c</a> info@shineco.com',
            "https://shineco.com/contact": "joe@shineco.com",
            "https://dealer.com/robots.txt": "",
            "https://dealer.com": "sales@dealer.com",
        }
        if url not in pages:
            raise OSError("404")
        return 200, url, "text/html", pages[url]

    def test_end_to_end(self):
        counts = crawl.run(self.db, NICHE["name"], workers=1, fetch=self.fake_fetch, sleep=lambda _: None)
        self.assertEqual(counts, {"platform": 1, "ok": 2})
        answers = {"joe@shineco.com": "valid", "info@shineco.com": "valid", "sales@dealer.com": "valid"}
        verify.run(self.db, NICHE["name"], "reoon", 10, check=lambda e: (answers[e], {"credits": 9}))

        rows = export.email_rows(self.db, NICHE)
        self.assertEqual([(r["email"], r["email_type"]) for r in rows], [("joe@shineco.com", "personal")])

        calls = export.call_rows(self.db, NICHE)
        self.assertEqual(sorted(r["place_id"] for r in calls), ["ChIJ2", "ChIJ3"])  # facebook-only and no site

        store.add_suppression(self.db, ["joe@shineco.com"], "opt-out")
        self.assertEqual([r["email"] for r in export.email_rows(self.db, NICHE)], ["info@shineco.com"])

    def test_suppressed_email_domain_blocks_export_and_verify(self):
        crawl.run(self.db, NICHE["name"], workers=1, fetch=self.fake_fetch, sleep=lambda _: None)
        store.add_suppression(self.db, ["shineco.com"], "opt-out")
        checked = []
        counts = verify.run(self.db, NICHE["name"], "reoon", 10,
                            check=lambda e: checked.append(e) or ("valid", {}))
        self.assertEqual(checked, ["sales@dealer.com"])
        self.assertEqual(counts, {"suppressed": 2, "valid": 1})
        self.assertEqual(export.email_rows(self.db, NICHE), [])

    def test_robots_forbidden_means_stay_out(self):
        def fetch(url, **kw):
            if url.endswith("/robots.txt"):
                raise http.HttpError(403)
            return 200, url, "text/html", "joe@shineco.com"
        self.assertEqual(crawl.fetch_site("https://shineco.com", fetch=fetch)["status"], "robots_blocked")

    def test_private_addresses_refused(self):
        for url in ("http://169.254.169.254/latest/meta-data", "http://127.0.0.1:8080/", "file:///etc/passwd",
                    "http://10.0.0.5/"):
            with self.assertRaises(http.UnsafeUrl):
                http.check_public(url)
        self.assertEqual(crawl.fetch_site("http://localhost/")["status"], "error")

    def test_csv_formula_neutralized(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "x.csv"
            export.write_csv(path, ["company_name", "phone"], [{"company_name": "=HYPERLINK(1)", "phone": "+1 713"}])
            self.assertIn("'=HYPERLINK(1),+1 713", path.read_text())

    def test_reoon_error_raises(self):
        with self.assertRaises(RuntimeError):
            verify.check_reoon("a@b.com", "k", get=lambda url, **kw: {"status": "error", "reason": "no credits"})

    def test_purge_keeps_place_ids(self):
        self.db.execute("UPDATE places SET fetched_at = fetched_at - 31 * 86400")
        self.assertEqual(store.purge(self.db, 30), 5)
        row = self.db.execute("SELECT * FROM places WHERE place_id='ChIJ1'").fetchone()
        self.assertIsNone(row["name"])
        self.assertIsNone(row["phone"])
        self.assertEqual(row["domain"], "shineco.com")
        self.assertEqual(export.email_rows(self.db, NICHE), [])


class DataDirGuardTest(unittest.TestCase):
    def test_refuses_dir_inside_git_checkout(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / ".git").mkdir()
            os.environ["LEADS_DATA_DIR"] = str(Path(d) / "data")
            try:
                with self.assertRaises(SystemExit):
                    store.data_dir()
            finally:
                del os.environ["LEADS_DATA_DIR"]


if __name__ == "__main__":
    unittest.main()
