#!/usr/bin/env python3
"""Small Smartlead API client for the autopilot runs.

Reads SMARTLEAD_API_KEY and GW_SENDER_NAME from the environment only. Never prints the key.
Usage:
  python3 smartlead.py check
  python3 smartlead.py stats
  python3 smartlead.py replies [days]      # threads whose newest message is an unanswered REPLY
  python3 smartlead.py reply CAMPAIGN_ID EMAIL_STATS_ID REPLY_MESSAGE_ID REPLY_TIME BODY_FILE [--dry-run]
  python3 smartlead.py unsubscribe CAMPAIGN_ID LEAD_ID
  python3 smartlead.py block EMAIL
  python3 smartlead.py pause CAMPAIGN_ID
Endpoints follow https://api.smartlead.ai/reference (v1). Verify field names on the first live run.

`replies` output, per thread: campaign_id, lead_id, lead{...}, and `answer_with`
{email_stats_id, reply_message_id, reply_time} taken from the newest REPLY in
message-history (fields stats_id, message_id, time), ready to pass to `reply`.
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://server.smartlead.ai/api/v1"
def _key():
    k = os.environ.get("SMARTLEAD_API_KEY")
    if k:
        return k.strip()
    try:  # on Cyrus's Mac: a private file he creates himself, never in a repo or project folder
        return open(os.path.expanduser("~/.config/groundwork/smartlead_key")).read().strip() or None
    except OSError:
        return None


KEY = _key()
HERE = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(HERE, "log")
PROCESSED = os.path.join(LOG_DIR, "processed.json")
OPT_OUT = re.compile(r"(unsubscribe|opt out|opt-out|reply ['\"]?stop|not interested.{0,40}let me know)", re.I)


class ApiError(Exception):
    pass


def call(method, path, params=None, body=None):
    if not KEY:
        sys.exit("SMARTLEAD_API_KEY is not set in this environment.")
    q = dict(params or {}, api_key=KEY)
    url = f"{BASE}{path}?{urllib.parse.urlencode(q)}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2 ** (attempt + 1)); continue
            raise ApiError(f"{method} {path} -> HTTP {e.code}: {e.read()[:300].decode(errors='replace')}")
        except urllib.error.URLError as e:
            if attempt < 3:
                time.sleep(2 ** (attempt + 1)); continue
            raise ApiError(f"{method} {path} -> {e.reason}")


def log(action, **fields):
    os.makedirs(LOG_DIR, exist_ok=True)
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with open(os.path.join(LOG_DIR, f"{day}.md"), "a") as f:
        f.write(f"- {datetime.now(timezone.utc).strftime('%H:%M')}Z {action} {json.dumps(fields)}\n")


def processed():
    try:
        return set(json.load(open(PROCESSED)))
    except (OSError, ValueError):
        return set()


def mark_processed(msg_id):
    ids = processed() | {msg_id}
    os.makedirs(LOG_DIR, exist_ok=True)
    json.dump(sorted(ids), open(PROCESSED, "w"), indent=0)


def ts(m):
    t = m.get("time") or m.get("sent_time") or ""
    try:
        d = datetime.fromisoformat(t.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def campaigns():
    return call("GET", "/campaigns") or []


def cmd_check():
    cs = campaigns()
    print(f"{len(cs)} campaigns")
    for c in cs:
        print(f"  {c['id']:>8}  {c.get('status',''):<10} {c.get('name','')}")
    accts = call("GET", "/email-accounts", {"offset": 0, "limit": 100}) or []
    print(f"{len(accts)} mailboxes")
    for a in accts:
        print(f"  {a.get('from_email','')}  from_name={a.get('from_name')}  daily_limit={a.get('message_per_day')}")


def cmd_stats():
    # No spam-complaint count here: that stop line is checked by hand (see README).
    for c in campaigns():
        try:
            a = call("GET", f"/campaigns/{c['id']}/analytics") or {}
        except ApiError as e:
            log("stats_error", campaign=c["id"], error=str(e)); continue
        print(json.dumps({"id": c["id"], "name": c.get("name"), "status": c.get("status"),
                          **{k: a.get(k) for k in ("sent_count", "unique_sent_count", "reply_count",
                                                   "bounce_count", "unsubscribed_count")}}))


def replied_leads(cid):
    """Lead ids with a reply, from campaign statistics (one row per sent email)."""
    off, ids = 0, {}
    while True:
        page = call("GET", f"/campaigns/{cid}/statistics", {"offset": off, "limit": 100}) or {}
        rows = page.get("data", [])
        for r in rows:
            if r.get("reply_time") and r.get("lead_id"):
                ids[r["lead_id"]] = r
        off += 100
        if len(rows) < 100:
            return ids


def cmd_replies(days="1"):
    since = datetime.now(timezone.utc) - timedelta(days=int(days))
    done, out = processed(), []
    for c in campaigns():
        try:
            leads = replied_leads(c["id"])
        except ApiError as e:
            log("replies_error", campaign=c["id"], error=str(e)); continue
        for lead_id, row in leads.items():
            try:
                hist = call("GET", f"/campaigns/{c['id']}/leads/{lead_id}/message-history") or {}
            except ApiError as e:
                log("history_error", campaign=c["id"], lead=lead_id, error=str(e)); continue
            msgs = sorted((m for m in hist.get("history", []) if ts(m)), key=ts)
            if not msgs or msgs[-1].get("type") != "REPLY":
                continue  # newest message is ours: already answered
            last = msgs[-1]
            if ts(last) < since or last.get("message_id") in done:
                continue
            out.append({"campaign_id": c["id"], "campaign": c.get("name"), "lead_id": lead_id,
                        "lead": {k: row.get(k) for k in ("lead_email", "lead_name", "company_name")},
                        "answer_with": {"email_stats_id": last.get("stats_id"),
                                        "reply_message_id": last.get("message_id"),
                                        "reply_time": last.get("time")},
                        "thread": [{k: m.get(k) for k in ("type", "time", "subject", "email_body")} for m in msgs]})
    print(json.dumps(out, indent=1))


def sender():
    """GW_SENDER_NAME / GW_POSTAL_ADDRESS from env, else autopilot/sender.json (not secret)."""
    try:
        cfg = json.load(open(os.path.join(HERE, "sender.json")))
    except (OSError, ValueError):
        cfg = {}
    return (os.environ.get("GW_SENDER_NAME") or cfg.get("sender_name") or "").strip(), \
           (os.environ.get("GW_POSTAL_ADDRESS") or cfg.get("postal_address") or "").strip()


def guard(body):
    problems = []
    name, postal = sender()
    if re.search(r"\{[^{}\n]*\}", body):
        problems.append("unfilled {placeholder}")
    if not OPT_OUT.search(body):
        problems.append("no opt-out line")
    if not name:
        problems.append("GW_SENDER_NAME not set")
    elif name not in body:
        problems.append(f"not signed by {name}")
    if not postal:
        problems.append("GW_POSTAL_ADDRESS not set")
    elif postal not in body:
        problems.append("postal address missing")
    return problems


def cmd_reply(cid, stats_id, msg_id, msg_time, body_file, *flags):
    body = open(body_file).read()
    problems = guard(body)
    if msg_id in processed():
        problems.append(f"message {msg_id} already answered")
    if problems:
        log("reply_refused", campaign=cid, message_id=msg_id, problems=problems)
        sys.exit("REFUSED: " + "; ".join(problems))
    if "--dry-run" in flags:
        print("OK (dry run, nothing sent)"); return
    res = call("POST", f"/campaigns/{cid}/reply-email-thread", body={
        "email_stats_id": stats_id, "email_body": body,
        "reply_message_id": msg_id, "reply_email_time": msg_time})
    mark_processed(msg_id)
    log("reply_sent", campaign=cid, message_id=msg_id)
    print(res)


def cmd_unsubscribe(cid, lead_id):
    print(call("POST", f"/campaigns/{cid}/leads/{lead_id}/unsubscribe"))
    log("unsubscribed", campaign=cid, lead=lead_id)


def cmd_block(email):
    print(call("POST", "/leads/add-domain-block-list", body={"domain_block_list": [email]}))
    log("blocked", email=email)


def cmd_pause(cid):
    print(call("POST", f"/campaigns/{cid}/status", body={"status": "PAUSED"}))
    log("paused", campaign=cid)


if __name__ == "__main__":
    cmds = {"check": cmd_check, "stats": cmd_stats, "replies": cmd_replies, "reply": cmd_reply,
            "unsubscribe": cmd_unsubscribe, "block": cmd_block, "pause": cmd_pause}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    try:
        cmds[sys.argv[1]](*sys.argv[2:])
    except ApiError as e:
        log("api_error", command=sys.argv[1], error=str(e))
        sys.exit(str(e))
