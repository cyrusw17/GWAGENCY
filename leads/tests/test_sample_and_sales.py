import csv
import json
import tempfile
import unittest
from pathlib import Path

from leadpipe import crawl, export, extract, places, report, store, verify
from tests.test_pipeline import place

NICHE = {"name": "lawn-care", "slug": "lawn-care", "queries": ["lawn care service"], "exclude_types": [],
         "name_exclude": ["trugreen"], "min_reviews": 15}
PIPELINE_HEADER = ("shop,city,state,niche,segment,channel,contact_email,contact_phone,email_source,first_contacted,"
                   "last_contacted,touches,replied,reply_date,interested,start_99_date,approved_300_date,"
                   "content_complete_date,preview_sent_date,launch_date,plan,plan_start_date,status,lost_reason,notes")


def named(i, name, **kw):
    p = place(i, phone=f"(903) 555-{i:04d}", **kw)
    p["displayName"]["text"] = name
    return p


class SignalsTest(unittest.TestCase):
    def test_strong_and_weak_sites(self):
        strong = """<body><a href="tel:7135550100">Call</a><a class="btn">Get a free quote</a>
                    <p>200 five-star reviews</p><footer>&copy; 2026 Shine Co</footer></body>"""
        weak = """<body><p>Welcome</p><footer>Copyright 2019-2021 Shine Co</footer>
                  <form><input type="email"><textarea></textarea></form></body>"""
        s, w = extract.site_signals(strong), extract.site_signals(weak)
        self.assertEqual((s["copyright_year"], w["copyright_year"]), (2026, 2021))
        self.assertTrue(w["has_form"])
        self.assertFalse(extract.weak_site(s))
        self.assertTrue(extract.weak_site(w))
        self.assertTrue(extract.weak_site(dict(s, tel_link=False), lighthouse=30))

    def test_form_only_status(self):
        page = '<body><form><input type="email" name="e"></form></body>'
        res = crawl.fetch_site("https://a.com", fetch=lambda u, **k: (200, u, "text/html", "" if "robots" in u else page))
        self.assertEqual(res["status"], "form_only")


