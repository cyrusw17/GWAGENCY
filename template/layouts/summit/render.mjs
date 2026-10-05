// Layout "summit": a classic agent website, the kind buyers expect. A full-width photo header with
// the agent's name and a search over her listings, then the agent herself (photo and story) before
// the houses: featured listings with a working filter, neighborhoods as photo tiles, a home value
// band over a photo, reviews, the request form, FAQ and the agent footer.
// search.js only adds behavior; without it every listing shows and the search is hidden.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["search.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, h = s.hero || {}, ab = s.about || {}, L = s.listings || {}, nb = s.hoods || {}, v = s.value || {};
  const areas = [...new Set((L.items || []).map(x => x.area))];
  const nav = [["#about", "About"], ["#listings", "Listings"], ["#hoods", "Neighborhoods"], ["#value", "Home value"], ["#reviews", "Reviews"]];

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><span class="mono">${esc(b.monogram || "")}</span><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([x, t]) => `<a href="${x}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", k.phone, "top-phone")}${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <img class="hero-bg" src="${url(h.img)}" alt="" width="2400" height="1350" fetchpriority="high" decoding="async">
  <div class="wrap hero-in">
    <p class="eyebrow">${esc(h.eyebrow || "")}</p>
    <h1 id="h1">${esc(h.headline)}</h1>
    <p class="lede">${esc(h.sub)}</p>
    <form class="search" data-search role="search" aria-label="Search ${esc(b.name)}'s listings">
      <label><span>Neighborhood</span><select name="area"><option value="">Any</option>${areas.map(a => `<option>${esc(a)}</option>`).join("")}</select></label>
      <label><span>Max price</span><select name="max"><option value="">Any</option>${(L.prices || []).map(p => `<option value="${p}">${usd(p)}</option>`).join("")}</select></label>
      <label><span>Beds</span><select name="beds"><option value="">Any</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
      <button class="btn btn-go" type="submit">Search homes</button>
    </form>
    <div class="ctas">${k.book("hero", k.bookLabel, "btn btn-go")}${k.call("hero", `Call ${esc(k.phone)}`, "btn btn-ghost")}</div>
  </div>
  <p class="credit-line">${esc(h.credit || "")}</p>
</section>

<section class="strip" aria-label="At a glance"><dl class="wrap strip-in">${(s.stats || []).map(([n, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}</dd></div>`).join("")}</dl>${when(k.demo, '<p class="wrap fine">Sample numbers for this demo.</p>')}</section>

<section class="about" id="about" aria-labelledby="about-h">
  <div class="wrap about-in">
    <figure class="about-pic"><img src="${url(ab.img)}" alt="${esc(ab.alt || "")}" width="900" height="1100" loading="lazy" decoding="async">${when(ab.credit, `<figcaption>${esc(ab.credit)}</figcaption>`)}</figure>
    <div>
      <p class="eyebrow dark">${esc(ab.eyebrow || "")}</p>
      <h2 id="about-h">${esc(ab.headline || "")}</h2>
      ${(ab.story || []).map(p => `<p>${esc(p)}</p>`).join("")}
      <ul class="creds">${(ab.creds || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${k.book("about", ab.cta || "Get in touch", "btn btn-line")}
      ${k.rating("rating")}
    </div>
  </div>
</section>

<section class="listings wrap" id="listings" aria-labelledby="list-h">
  <div class="sec-head"><h2 id="list-h">${esc(L.headline || "Featured listings")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2><p class="count" data-count aria-live="polite"></p></div>
  <ul class="cards">${(L.items || []).map(x => `<li class="card" data-area="${esc(x.area)}" data-price="${x.price}" data-beds="${x.beds}">
    <div class="card-pic"><img src="${url(x.img)}" alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><span class="badge">${esc(x.status)}</span></div>
    <div class="card-body"><p class="price">${usd(x.price)}</p><h3>${esc(x.street)}</h3><p class="where">${esc(x.area)}, ${esc(b.address?.city || "")}</p>
    <p class="facts"><span>${x.beds} bd</span><span>${esc(String(x.baths))} ba</span><span>${Number(x.sqft).toLocaleString("en-US")} sq ft</span></p>
    ${k.book(x.street, "Ask about this home", "card-link")}</div></li>`).join("")}</ul>
  <p class="none" data-none hidden>No listings match. ${k.book("no match", "Tell me what you're looking for", "alt-link")} and I'll send homes before they hit the big sites.</p>
  <p class="fine">${esc(L.fine || "")}</p>
</section>

<section class="hoods" id="hoods" aria-labelledby="hoods-h">
  <div class="wrap">
    <h2 id="hoods-h">${esc(nb.headline || "")}</h2>
    <p class="sub">${esc(nb.sub || "")}</p>
    <ul class="tiles">${(nb.items || []).map(x => `<li><img src="${url(x.img)}" alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><div><h3>${esc(x.name)}</h3><p>${esc(x.line)}</p></div></li>`).join("")}</ul>
  </div>
</section>

<section class="value" id="value" aria-labelledby="value-h">
  <img class="value-bg" src="${url(v.img)}" alt="" width="2000" height="1200" loading="lazy" decoding="async">
  <div class="wrap value-in">
    <h2 id="value-h">${esc(v.headline || "")}</h2>
    <p>${esc(v.sub || "")}</p>
    <form class="addr" data-addr><label for="v-addr">Your address</label><div><input id="v-addr" name="addr" autocomplete="street-address" placeholder="1234 Elm St"><button class="btn btn-go" type="submit">${esc(v.cta || "Get my value")}</button></div></form>
  </div>
</section>

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="sec-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy"><h2 id="book-h">${esc(s.booking?.headline || "")}</h2><p>${esc(s.booking?.body || "")}</p><p>Or ${k.call("book section", k.phone, "alt-link")}.</p></div>
    ${agentForm(k, s)}
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec wrap" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">${esc(s.faqHeadline || "Questions")}</h2>${k.faq()}</section>`)}
</main>
${agentFooter(k, s)}
${k.sticky("sticky")}
${k.scripts()}
<script src="search.js" defer></script>
</body>
</html>
`;
}
