#!/usr/bin/env node
// Builds one GroundWork agency landing page per niche (public/<path>/index.html), so a landscaper
// or a pressure washer who clicks from cold email lands on a pitch in their own words.
// Same offer and design system as the homepage; only the trade wording and the demo change.
//   node tools/agency-niche.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const NICHES = [
  {
    path: "exterior-cleaning", demo: "/demos/exterior-wash/", shot: "/assets/img/demo-exterior-wash.png",
    trade: "pressure washing and exterior cleaning", who: "pressure washing and soft washing companies",
    title: "Pressure Washing Website Design | GroundWork-Web",
    h1: ["Pressure washing websites that get ", "jobs booked."],
    lead: "Your prices on the page, a before-and-after slider up top, and a quote form that asks what needs washing. Live in about a week.",
    problem: ["Homeowners want a price before they call.", "They want to see the driveway clean, not read about it. When the site has neither, they text the next company on the map."],
    gets: [
      ["Before-and-after slider", "front and center, built from your own job photos."],
      ["\"What needs washing?\" quote form", ": house, driveway, roof, windows, gutters, in two quick steps."],
      ["Starting prices shown", " for your main services, so tire-kickers sort themselves out."],
      ["Call and text buttons", " stuck to the bottom of every phone screen."],
      ["Service-area section", " with the towns you drive to, so out-of-area requests stop."],
      ["Schema and AI-search setup", " so Google and AI answers can read your services and area."],
    ],
    faq: [
      ["Can customers send photos for a quote?", "Yes. The quote form leads with what needs washing and your ZIP, then their number, so you can text back for photos and a price."],
      ["Do you work with soft washing and window cleaning companies?", "Yes. The site lists whatever you offer: house and roof soft washing, concrete, windows, gutters, decks and fences."],
    ],
  },
  {
    path: "landscaping", demo: "/demos/lawn-care/", shot: "/assets/img/demo-lawn-care.png",
    trade: "lawn care and landscaping", who: "lawn care and landscaping companies",
    title: "Lawn Care and Landscaping Website Design | GroundWork-Web",
    h1: ["Lawn care websites that fill your ", "mowing route."],
    lead: "Weekly mowing and one-time projects each get their own path, with your prices shown and an estimate request in two taps. Live in about a week.",
    problem: ["Homeowners compare three crews in five minutes.", "The one that shows prices, real yards and an easy estimate request gets the text. The one with a Facebook page and no prices doesn't."],
    gets: [
      ["Full-width yard photos", " up top, from your own jobs."],
      ["\"Weekly mowing or a one-time project?\"", " as the first question, so route customers and project leads don't get mixed up."],
      ["Starting prices shown", " for mowing, cleanups and aeration."],
      ["Seasonal offer bar", " you can change by text: spring cleanups, fall aeration, leaf season."],
      ["Call and text buttons", " stuck to the bottom of every phone screen."],
      ["Schema and AI-search setup", " so Google and AI answers can read your services and area."],
    ],
    faq: [
      ["Can it handle both weekly mowing and big projects?", "Yes. The first question splits weekly service from one-time projects, so each request comes to you labeled."],
      ["Can I change the seasonal offer myself?", "On Grow, text us the new offer and we update it. That's part of the 2 to 3 monthly updates."],
    ],
  },
];

const page = n => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(n.title)}</title>
<meta name="description" content="${esc(`Websites for ${n.who}, with prices on the page and a quote form that gets used. $99 today, $300 when you approve, then $99 or $199 a month.`)}">
<meta name="color-scheme" content="light dark">
<link rel="preload" href="/assets/fonts/oswald-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/ds/tokens.css?v=3.1">
<link rel="stylesheet" href="/assets/ds/base.css?v=3.1">
<link rel="stylesheet" href="/assets/ds/components.css?v=3.2">
<link rel="canonical" href="https://groundwork-web.com/${n.path}/">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(n.title)}">
<meta property="og:image" content="https://groundwork-web.com/assets/og.png">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: `Website design for ${n.who}`, provider: { "@id": "https://groundwork-web.com/#business" }, areaServed: { "@type": "Country", name: "United States" }, offers: { "@type": "Offer", price: "399", priceCurrency: "USD", description: "$99 to start, $300 when you approve the preview" } })}</script>
</head>
<body class="has-bar">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" translate="no"><span class="dot" aria-hidden="true"></span>GroundWork-Web</a>
    <nav class="links" id="primary-nav" aria-label="Primary"><a href="${n.demo}">Demo</a><a href="#pricing">Pricing</a><a href="/audit/">Free audit</a></nav>
    <div class="header-end"><a class="btn btn-buy btn-sm" href="/start/?niche=${n.path}">Start now</a><button class="menu-btn" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button></div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="wrap">
    <div>
      <span class="eyebrow">Founding rate. $99 today, $300 when you approve.</span>
      <h1>${esc(n.h1[0])}<em>${esc(n.h1[1])}</em></h1>
      <p class="lead">${esc(n.lead)}</p>
      <dl class="deal">
        <div><dt>$99</dt><dd>today, to start</dd></div>
        <div><dt>$300</dt><dd>when you approve it</dd></div>
        <div><dt>$99 or $199</dt><dd>a month, once it is live</dd></div>
      </dl>
      <div class="ctas">
        <a class="btn btn-buy" href="/start/?niche=${n.path}">Start now<small>$99 today. We start this week.</small></a>
        <a class="btn btn-ghost" href="${n.demo}">See the demo<small>A fictional company, fully working.</small></a>
      </div>
      <p class="trust"><strong>No risk.</strong> You see the site before the $300. Don't want it? The $99 comes back.</p>
    </div>
    <div class="phone-stage">
      <div class="phone"><img class="shot" src="${n.shot}" width="390" height="844" alt="The top of our ${esc(n.trade)} demo site on a phone." decoding="async"></div>
      <p class="demo-cap">Our ${esc(n.trade)} demo. Fictional company, fully working. <a href="${n.demo}">Open it</a>.</p>
    </div>
  </div>