class SalesTest(unittest.TestCase):
    def setUp(self):
        self.db = store.connect(":memory:")
        s = places.Searcher(self.db, "k", NICHE, 10, post=None)
        s.area = "Tyler, TX"
        s.save([named(1, "Green Acres", reviews=80), named(2, "TruGreen Tyler", reviews=500),
                named(3, "Few Reviews", reviews=3), named(4, "FB Lawn", site="https://facebook.com/fb", reviews=90),
                named(5, "Has Site", site="https://hassite.com", reviews=40), named(6, "Old Friend", reviews=60)])

    def test_call_rows_filters_and_order(self):
        rows = export.call_rows(self.db, NICHE)
        self.assertEqual([r["company_name"] for r in rows], ["Green Acres", "Old Friend", "FB Lawn"])

    def test_append_to_pipeline_skips_existing_and_dnc(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "pipeline.csv"
            path.write_text(PIPELINE_HEADER + "\nOld Friend,Houston,TX,lawn-care,no-site,call,,,,,,,,,,,,,,,,,"
                            "do-not-contact,,\n")
            rows = export.call_rows(self.db, NICHE)
            self.assertEqual(export.append_to_pipeline(path, rows, "lawn-care"), 2)
            self.assertEqual(export.append_to_pipeline(path, rows, "lawn-care"), 0)
            got = list(csv.DictReader(path.open()))
            self.assertEqual([r["shop"] for r in got], ["Old Friend", "Green Acres", "FB Lawn"])
            self.assertEqual(got[0]["status"], "do-not-contact")
            self.assertEqual((got[2]["segment"], got[2]["channel"], got[2]["status"]), ("facebook-only", "call", "new"))

    def test_append_handles_missing_trailing_newline_and_non_facebook_social(self):
        s = places.Searcher(self.db, "k", NICHE, 10, post=None)
        s.save([named(7, "Insta Lawn", site="https://instagram.com/x", reviews=30)])
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "pipeline.csv"
            path.write_text(PIPELINE_HEADER + "\nAcme,Tyler,TX,lawn-care,no-site,call,,,,,,,,,,,,,,,,,new,,x")
            export.append_to_pipeline(path, export.call_rows(self.db, NICHE), "lawn-care")
            got = {r["shop"]: r for r in csv.DictReader(path.open())}
            self.assertEqual(got["Acme"]["notes"], "x")
            self.assertEqual(got["Insta Lawn"]["segment"], "no-site")
            self.assertIn("only web presence: instagram.com", got["Insta Lawn"]["notes"])

    def test_prospects_and_sample_report(self):
        self.db.execute("INSERT INTO crawls VALUES ('hassite.com', 'ok', 2, NULL, 0, ?)",
                        (json.dumps({"tel_link": False, "cta_first_screen": False, "reviews_shown": True,
                                     "copyright_year": 2020}),))
        self.db.execute("INSERT INTO emails (email, domain, source_url, is_free, is_role, verify_status) "
                        "VALUES ('owner@gmail.com', 'hassite.com', 'https://hassite.com/contact', 1, 0, 'valid')")
        rows = {r["name"]: r for r in export.prospect_rows(self.db, NICHE)}
        self.assertEqual(set(rows), {"Green Acres", "FB Lawn", "Has Site", "Old Friend"})
        self.assertEqual((rows["Has Site"]["email"], rows["Has Site"]["email_type"], rows["Has Site"]["zip"]),
                         ("owner@gmail.com", "free", "77002"))
        self.assertEqual(rows["FB Lawn"]["segment"], "social_only")

        self.assertEqual(report.pick(self.db, NICHE, 200), (4, 1))
        text = report.report(self.db, NICHE)
        for line in ("| Has website (own domain, loads) | 25% (1) |", "| Social-only | 25% (1) |",
                     "| Verifiable (valid) | 25% (1) |", "| Own-domain vs free (of findable) | 0% / 100% |",
                     "| Weak site (of sites with a home page) | 100% (1 of 1"):
            self.assertIn(line, text)

    def test_pick_spreads_across_areas(self):
        s = places.Searcher(self.db, "k", NICHE, 10, post=None)
        s.area = "Lawton, OK"
        s.save([named(10 + i, f"L{i}", reviews=20) for i in range(5)])
        n, areas = report.pick(self.db, NICHE, 4)
        got = [r["area"] for r in self.db.execute(
            "SELECT p.area FROM sample s JOIN places p USING (place_id) WHERE s.niche = 'lawn-care'")]
        self.assertEqual((n, areas, sorted(got)), (4, 2, ["Lawton, OK", "Lawton, OK", "Tyler, TX", "Tyler, TX"]))

    def test_designer_credit_never_exported_or_verified(self):
        self.db.execute("INSERT INTO crawls VALUES ('hassite.com', 'ok', 1, NULL, 0, ?)",
                        (json.dumps({"site_name": "Has Site Lawn", "site_phone": "903-555-7777", "tel_link": True,
                                     "cta_first_screen": False, "reviews_shown": True, "copyright_first": 2018}),))
        self.db.execute("INSERT INTO emails (email, domain, source_url, is_free, is_role) "
                        "VALUES ('jane@somestudio.com', 'hassite.com', 'https://hassite.com/', 0, 0)")
        checked = []
        counts = verify.run(self.db, NICHE["name"], "reoon", 10, check=lambda e: checked.append(e) or ("valid", {}))
        self.assertEqual((checked, counts), ([], {"off_domain": 1}))
        self.db.execute("UPDATE emails SET verify_status = 'valid'")  # even if verified elsewhere
        self.assertEqual(export.email_rows(self.db, NICHE), [])
        self.db.execute("INSERT INTO emails (email, domain, source_url, is_free, is_role, verify_status) "
                        "VALUES ('mike@hassite.com', 'hassite.com', 'https://hassite.com/contact', 0, 0, 'valid')")
        [row] = export.email_rows(self.db, NICHE)
        self.assertEqual({k: row[k] for k in ("email", "company_name", "name_source", "phone", "flaw", "segment",
                                              "niche", "email_source", "email_source_url", "site_launch_estimate")},
                         {"email": "mike@hassite.com", "company_name": "Has Site Lawn", "name_source": "website",
                          "phone": "903-555-7777", "flaw": "no_booking", "segment": "has_site", "niche": "lawn-care",
                          "email_source": "website", "email_source_url": "https://hassite.com/contact",
                          "site_launch_estimate": 2018})

    def test_pipeline_do_not_contact_suppresses_email_and_phone(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "pipeline.csv"
            path.write_text(PIPELINE_HEADER + "\nGreen Acres,Tyler,TX,lawn-care,no-site,call,,(903) 555-0001,,,,,,,,,,,,,"
                            ",,do-not-contact,,\nX,Tyler,TX,lawn-care,has-site,email,a@hassite.com,,website,,,,,,,,,,,,"
                            ",,lost,bounced,\n")
            store.load_pipeline_suppression(self.db, path)
        self.assertNotIn("Green Acres", [r["company_name"] for r in export.call_rows(self.db, NICHE)])
        self.assertTrue(store.is_suppressed(self.db, email="a@hassite.com"))

    def test_pipeline_gets_dnc_checked_column(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "pipeline.csv"
            path.write_text(PIPELINE_HEADER + "\nAcme,Tyler,TX,lawn-care,no-site,call,,,,,,,,,,,,,,,,,new,,x\n")
            export.append_to_pipeline(path, export.call_rows(self.db, NICHE), "lawn-care")
            got = list(csv.DictReader(path.open()))
            self.assertEqual((got[0]["shop"], got[0]["notes"], got[0]["dnc_checked"]), ("Acme", "x", ""))
            self.assertTrue(all("dnc_checked" in r for r in got))
            self.assertEqual(export.CALL_COLUMNS[-1], "dnc_checked")

    def test_lighthouse_score(self):
        res = {"lighthouseResult": {"categories": {"performance": {"score": 0.42}}}}
        self.assertEqual(report.lighthouse("https://a.com", get=lambda u, **k: res), 42)


if __name__ == "__main__":
    unittest.main()
