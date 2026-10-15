# Final price list (approved by the team lead)

2026-10-03. Sources: proposal-01-pricing-and-offers.md and proposal-02-niche-offers.md, verdicts in strategy/decisions.md.
On 2026-10-03 at 08:08Z, Cyrus told the CEO thread to "approve pricing yourself", so the team lead's verdicts make this the final price list. Copy and code in GWAGENCY can use it. Live deploys and live sends still wait for Cyrus. The guarantee also needs the per-client tracking, and Rank needs the 3-to-5-client pilot first.

## Prices
| Item | Price | Status |
|---|---|---|
| Build | $99 to start (refunded if they decline the preview), $300 on approval | Live today, unchanged |
| Build after the founding 25 | $499 total | Approved |
| Host | $99/mo | Live, unchanged |
| Grow (default pitch) | $199/mo | Live, unchanged |
| Rank (site + local SEO) | $299/mo for founding clients, $349 after | Approved for a **pilot with 3 to 5 clients first**; not on the site or in scripts until real hours are logged. If Rank takes over 2 hours/month per client, it goes to $349 early. |
| Annual prepay | 12 months for the price of 10 | Approved (playbook) |
| Founding wave | Capped at 25 paying clients; founding clients keep their rate | Approved (playbook) |

## Offers
**Results guarantee (approved with changes).** Wording: "At least one customer call or booking request from your site in 60 days, or your $300 back."
Conditions: site live, linked from their Google Business Profile, content delivered on time, one claim per client.
Tracking now exists (developer thread, 2026-10-03): per site and per day range, the template counts visits, call-button taps, text-button taps, booking clicks and quote-request form submissions. It can't count calls dialed from Google Maps or typed in by hand. **Approved wording (team lead, 2026-10-03):** "At least one call, text or quote request started from your site in 60 days, or your $300 back." The terms define "started" as a tracked tap on the site's call or text button, a booking click, or a submitted quote form.
For lawn care, and exterior cleaning in northern states, sites that go live between November 1 and February 28 start the 60 days on March 1 (proposal 02, Go).

**Switch offer (approved with changes, lower priority).** For shops paying another agency: keep the refundable $99 start, waive the $300 and the first month. Target shops near their contract renewal. Never name competitors in outreach.

**Not approved:** $0 setup with a 12-month commitment. Revisit after 25 clients with churn data.

## Live-site promises
Founding rate, $99 refund and 30-day exit are all unchanged. The guarantee is a new promise and needs Cyrus's sign-off on the exact wording above.

## Prerequisite found 2026-10-03: monthly billing isn't set up
In cyrusw17/offer1 `public/assets/js/config.js` (main), `stripe.grow` and `stripe.host` are empty strings. Only the $99 build link exists, so there is no way to collect the $300 and start the monthly plan at approval.

**Do not fill `stripe.grow` / `stripe.host`.** `public/assets/ds/site.js:145` uses `GW.stripe[plan] || GW.stripe.build`, so a monthly link there would replace the $99 start on /start/ and break "$99 today", "the monthly waits until you go live" and "the $99 comes back". (Verified by the team lead and the pricing thread.)

**What Cyrus needs to create instead (money action, via the team lead), sent by email only and never put on the site:**
- "Go live: Grow": $300 one-time + $199/mo (first charge $499)
- "Go live: Host": $300 one-time + $99/mo (first charge $399)
- Stripe customer portal on, cancellations at period end. Allow switching between Host and Grow too, since the site promises "switch any month".

- "Go live: Host annual": $300 + $990/yr, and "Go live: Grow annual": $300 + $1,990/yr (moved into the first batch so lawn care can pitch annual first; team lead, 2026-10-03)

The Rank link comes later, after the Rank pilot.

**How the $300 + first month is collected until those links exist:**
- **Trigger:** the first $99 start lands in Stripe. From then on, every client follows this path until the go-live links are created.
- **At approval:** Cyrus creates the Host or Grow subscription in the Stripe dashboard with "Site approval $300" as a one-time item on its first invoice. Stripe emails one invoice: $499 for Grow or $399 for Host. Annual is $300 + $1,990 (Grow) or $300 + $990 (Host). After that the plan bills itself.
- **The site goes live when that invoice is paid.** Details are in sales-ops/payment-path.md step 2 and onboarding.md E5.
- When the go-live Payment Links exist, they replace this path for new clients. Setup details: sales-ops/payment-path.md.

## Lifetime value, for context
At 3% monthly churn a client stays about 33 months: Grow is worth about $6,600 gross and Rank at $299 about $9,900. At 5% churn it's about 20 months ($4,000 and $6,000). That's why the annual prepay and the monthly results text matter more than shaving the price.

## New niches (proposal 02, team lead Go, 2026-10-03)
Exterior cleaning and lawn care use the same prices and structure as detailing. In lawn care, pitch annual first and keep monthly available; no winter pause. Tiny mow-and-go crews fit Host, not Grow. Demo package prices: demo-sample-packages.md.

## Changes logged by the team lead (2026-10-03, 08:11Z)
1. **Case-study consent:** the first 10 clients get the founding rate in exchange for written consent to use their real results and review as a case study. Clients 11 to 25 keep the founding rate without that condition (the founding cap of 25 is unchanged). Real results only, never invented (FTC rule).
2. **Parked, with triggers:** Rank and the switch offer start after client 3. The guarantee starts once tracking is live on client sites. Until then, quote only the live offer.
3. **Payment until Stripe go-live links exist:** collect the $300 and the first month at approval with a manual Stripe invoice.
