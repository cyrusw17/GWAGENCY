# Reply templates by intent

Owner: Sales ops thread. Status: **for the autopilot.** Cyrus asked on 2026-10-15 (Full business autopilot thread) for Claude to send and answer emails and send mockups itself; the team lead approved the autopilot plan the same day, with guardrails in [autopilot/README.md](../autopilot/README.md). Reply rules (Cyrus, project chat, 2026-10-15 06:39Z: "deliver whatever they ask for"): auto-sent are preview requests (1A), a yes (1 or its interim line), price questions (2) and how-it-works questions (3), all from live prices only. Suppressed with no reply: anyone who asks to unsubscribe or says "no thanks" or similar (7, 8). Nothing: out-of-office (13). Refund, payment, angry, legal and AI questions, and anything unclear, are drafted and flagged for Cyrus. Mockups go out only as phone and desktop PNG screenshots, never HTML, code, a zip or a live page link, so they can't be copied. Sign-off and postal address set by Cyrus on 2026-10-15: every reply is signed "GroundWork - Web", with the address on the next line and then the opt-out line. Templates pass marketing, then the consultant, before the first auto-send.

Prices quoted here are the **live** ones only: $99 to start (refunded if they don't want the site), $300 on approval, Host $99/mo, Grow $199/mo, monthly starts the month they go live, leave with 30 days written notice. Rank, the results guarantee, annual prepay and the switch offer stay out of replies until Cyrus approves them (pricing/approved-pricing.md).

## How replies get handled (the lean loop)

1. **Speed.** Answer every human reply within 5 minutes during work hours (team lead's target, 2026-10-03), and first thing next morning otherwise. Reply notifications go to Cyrus's phone so the template can be sent from there. Firms that contacted a lead within an hour were about 7 times as likely to qualify it as firms that waited longer (Harvard Business Review, "The Short Life of Online Sales Leads", 2011); playbook section 2 already makes speed-to-lead a rule.
2. **Label first, then reply.** Every reply gets one label from the table below (the autopilot labels it in Smartlead; an unsure label means draft, not send). The label picks the template.
3. **One click.** Templates are pre-filled with the sequence variables (`{first_name}`, `{shop}`, `{city}`). Cyrus reads, edits one line if needed, sends. Target: under 2 minutes per reply.
4. **Log it.** Update the shop's row in `sales/pipeline.csv` (owned by the cold email specialist): `replied`, `reply_date`, `interested`, `status`.
5. **Stop the sequence** on any reply (already set in the sequence settings). Opt-outs become `do-not-contact` the same day.
6. **A phone number beats an email thread.** If they give a number or sound warm, text or call within 5 minutes. Most detailers answer texts faster than email.

Rules for every reply: plain text, under 80 words, one question or one link, signed "GroundWork - Web". A link is fine now because they wrote back first. Never claim results we can't show, never show demo sites as real clients, and if asked whether AI is involved, answer honestly (template 11).

| # | Label | Example reply | Goal of our answer |
|---|---|---|---|
| 1A | Asks for the preview | "Send me the preview" | Link to the site-check form; screenshots once built |
| 1 | Interested | "Sure, send it" / "Yes, show me" | Send mockup screenshots; start link when they say yes |
| 1B | Not sure / hesitating | "Maybe", "Not sure", a yes with doubts | Offer a short call (fallback) |
| 2 | Price question | "What does it cost?" | Plain prices, their mockup, a call if they want one |
| 3 | How it works / timing | "How long? What do you need from me?" | Steps, their mockup, a call if they want one |
| 4 | Wants a call | "Call me" / sends a number | Call or text within 5 minutes |
| 5 | Has a site / uses Facebook or an app | "I already have a website" | One honest gap, then let go |
| 6 | Not now | "Busy season, maybe later" | Agree a date, set a reminder |
| 7 | Not interested | "No thanks" | No reply, suppress today |
| 8 | Unsubscribe / remove | "Remove me", "stop" | No reply, suppress today |
| 9 | Wrong person / referral | "Talk to my partner" | Ask for the right contact |
| 10 | Who are you / is this spam | "How did you get my email?" | Be plain about the source |
| 11 | Is this AI? | "Did a bot write this?" | Honest answer |
| 12 | Angry / complaint | "This is spam, reporting you" | Apologise once, suppress, no argument |
| 13 | Out of office / auto-reply | Auto-responder | Nothing; let the sequence resume after the return date |
| 14 | Paid the $99 | Stripe notification | Welcome email (onboarding.md, E1) |

---

### 1A. Asks for the preview (auto-send)

> Great, {first_name}. Fill in this short form so I build the right thing for {shop}: https://groundwork-web.com/site-check/?utm_source=email&utm_medium=email&utm_campaign=autopilot
>
> I'll send screenshots of your mockup as soon as it's ready.
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

### 1. Interested

Funnel (Cyrus, 2026-10-04 22:13Z, decisions.md): they reply yes, we send their mockup, and a call comes only if they hesitate (1B). The decision log calls this page their "preview"; in client copy it stays "mockup", so it isn't confused with the paid private preview built after the $99.

> Great, {first_name}. Here's the mockup I made for {shop}, attached as screenshots (phone and desktop).
>
> Have a look on your phone. If you like where it's going, reply yes and I'll send the link to start your real site for $99. You see the finished site before paying the $300, then from $99 a month once it's live. If you don't want it, the $99 comes back.
>
> Questions? Just reply here.
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

Send this once the mockup is built, with the phone and desktop PNG screenshots attached. Never send HTML, code, a zip or a live page link. Screenshots have no buttons, so the line above asks them to reply yes for the start link.

If the mockup isn't built yet, send this interim line instead, then the template above once it is:

> Great, {first_name}. I'm putting {shop}'s mockup together now and will send screenshots as soon as it's ready.
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

### 1B. Not sure / hesitating (call fallback)

Use when they hesitate after the mockup, or answer the first email with doubts. Cyrus takes every Calendly slot for these calls; the call follows [sales-call.md](sales-call.md).

> Fair enough, {first_name}. Easier to talk it through? Grab any time that works and I'll answer whatever's on your mind, no pressure: {calendly_link}
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

### 2. Price question

> Hi {first_name}, straight answer:
>
> - $99 to start. I build the site and send you a private preview.
> - $300 only when you approve it and it goes live. Don't want it? The $99 comes back.
> - Then $199/mo for Grow (everything in Host, plus 2 to 3 updates a month and a monthly Google Business Profile and SEO check-in) or $99/mo for Host (site and booking stay live). Both start the month you go live. Cancel with 30 days written notice.
>
> Screenshots of the mockup I made for {shop} are attached. Reply yes and I'll send the link to start the real site. Rather talk it through first? Grab a time: {calendly_link}
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

### 3. How it works / timing

> Hi {first_name}, after the $99 start you send me your logo, 10 to 20 photos, your services and prices, and the booking tool you use (Square, Booksy, Google, Calendly or similar). I build the site and send a private preview in about a week. You get one round of changes, then you approve and it goes live.
>
> Screenshots of the mockup I made for {shop} are attached. Reply yes and I'll send the link to get things going. Rather talk it through first? Grab a time: {calendly_link}
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

("About a week" matches the live site; the developer thread still confirms it, same as sequence email 3B.)

### 4. Wants a call

Call or text within 5 minutes. If no answer, text:

> Hi {first_name}, it's Cyrus from GroundWork-Web, you asked me to call about {shop}'s website. Is now good, or what time works today?

If they prefer to book: `{calendly_link}`. On the call, follow [sales-call.md](sales-call.md) and text the start link while they're still on the phone (playbook section 4).

### 5. Has a site / uses Facebook or an app

> Fair enough, {first_name}. One thing worth checking: when someone searches "{service} {city}", does your current page show your prices and take a booking request without them having to message you? If it does, you're set. If not, I'm happy to show you what that could look like, no cost to look.
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

If they reply no, stop. If they mention paying another agency, see 5B (parked until client 3).

### 5B. Paying another agency (switch offer): PARKED until client 3

Team lead, 2026-10-03: don't use until we have 3 paying clients. Until then, log `notes = switch lead, renews {month}` and stop. Approved offer (pricing/approved-pricing.md). Never name or knock the other agency.

> Makes sense, {first_name}. If you ever want to compare: I'd build {shop} a new site for the same $99 refundable start, waive the $300, and your first month is free. You'd see your new site before switching anything. When does your current contract renew?
>
> GroundWork - Web
> 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520
> Reply "no thanks" and I won't email again.

Log `notes = switch, renews {month}` and follow up a month before renewal.

### 6. Not now

> No problem, {first_name}. When's a better time, after {month}? I'll check back then and not before.
>
> GroundWork - Web

Set `interested = later` and the date in `notes`. One follow-up on that date, then stop.

### 7. Not interested

> Understood, {first_name}. Thanks for letting me know, I won't email again. Good luck with the season.
>
> GroundWork - Web

Set `status = lost`, `lost_reason = not interested`. Add to suppression. "No thanks" or anything like it is an automatic unsubscribe with no reply (Cyrus, 2026-10-15); the line above is only for Cyrus if he answers one by hand.

### 8. Unsubscribe / remove

No reply. Suppress the same day: Smartlead block list plus `status = do-not-contact` in `sales/pipeline.csv` (CAN-SPAM allows 10 business days; we do it same day). Sending nothing is the safest choice for an unattended system (marketing review 01, 2026-10-15).

### 9. Wrong person / referral

> Thanks, {first_name}. Who's the best person for this, and is it OK if I mention you sent me?
>
> GroundWork - Web

Only email the new person if they give the address. Never guess an address.

### 10. Who are you / is this spam

> Fair question. I'm Cyrus, I run GroundWork-Web, a small shop{location} that builds sites for {niche_plural}. I found {shop} on Google Maps and your email on {source}. If you'd rather not hear from me, say so and I'll remove you.
>
> GroundWork - Web

`{niche_plural}` is the niche in plain words ("detailers", "pressure washing companies", "landscapers"). `{location}` is " in Houston, Texas", which matches the footer's postal address (Cyrus, 2026-10-15). `{source}` comes from the `email_source` column in `sales/pipeline.csv`, the true source logged with the contact (their website, Facebook page, Google listing). If we don't know the source for that contact, say "a business listing" and flag it to the cold email specialist.

### 11. Is this AI?

> I use software to help find shops and draft emails, and I read every reply myself. I build and check every site.

Stays true whether or not auto-send is approved. Before use, the developer thread confirms "I build and check every site" matches how sites are actually built; adjust to what is true at the time. Never deny it (automatic No-go, playbook section 6).

### 12. Angry / complaint

> Sorry about that, {first_name}. You're removed and won't hear from me again.
>
> GroundWork - Web

Suppress today, tag `notes = complaint`, and tell the cold email specialist the inbox and domain so they can watch complaint rates.

### 13. Out of office

No reply. Smartlead resumes the sequence after the return date.

### 14. Paid the $99

Send the welcome email from [onboarding.md](onboarding.md) (E1) within 1 business hour.

---

## Placeholders still needed before use
- `{calendly_link}`: use the existing `https://calendly.com/cyruswilburn2005/30min` as is (Cyrus set Calendly changes aside, 2026-10-03). Replies don't promise a length, so the 30-minute slot is fine; the 15-minute mismatch is only on the site's audit copy.
- `{source}`: the `email_source` column in `sales/pipeline.csv`.
- Postal address (filled in, Cyrus 2026-10-15): 3120 Southwest Fwy Ste 101 PMB 963882, Houston, Texas 77098-4520. Commercial replies (1 and its interim line, 1B, 2, 3, 5) carry the footer; closes (7, 12) don't, and unsubscribes (8) get no reply.
