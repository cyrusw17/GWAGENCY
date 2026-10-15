# Email autopilot (runs on Cyrus's Mac)

Copy this folder to ~/Desktop/business/autopilot. Key: ~/.config/groundwork/smartlead_key (Cyrus creates it; never print, copy or commit it). Sender name and postal address go in autopilot/sender.json ({"sender_name": "...", "postal_address": "..."}) once Cyrus gives them. Logs stay in autopilot/log/ on the Mac and are never committed (they name leads).

## Each run
1. `python3 autopilot/smartlead.py check`. If the key is missing, stop and do nothing.
2. Read new replies (`smartlead.py replies 1`) and label each by intent using reply-templates.md.
3. Answer only the safe intents (table below) with `smartlead.py reply`; every action is logged to autopilot/log/YYYY-MM-DD.md.
4. `smartlead.py stats`; pause a campaign that crosses a stop line.
5. Finish with a summary of at most 8 lines: replies answered, replies waiting for Cyrus (company and what they asked), campaigns paused and why. The afternoon run adds the day's send, reply and bounce totals.

## Guardrails
- Never raise Smartlead's per-mailbox daily limits. New leads: at most 100 a day, only gap_confirmed=yes AND Reoon valid/safe.
- Stop lines: pause a campaign at bounces over 3%, unsubscribes over 1%, or spam complaints at 0.3% or more (complaints checked by hand weekly in Google Postmaster Tools).
- Nothing sends until sender.json has Cyrus's real name and the postal address. `reply` enforces this and refuses otherwise.
- Only the approved templates, plain text. Never change pricing, promise anything outside approved-pricing.md (Rank, guarantee, annual, switch offer are not quotable yet), claim a mockup exists before it is built, buy anything, deploy a website, or email anyone outside a Smartlead thread. Never start or resume a campaign without Cyrus's say-so.

| Reply intent | Autopilot does |
|---|---|
| Clean yes only (no question attached) | Template 1 only if mockup_url returns HTTP 200; otherwise the interim line |
| Unsubscribe / not interested | No reply. Same day: `unsubscribe CAMPAIGN_ID LEAD_ID`, then `block EMAIL` |
| Mixed intent ("yes, how much?") or unsure | Draft and flag |
| Out of office / auto-reply | Nothing |
| Price question, objection, refund | Draft and flag, never auto-send |
| Wants a call | Flag Cyrus |
| Angry, legal, payment, anything unclear | Draft, do NOT send, flag |

## Script safety
- `replies` returns only threads whose newest message is an unanswered REPLY and skips ids in log/processed.json; `reply` refuses any id already there.
- `reply` exits 1 if the body has a {placeholder}, no opt-out line, isn't signed with the sender name, or lacks the postal address. `--dry-run` checks without sending.
- answer_with.email_stats_id = history stats_id, reply_message_id = message_id, reply_time = time of the newest REPLY.
