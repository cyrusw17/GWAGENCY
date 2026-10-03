"""Small stdlib HTTP helpers with retries. Honors HTTPS_PROXY and SSL_CERT_FILE."""
import ipaddress
import json
import socket
import time
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = "GroundWorkLeadBot/1.0 (+https://groundwork-web.com)"
RETRY_CODES = {429, 500, 502, 503, 504}


class HttpError(Exception):
    def __init__(self, status, body=""):
        super().__init__(f"HTTP {status}: {body[:200]}")
        self.status = status


class UnsafeUrl(Exception):
    pass


def check_public(url):
    """Refuse non-http(s) URLs and hosts resolving to private, loopback or link-local addresses.

    Website links come from public listings, so a listing could point the crawler
    at a cloud metadata endpoint or the operator's own network.
    """
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise UnsafeUrl(url)
    try:
        infos = socket.getaddrinfo(parts.hostname, parts.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise UnsafeUrl(f"{parts.hostname}: {e}") from None
    for info in infos:
        if not ipaddress.ip_address(info[4][0].split("%")[0]).is_global:
            raise UnsafeUrl(f"{parts.hostname} resolves to a non-public address")


class _PublicRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_public(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_public_opener = urllib.request.build_opener(_PublicRedirects)


def request(url, method="GET", headers=None, data=None, timeout=20, retries=3, max_bytes=2_000_000,
            public_only=False):
    """Return (status, final_url, content_type, body_text). Raises HttpError on non-2xx.

    public_only checks the URL and every redirect with check_public (used for crawling).
    """
    hdrs = {"User-Agent": USER_AGENT}
    hdrs.update(headers or {})
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        hdrs.setdefault("Content-Type", "application/json")
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
        if public_only:
            check_public(url)
        opener = _public_opener if public_only else urllib.request.build_opener()
        try:
            with opener.open(req, timeout=timeout) as resp:
                raw = resp.read(max_bytes)
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.status, resp.geturl(), resp.headers.get_content_type(), raw.decode(charset, "replace")
        except urllib.error.HTTPError as e:
            if e.code in RETRY_CODES and attempt < retries:
                time.sleep(2 ** (attempt + 1))
                continue
            raise HttpError(e.code, e.read(2000).decode("utf-8", "replace")) from None


def get_json(url, **kw):
    return json.loads(request(url, **kw)[3])


def post_json(url, data, **kw):
    return json.loads(request(url, method="POST", data=data, **kw)[3])