</section>

<section class="cream">
  <div class="wrap">
    <div class="sec-head rv"><span class="eyebrow">Why jobs go to the other company</span><h2>${esc(n.problem[0])}</h2><p class="lead">${esc(n.problem[1])}</p></div>
  </div>
</section>

<section>
  <div class="wrap two-col">
    <div class="rv">
      <span class="eyebrow">What you get for the $399</span>
      <h2 style="margin:16px 0 var(--s4)">A site built for ${esc(n.trade)}.</h2>
      <p class="lead">A homeowner can see your price, pick what they need, and send a quote request in under a minute, or tap to call or text.</p>
      <div class="ctas"><a class="btn btn-buy" href="/start/?niche=${n.path}">Start now<small>$99 today</small></a><a class="btn btn-ghost" href="${n.demo}">Open the demo</a></div>
    </div>
    <ul class="check-list rv">
      ${n.gets.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join("\n      ")}
    </ul>
  </div>
</section>

<section class="price-block" id="pricing">
  <div class="wrap">
    <div class="sec-head rv"><span class="eyebrow">How the money works</span><h2>You pay in two parts. You see the site between them.</h2></div>
    <div class="timeline rv">
      <div class="step"><div class="when">Step 1. Today</div><div class="amt">$99</div><p>Secure Stripe checkout and a short brief: logo, photos, services and prices. We start this week.</p></div>
      <div class="step"><div class="when">Step 2. Private preview</div><div class="amt">Still $99</div><p>Preview link in about a week. One revision. Don't want it? We refund the $99.</p></div>
      <div class="step live"><div class="when">Step 3. Approve and launch</div><div class="amt">$300</div><p>$399 total for the build. We register the domain in your name and go live.</p></div>
    </div>
    <div class="plan-grid two rv" style="margin-top:var(--s6)">
      <div class="plan"><p class="cap">Host</p><h3>Keep the site live</h3><div class="amt">$99<small>/mo</small></div><p class="sub">Starts the month you go live.</p><ul><li>Hosting, SSL, uptime monitoring</li><li>Quote form and booking kept working</li><li>Cancel with 30 days notice</li></ul><a class="btn btn-ghost" href="/start/?plan=host&amp;niche=${n.path}">Start now<span class="sr-only"> on Host</span></a></div>
      <div class="plan featured"><span class="rec">Recommended</span><p class="cap">Grow</p><h3>We keep it selling</h3><div class="amt">$199<small>/mo</small></div><p class="sub">Starts the month you go live.</p><ul><li>Everything in Host</li><li>2 to 3 updates a month: offers, prices, photos</li><li>Monthly Google Business Profile and SEO check-in</li></ul><a class="btn btn-buy" href="/start/?plan=grow&amp;niche=${n.path}">Start now<span class="sr-only"> on Grow</span></a></div>
    </div>
    <p class="price-note"><a href="/before-you-pay/">Preview, refund, and how you leave</a>, spelled out.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head rv"><span class="eyebrow">Honest answers</span><h2>Questions</h2></div>
    <div class="faq">${n.faq.concat([
      ["What if I don't like the site?", "You get one revision on a private preview. If you still don't want it, we refund the $99 and nothing else is charged."],
      ["How long does it take?", "About 7 days from the day we receive your logo, photos, services and prices."],
      ["Who owns the domain?", "You do. We register it in your name when you approve the site."],
    ]).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div>
</section>

<section class="cream" id="contact">
  <div class="wrap">
    <div class="sec-head rv"><span class="eyebrow">Next step</span><h2>Two ways in.</h2><p class="lead">Start now for $99, or <a href="/audit/">book the free 15-minute audit</a> first. Both are fine.</p></div>
    <div class="ctas"><a class="btn btn-buy" href="/start/?niche=${n.path}">Start now</a><a class="btn btn-ghost" href="/audit/">Book the audit</a></div>
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div><div class="logo" translate="no"><span class="dot" aria-hidden="true"></span>GroundWork-Web</div><p>Websites for ${esc(n.who)}, with prices and a quote form that gets used.</p></div>
    <div class="footer-contact"><a href="mailto:groundworkweb@proton.me">groundworkweb@proton.me</a><a href="/before-you-pay/">Preview, refund, and how you leave</a></div>
    <nav class="footer-nav" aria-label="Footer"><a href="/">Home</a><a href="/pricing/">Pricing</a><a href="/audit/">Audit</a><a href="/start/">Start</a><a href="/privacy/">Privacy</a></nav>
    <span class="fine">&copy; <span data-year>2026</span> GroundWork-Web. Deer Park, TX.</span>
  </div>
</footer>

<div class="bar" aria-label="Quick actions"><a class="btn btn-buy" href="/start/?niche=${n.path}">Start now</a><a class="btn btn-ghost" href="${n.demo}">See the demo</a></div>

<script src="/assets/js/config.js?v=3.1"></script>
<script src="/assets/ds/ui.js?v=3.1"></script>
<script src="/assets/ds/site.js?v=3.1"></script>
<script src="/assets/js/analytics.js?v=3.1" defer></script>
</body>
</html>
`;

for (const n of NICHES) {
  const dir = join(root, "public", n.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(n));
  console.log(`  built public/${n.path}/`);
}
