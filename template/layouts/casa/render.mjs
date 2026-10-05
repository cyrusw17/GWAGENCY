// Layout "casa": a warm husband-and-wife team site. A full-width photo slideshow header (with a
// pause button) and a home value card on top of it, then the two of them before any houses, a
// listings grid with For sale / Sold tabs, a photo band from inside their listings, how a sale
// runs, reviews, the request form, FAQ and footer.
// slides.js only adds behavior; without it the first photo shows and every listing shows.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS, photo } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["slides.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, h = s.hero || {}, tm = s.team || {}, L = s.listings || {}, ins = s.inside || {}, pr = s.process || {};
  const nav = [["#team", "Meet us"], ["#homes", "Homes"], ["#process", "Selling"], ["#reviews", "Reviews"], ["#faq", "FAQ"]];

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
  <div class="slides" data-slides>${(h.slides || []).map((x, i) => `<figure class="slide${i ? "" : " on"}"><img ${i ? photo(x.img).replace(/(src|srcset)=/g, "data-$1=") : photo(x.img)} alt="${esc(x.alt)}" width="2400" height="1400" ${i ? "" : 'fetchpriority="high"'} decoding="async"><figcaption>${esc(x.cap || "")}</figcaption></figure>`).join("")}</div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <h1 id="h1">${esc(h.headline)}</h1>
      <p class="lede">${esc(h.sub)}</p>
      <div class="ctas">${k.book("hero", k.bookLabel, "btn btn-go")}${k.text("hero", "Text us", "btn btn-ghost")}</div>
    </div>
    <form class="worth" data-worth aria-labelledby="worth-h">
      <h2 id="worth-h">${esc(h.worth?.headline || "What's my home worth?")}</h2>
      <p>${esc(h.worth?.sub || "")}</p>
      <label for="w-addr">Home address</label>
      <input id="w-addr" name="addr" autocomplete="street-address" placeholder="1234 Oak St">
      <button class="btn btn-go" type="submit">${esc(h.worth?.cta || "Get my home value")}</button>
    </form>
  </div>
  <div class="slide-ctl wrap"><button type="button" class="pause" data-pause aria-pressed="false">Pause photos</button><span class="dots">${(h.slides || []).map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</span></div>
</section>

<section class="team" id="team" aria-labelledby="team-h">
  <div class="wrap">
    <p class="hello">${esc(tm.hello || "")}</p>
    <h2 id="team-h">${esc(tm.headline || "")}</h2>
    <p class="sub">${esc(tm.sub || "")}</p>
    <div class="pair">${(tm.people || []).map(p => `<article class="person"><img ${photo(p.img, "(min-width:760px) 50vw, 100vw")} alt="${esc(p.alt)}" width="900" height="1100" loading="lazy" decoding="async"><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p>${esc(p.bio)}</p></article>`).join("")}</div>
    ${when(tm.credit, `<p class="fine">${esc(tm.credit)}</p>`)}
  </div>
</section>

<section class="homes wrap" id="homes" aria-labelledby="homes-h">
  <div class="sec-head"><h2 id="homes-h">${esc(L.headline || "Our homes")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2>
    <div class="tabs" role="group" aria-label="Show">${["All", "For sale", "Sold"].map((t, i) => `<button type="button" data-tab="${t}" aria-pressed="${i ? "false" : "true"}">${t}</button>`).join("")}</div></div>
  <ul class="grid">${(L.items || []).map(x => `<li data-status="${esc(x.status)}"><div class="pic"><img ${photo(x.img, "(min-width:1000px) 380px, (min-width:640px) 50vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><span class="badge ${x.status === "Sold" ? "sold" : ""}">${esc(x.status)}</span></div><p class="price">${usd(x.price)}</p><h3>${esc(x.street)}</h3><p class="meta">${esc(x.area)} · ${x.beds} bd · ${esc(String(x.baths))} ba · ${Number(x.sqft).toLocaleString("en-US")} sq ft</p>${when(x.status !== "Sold", k.book(x.street, "Schedule a showing", "go-link"))}</li>`).join("")}</ul>
  <p class="fine">${esc(L.fine || "")}</p>
</section>

<section class="inside" aria-labelledby="inside-h">
  <div class="wrap"><h2 id="inside-h">${esc(ins.headline || "")}</h2><p class="sub">${esc(ins.sub || "")}</p></div>
  <ul class="band">${(ins.items || []).map(x => `<li><img ${photo(x.img, "(min-width:760px) 50vw, 100vw")} alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><p>${esc(x.cap)}</p></li>`).join("")}</ul>
</section>

<section class="process wrap" id="process" aria-labelledby="proc-h">
  <h2 id="proc-h">${esc(pr.headline || "")}</h2>
  <p class="sub">${esc(pr.sub || "")}</p>
  <ol class="steps">${(pr.steps || []).map(([t, p]) => `<li><h3>${esc(t)}</h3><p>${esc(p)}</p></li>`).join("")}</ol>
  ${k.book("process", pr.cta || "Start with a walk-through", "btn btn-go")}
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
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
<script src="slides.js" defer></script>
</body>
</html>
`;
}
