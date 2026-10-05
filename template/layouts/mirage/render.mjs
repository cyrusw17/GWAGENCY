// Layout "mirage": a luxury desert agent site built from 21st.dev-style motion patterns, each one
// doing a job: a slow-zoom photo header with a word-by-word headline, stats that count up, a
// sticky-scroll house story (text scrolls, the photo beside it changes), tilt cards for listings,
// a bento grid of the lifestyle, and reviews on an endless, pausable belt. The agent comes before
// the houses. lux.js only adds motion; without it, and under reduced motion, everything is still.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS, photo } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["lux.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, h = s.hero || {}, me = s.me || {}, st = s.story || {}, L = s.listings || {}, bt = s.bento || {};
  const nav = [["#me", "About"], ["#story", "Inside"], ["#listings", "Listings"], ["#life", "Scottsdale"], ["#reviews", "Reviews"]];
  const words = String(h.headline).split(" ");

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="top-in">
    <a class="logo" href="#main">${esc(b.name)}</a>
    <nav class="nav" aria-label="Sections">${nav.map(([x, t]) => `<a href="${x}">${t}</a>`).join("")}</nav>
    ${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="hero-bg"><img ${photo(h.img)} alt="" width="2400" height="1400" fetchpriority="high" decoding="async"></div>
  <div class="wrap hero-in">
    <p class="kicker">${esc(h.kicker || "")}</p>
    <h1 id="h1" aria-label="${esc(h.headline)}">${words.map((w, i) => `<span class="w" style="--i:${i}" aria-hidden="true">${esc(w)}</span>`).join(" ")}</h1>
    <p class="lede">${esc(h.sub)}</p>
    <div class="ctas">${k.book("hero", k.bookLabel, "btn btn-go")}${k.call("hero", esc(k.phone), "btn btn-ghost")}</div>
  </div>
  <p class="photo-credit">${esc(h.credit || "")}</p>
</section>

<section class="me" id="me" aria-labelledby="me-h">
  <div class="wrap me-in">
    <img class="me-pic" src="${url(me.img)}" alt="${esc(me.alt || "")}" width="800" height="800" loading="lazy">
    <div>
      <p class="kicker dark">${esc(me.kicker || "")}</p>
      <h2 id="me-h">${esc(me.headline || "")}</h2>
      ${(me.story || []).map(p => `<p>${esc(p)}</p>`).join("")}
      <p class="fine">${esc(me.note || "")}</p>
    </div>
  </div>
  <dl class="wrap ticks">${(s.stats || []).map(([n, pre, suf, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(pre || "")}<span data-count="${n}">${esc(String(n))}</span>${esc(suf || "")}</dd></div>`).join("")}</dl>
  ${when(k.demo, '<p class="wrap fine">Sample numbers for this demo.</p>')}
</section>

<section class="story" id="story" aria-labelledby="story-h">
  <div class="wrap">
    <h2 id="story-h">${esc(st.headline || "")}</h2>
    <p class="sub">${esc(st.sub || "")}</p>
    <div class="sticky-wrap">
      <ol class="beats">${(st.beats || []).map((x, i) => `<li data-beat="${i}"${i ? "" : ' class="on"'}><img ${photo(x.img, "(min-width:900px) 1px, 100vw")} alt="${esc(x.alt)}" width="1600" height="1067" loading="lazy" decoding="async" class="beat-pic"><p class="room">${esc(x.room)}</p><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></li>`).join("")}</ol>
      <div class="stage" aria-hidden="true">${(st.beats || []).map((x, i) => `<img ${photo(x.img, "50vw")} alt="" width="1600" height="1067" loading="lazy" decoding="async" data-stage="${i}"${i ? "" : ' class="on"'}>`).join("")}</div>
    </div>
    <p class="fine">${esc(st.fine || "")}</p>
  </div>
</section>

<section class="listings wrap" id="listings" aria-labelledby="list-h">
  <h2 id="list-h">${esc(L.headline || "")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2>
  <ul class="tilts">${(L.items || []).map(x => `<li class="tilt" data-tilt><div class="tilt-in"><img ${photo(x.img, "(min-width:1000px) 380px, (min-width:640px) 50vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><span class="glare" aria-hidden="true"></span>
    <div class="t-body"><p class="t-price">${usd(x.price)}</p><h3>${esc(x.name)}</h3><p class="t-meta">${esc(x.area)} · ${x.beds} bd · ${esc(String(x.baths))} ba · ${Number(x.sqft).toLocaleString("en-US")} sq ft</p>${k.book(x.name, "Request a private showing", "t-link")}</div></div></li>`).join("")}</ul>
  <p class="fine">${esc(L.fine || "")}</p>
</section>

<section class="life" id="life" aria-labelledby="life-h">
  <div class="wrap">
    <h2 id="life-h">${esc(bt.headline || "")}</h2>
    <ul class="bento">${(bt.items || []).map((x, i) => x.img
      ? `<li class="b b${i}"><img ${photo(x.img, "(min-width:900px) 50vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div></li>`
      : `<li class="b b${i} b-text"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></li>`).join("")}</ul>
    <p class="fine">${esc(bt.fine || "")}</p>
  </div>
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  <div class="wrap">${k.reviewNote("sample-note")}</div>
  <div class="belt" data-belt><ul class="belt-track" role="list">${k.reviews().map(x => `<li><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></li>`).join("")}</ul></div>
  <p class="wrap"><button type="button" class="belt-pause" data-belt-pause aria-pressed="false">Pause reviews</button></p>
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
<script src="lux.js" defer></script>
</body>
</html>
`;
}
