// Layout "music-row": a two-agent team site built from 21st.dev-style blocks, each with a job: a
// full photo header with a glowing-border glass card (a buy / sell switch), a "just sold" ticker,
// the two agents before any houses, an expanding-panel gallery of listings, a before/after
// staging slider, and a bento grid of neighborhoods. row.js only adds behavior; without it the
// card shows both options, the ticker sits still and the slider shows the staged room.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS, photo } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["row.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, h = s.hero || {}, tm = s.team || {}, L = s.listings || {}, ba = s.staging || {}, nb = s.hoods || {};
  const nav = [["#team", "Meet us"], ["#homes", "Homes"], ["#staging", "Selling"], ["#hoods", "Neighborhoods"], ["#faq", "FAQ"]];

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main">${esc(b.name)}<small>${esc(b.tagline || "")}</small></a>
    <nav class="nav" aria-label="Sections">${nav.map(([x, t]) => `<a href="${x}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <img class="hero-bg" ${photo(h.img)} alt="" width="2400" height="1400" fetchpriority="high" decoding="async">
  <div class="wrap hero-in">
    <div class="glow">
      <div class="card">
        <h1 id="h1">${esc(h.headline)}</h1>
        <p class="lede">${esc(h.sub)}</p>
        <div class="seg" role="tablist" aria-label="I'm here to">${["buy", "sell"].map((x, i) => `<button type="button" role="tab" id="tab-${x}" aria-controls="pane-${x}" aria-selected="${i ? "false" : "true"}" data-seg="${x}">${x === "buy" ? "Buy a home" : "Sell my home"}</button>`).join("")}</div>
        <form class="pane" id="pane-buy" role="tabpanel" aria-labelledby="tab-buy" data-pane="buy" action="#homes">
          <label for="h-hood">Neighborhood</label>
          <div class="row"><select id="h-hood" name="hood">${(nb.items || []).map(x => `<option>${esc(x.name)}</option>`).join("")}<option>Anywhere in Nashville</option></select><button class="btn btn-go" type="submit">See homes</button></div>
        </form>
        <form class="pane" id="pane-sell" role="tabpanel" aria-labelledby="tab-sell" data-pane="sell" action="#book">
          <label for="h-addr">Your address</label>
          <div class="row"><input id="h-addr" name="addr" autocomplete="street-address" placeholder="Your street address"><button class="btn btn-go" type="submit">Get my value</button></div>
        </form>
      </div>
    </div>
  </div>
  <p class="photo-credit">${esc(h.credit || "")}</p>
</section>

<section class="ticker" aria-label="Recently sold (sample)"><div class="tick-track">${[0, 1].map(n => `<ul${n ? ' aria-hidden="true"' : ""}>${(s.sold || []).map(x => `<li><b>Sold</b> ${esc(x)}</li>`).join("")}</ul>`).join("")}</div></section>

<section class="team wrap" id="team" aria-labelledby="team-h">
  <div class="team-copy"><p class="kicker">${esc(tm.kicker || "")}</p><h2 id="team-h">${esc(tm.headline || "")}</h2><p class="sub">${esc(tm.sub || "")}</p></div>
  <div class="duo">${(tm.people || []).map(p => `<article class="person"><img src="${url(p.img)}" alt="${esc(p.alt)}" width="800" height="800" loading="lazy"><div><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p>${esc(p.bio)}</p></div></article>`).join("")}</div>
  <p class="fine">${esc(tm.note || "")}</p>
</section>

<section class="homes" id="homes" aria-labelledby="homes-h">
  <div class="wrap"><h2 id="homes-h">${esc(L.headline || "")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2><p class="sub">${esc(L.sub || "")}</p></div>
  <ul class="panels wrap">${(L.items || []).map((x, i) => `<li class="panel${i ? "" : " open"}" tabindex="0" data-hood="${esc(x.hood)}"><img ${photo(x.img, "(min-width:900px) 50vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async">
    <div class="p-body"><p class="p-tag">${esc(x.hood)}</p><p class="p-price">${usd(x.price)}</p><h3>${esc(x.name)}</h3><p class="p-meta">${x.beds} bd · ${esc(String(x.baths))} ba · ${Number(x.sqft).toLocaleString("en-US")} sq ft</p>${k.book(x.name, "Book a showing", "p-link")}</div></li>`).join("")}</ul>
  <p class="wrap fine">${esc(L.fine || "")}</p>
</section>

<section class="staging" id="staging" aria-labelledby="stg-h">
  <div class="wrap stg-in">
    <div><p class="kicker">${esc(ba.kicker || "")}</p><h2 id="stg-h">${esc(ba.headline || "")}</h2><p>${esc(ba.sub || "")}</p><ul class="stg-list">${(ba.points || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>${k.book("staging", ba.cta || "Plan my sale", "btn btn-go")}</div>
    <figure class="ba" data-ba style="--pos:50%">
      <img class="ba-after" ${photo(ba.after, "(min-width:900px) 55vw, 100vw")} alt="${esc(ba.afterAlt || "")}" width="1600" height="1067" loading="lazy" decoding="async">
      <img class="ba-before" ${photo(ba.before, "(min-width:900px) 55vw, 100vw")} alt="${esc(ba.beforeAlt || "")}" width="1600" height="1067" loading="lazy" decoding="async">
      <span class="ba-line" aria-hidden="true"></span><span class="ba-tag l">Before</span><span class="ba-tag r">After</span>
      <label class="ba-range"><span class="sr">Drag to compare before and after</span><input type="range" min="0" max="100" value="50" data-ba-range></label>
      <figcaption class="fine">${esc(ba.fine || "")}</figcaption>
    </figure>
  </div>
</section>

<section class="hoods wrap" id="hoods" aria-labelledby="hoods-h">
  <h2 id="hoods-h">${esc(nb.headline || "")}</h2>
  <ul class="bento">${(nb.items || []).map((x, i) => `<li class="b b${i}"><img ${photo(x.img, "(min-width:900px) 40vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><div><h3>${esc(x.name)}</h3><p>${esc(x.line)}</p></div></li>`).join("")}<li class="b b-stat"><p class="big">${esc(nb.stat?.[0] || "")}</p><p>${esc(nb.stat?.[1] || "")}</p></li></ul>
  <p class="fine">${esc(nb.fine || "")}</p>
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap">
    <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
  </div>
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
<script src="row.js" defer></script>
</body>
</html>
`;
}
