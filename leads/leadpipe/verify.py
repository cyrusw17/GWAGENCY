"""Email verification through Reoon (power mode) or MillionVerifier.

Statuses are normalized to: valid, catch_all, invalid, unknown, plus suppressed and
off_domain (neither is sent to a provider). Only `valid` is exported for sending.
"""
import json
import os
import urllib.parse
from collections import Counter

from . import extract, http, store

REOON = {
    "safe": "valid", "role_account": "valid",
    "catch_all": "catch_all",
    "invalid": "invalid", "disabled": "invalid", "disposable": "invalid", "spamtrap": "invalid",
    "inbox_full": "invalid",
    "unknown": "unknown",
}
MILLIONVERIFIER = {
    "ok": "valid", "catch_all": "catch_all",
    "invalid": "invalid", "disposable": "invalid",
    "unknown": "unknown", "unverified": "unknown",
}


def check_reoon(email, key, get=http.get_json):
    q = urllib.parse.urlencode({"email": email, "key": key, "mode": "power"})
    res = get(f"https://emailverifier.reoon.com/api/v1/verify?{q}", timeout=60)
    if res.get("status") not in REOON:
        raise RuntimeError(f"Reoon: unexpected reply {str(res)[:200]}")
    return REOON[res["status"]], res


def check_millionverifier(email, key, get=http.get_json):
    q = urllib.parse.urlencode({"api": key, "email": email, "timeout": 20})
    res = get(f"https://api.millionverifier.com/api/v3/?{q}", timeout=40)
    if res.get("error"):
        raise RuntimeError(f"MillionVerifier: {res['error']}")
    return MILLIONVERIFIER.get(res.get("result"), "unknown"), res


PROVIDERS = {
    "reoon": (check_reoon, "REOON_API_KEY"),
    "millionverifier": (check_millionverifier, "MILLIONVERIFIER_API_KEY"),
}


def run(db, niche, provider, max_checks, check=None, sample_only=False):
    fn, env = PROVIDERS[provider]
    key = os.environ.get(env)
    if not key and check is None:
        raise SystemExit(f"Set {env} to verify with {provider}.")
    check = check or (lambda e: fn(e, key))
    rows = db.execute(
        f"""SELECT DISTINCT e.email, e.domain FROM emails e JOIN places p ON p.domain = e.domain
           WHERE p.niche = ? AND e.verify_status IS NULL
           {"AND p.place_id IN (SELECT place_id FROM sample WHERE niche = p.niche)" if sample_only else ""}
           LIMIT ?""", (niche, max_checks)).fetchall()
    counts = Counter()
    for row in rows:
        email = row["email"]
        if store.is_suppressed(db, email=email, domain=email.rsplit("@", 1)[1]):
            status, raw, used = "suppressed", {}, None
        elif extract.rank(email, row["domain"]) is None:
            status, raw, used = "off_domain", {}, None  # never exported, so don't pay to verify it
        else:
            status, raw = check(email)
            used = provider
        raw = {k: v for k, v in raw.items() if k not in ("credits", "api", "key")}
        db.execute("UPDATE emails SET verify_status=?, verify_provider=?, verify_raw=?, verified_at=? WHERE email=?",
                   (status, used, json.dumps(raw)[:2000], store.now(), email))
        db.commit()
        counts[status] += 1
    return dict(counts)
