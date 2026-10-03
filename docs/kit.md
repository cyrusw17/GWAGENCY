# GroundWork Detailer Kit

Same bones, different skin. Every demo and client site loads `kit.css` and overrides the `--k-*` tokens in a small `<style>` block.

## Clone a demo for a client (target: ~1 day)

1. Copy `offer1/public/demos/bayou-shine/` (dark) or `offer1/public/demos/lone-star-mobile/` (light) to the client's folder.
2. Replace the `--k-*` tokens with the client's colors. Keep `--k-accent` for CTAs only.
3. Swap copy: shop name, cities, services, packages + prices, reviews (pull from Google), hours, phone.
4. Replace the `.k-art` and `.k-gallery` CSS placeholders with `<img>` tags of their real work.
5. **Remove the `.gw-bar` chrome** — it's for demos only.
6. Replace the `<form class="k-embed">` demo widget with the real booking embed (see below).
7. Update `<title>`, meta description, and remove `noindex`.

## Booking embeds

| Tool | How |
|------|-----|
| Square Appointments | Dashboard → Online Booking → Embed → copy the `<iframe>` or button snippet into `#book`. |
| Booksy | Business profile → Marketing → Booksy widget → embed code. |
| Google (Appointment Schedules) | Calendar → schedule → Share → Embed code. |
| Calendly | Event → Share → Embed inline. |

Keep the sticky mobile bar's **Book now** pointing at `#book` so the thumb path stays one tap.

## Sections (order is intentional)

Hero → Services → Packages (prices shown) → Gallery → Reviews → Book (+ service areas) → FAQ → Footer, plus a sticky Call/Text + Book bar on mobile.
