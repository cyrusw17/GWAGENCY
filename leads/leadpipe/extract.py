"""Pull published email addresses out of a business's own web pages.

Only addresses printed on the page count. We never guess addresses from name
patterns: under CAN-SPAM (15 U.S.C. 7704(b)) that is an aggravated violation,
as is harvesting from a site whose notice says it will not share addresses.
"""
import html
import re
import urllib.parse

EMAIL_RE = re.compile(r"[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9-]+\.)+[a-z]{2,24}", re.I)
OBFUSCATED_RE = re.compile(
    r"([a-z0-9._%+-]{1,64})\s*[\[(]\s*at\s*[\])]\s*([a-z0-9-]+(?:\s*[\[(]\s*dot\s*[\])]\s*[a-z0-9-]+)+)", re.I)
DOT_RE = re.compile(r"\s*[\[(]\s*dot\s*[\])]\s*", re.I)
CFEMAIL_RE =re.compile(r'data-cfemail="([0-9a-f]+)"', re.I)
HREF_RE = re.compile(r'href\s*=\s*["\']([^"\'#]+)', re.I)
TAG_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>|<[^>]+>", re.I | re.S)

JUNK_DOMAINS = {
    "example.com", "domain.com", "email.com", "yourdomain.com", "yoursite.com", "mysite.com",
    "sentry.io", "sentry.wixpress.com", "sentry-next.wixpress.com", "wixpress.com", "wix.com",
    "godaddy.com", "squarespace.com", "schema.org", "w3.org", "googleapis.com", "google.com",
    "cloudflare.com", "jquery.com", "gravatar.com", "latofonts.com", "mailchimp.com",
}
JUNK_TLDS = {"png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico", "bmp", "tiff", "mp4", "pdf"}
FREE_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com",
                "live.com", "msn.com", "me.com", "comcast.net", "att.net", "sbcglobal.net", "ymail.com",
                "proton.me", "protonmail.com"}
ROLE_PREFIXES = {"info", "contact", "hello", "sales", "support", "admin", "office", "service",
                 "booking", "bookings", "team", "help", "inquiries", "appointments", "mail"}
SKIP_PREFIXES = {"noreply", "no-reply", "donotreply", "privacy", "abuse", "postmaster", "webmaster",
                 "dmca", "legal", "careers", "jobs", "hr"}

# A site that says it won't share or sell the addresses it shows, or rejects
# solicitation, gets dropped entirely. Broad on purpose: a false drop costs one lead.
NO_TRANSFER_RE = re.compile(
    r"(will\s+not|won'?t|do\s+not|does\s+not|never)\s+(give|sell|share|rent|trade|transfer|disclose)"
    r"[^.]{0,80}e-?mail\s+address"
    r"|no\s+(unsolicited|solicitation|soliciting)"
    r"|not\s+(be\s+)?used\s+for\s+(unsolicited|commercial|marketing)\s+(e-?mail|messages)",
    re.I)

LINK_HINTS = ("contact", "about", "privacy", "book", "quote")


def decode_cfemail(hexstr):
    key = int(hexstr[:2], 16)
    return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))


def clean(email):
    email = urllib.parse.unquote(email).strip().strip(".").lower()
    if email.startswith("mailto:"):
        email = email[7:]
    email = email.split("?")[0]
    if not EMAIL_RE.fullmatch(email):
        return None
    local, dom = email.rsplit("@", 1)
    if dom in JUNK_DOMAINS or dom.rsplit(".", 1)[-1] in JUNK_TLDS or local in SKIP_PREFIXES:
        return None
    if re.fullmatch(r"[0-9a-f]{16,}", local) or "sentry" in dom or local.startswith(("u00", "x22")):
        return None
    return email


def emails_in(page_html):
    found = set()
    for hexstr in CFEMAIL_RE.findall(page_html):
        try:
            found.add(decode_cfemail(hexstr))
        except ValueError:
            pass
    for href in HREF_RE.findall(page_html):
        if href.lower().startswith("mailto:"):
            found.add(href)
    text = html.unescape(TAG_RE.sub(" ", page_html))
    found.update(EMAIL_RE.findall(text))
    for local, dom in OBFUSCATED_RE.findall(text):
        found.add(local + "@" + DOT_RE.sub(".", dom))
    return {e for e in map(clean, found) if e}


def has_no_transfer_notice(page_html):
    return bool(NO_TRANSFER_RE.search(html.unescape(TAG_RE.sub(" ", page_html))))


def same_site_links(page_html, base_url):
    """Links on the same host that look like contact/about/privacy pages."""
    host = urllib.parse.urlsplit(base_url).hostname
    out = []
    for href in HREF_RE.findall(page_html):
        url = urllib.parse.urljoin(base_url, href)
        parts = urllib.parse.urlsplit(url)
        if parts.scheme in ("http", "https") and parts.hostname == host and \
                any(h in parts.path.lower() for h in LINK_HINTS):
            url = parts._replace(fragment="", query="").geturl()
            if url not in out:
                out.append(url)
    return out


def classify(email, site_domain):
    dom = email.rsplit("@", 1)[1]
    local = email.split("@")[0]
    return {
        "is_free": dom in FREE_DOMAINS,
        "is_role": local in ROLE_PREFIXES,
        "on_site": bool(site_domain) and (dom == site_domain or dom.endswith("." + site_domain)),
    }


def rank(email, site_domain):
    """Lower is better: personal on-domain, role on-domain, free mailbox, anything else."""
    c = classify(email, site_domain)
    if c["on_site"]:
        return 1 if c["is_role"] else 0
    return 2 if c["is_free"] else 3
