import unittest

from leadpipe import extract


class EmailsInTest(unittest.TestCase):
    def test_mailto_text_and_obfuscated(self):
        page = """<a href="mailto:Owner@ShineCo.com?subject=Hi">Email</a>
        <p>Or write info@shineco.com.</p><p>bookings [at] shineco [dot] com</p>"""
        self.assertEqual(extract.emails_in(page),
                         {"owner@shineco.com", "info@shineco.com", "bookings@shineco.com"})

    def test_cloudflare_protected(self):
        key = 0x42
        enc = "%02x" % key + "".join("%02x" % (ord(c) ^ key) for c in "joe@detail.co")
        self.assertEqual(extract.emails_in(f'<span data-cfemail="{enc}">[email protected]</span>'),
                         {"joe@detail.co"})

    def test_junk_filtered(self):
        page = """logo@2x.png user@example.com abc@sentry.wixpress.com noreply@shineco.com
        0123456789abcdef0123@o1.ingest.sentry.io
        <script>var x = "hidden@shineco.com";</script>"""
        self.assertEqual(extract.emails_in(page), set())


class NoticeTest(unittest.TestCase):
    def test_detects_no_transfer_and_no_solicitation(self):
        self.assertTrue(extract.has_no_transfer_notice("We will not sell or share your email address."))
        self.assertTrue(extract.has_no_transfer_notice("<b>No solicitation</b> please"))
        self.assertFalse(extract.has_no_transfer_notice("Call or email us for a quote."))


class LinksAndRankTest(unittest.TestCase):
    def test_same_site_links(self):
        page = '<a href="/contact-us">c</a><a href="https://other.com/contact">x</a><a href="/gallery">g</a>'
        self.assertEqual(extract.same_site_links(page, "https://shineco.com/"),
                         ["https://shineco.com/contact-us"])

    def test_rank_order_and_off_domain_dropped(self):
        emails = ["info@shineco.com", "shineco@gmail.com", "joe@shineco.com"]
        self.assertEqual(sorted(emails, key=lambda e: extract.rank(e, "shineco.com")),
                         ["joe@shineco.com", "shineco@gmail.com", "info@shineco.com"])
        self.assertIsNone(extract.rank("jane@somestudio.com", "shineco.com"))  # "site by" credit

    def test_site_signals_name_phone_flaws(self):
        page = """<html><head><title>Shine Co | Mobile Detailing Tyler TX</title></head><body>
                  <a href="tel:+1 903-555-0100">Call</a><footer>&copy; 2019 - 2024 Shine Co</footer></body>"""
        sig = extract.site_signals(page)
        self.assertEqual((sig["site_name"], sig["site_phone"], sig["copyright_first"]),
                         ("Shine Co", "+1 903-555-0100", 2019))
        self.assertEqual(extract.flaws(sig), ["no_booking", "no_reviews"])
        self.assertEqual(extract.flaws(dict(sig, lighthouse=31))[-1], "slow_mobile")


if __name__ == "__main__":
    unittest.main()
