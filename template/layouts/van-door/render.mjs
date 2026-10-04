// Layout "van-door": a family mobile-detail outfit, drawn like Talavera tile and a painted van.
// A 3D van you can spin (Zdog, self-hosted), today's route that reads the real San Antonio clock,
// a car you wash with your finger, a tile-bento price board, the price picker and the step form.
// Every string from site.json goes through esc() or url(); van.js only adds behavior.
import { kit, esc, when, url, money } from "../_kit.mjs";
export const behavior = "funnel.js"; // tracking, price picker and the step form
export const scripts = ["zdog.min.js", "van.js"];

const paras = a => (Array.isArray(a) ? a : a ? [a] : []).map(p => `<p>${esc(p)}</p>`).join("");

export function render(s, { css = "", mapSvg = "" } = {}) {
  const k = kit(s), b = k.b, h = s.hero, demo = k.demo;
  const nav = [["#board", "Prices"], ["#wash", "Try it"], ["#story", "About us"], ["#route", "Where we go"], ["#faq", "FAQ"]];
  const pkg = name => (s.packages || []).find(p => p.name === name);
  const e = s.estimator, rt = s.route || {}, w = s.wash || {};

  // Price picker: same markup contract as the default template, so funnel.js prices it and fills the form.
  const first = e.questions.map(q => q.options[0]);
  const start = first.reduce((n, o) => n + (Number(pkg(o.pick)?.price) || 0) + (Number(o.add) || 0), 0);
  const opt = (o, qi, oi) => `<label class="chip"><input type="radio" name="est${qi}" value="${oi}"${oi === 0 ? " checked" : ""}${when(o.pick, () => ` data-pick-pkg="${esc(o.pick)}" data-price="${Number(pkg(o.pick)?.price) || 0}"`)}${when(o.add, ` data-add="${Number(o.add) || 0}"`)} data-text="${esc(o.say || o.label)}"><span>${esc(o.label)}${when(o.add, ` <small>+$${Number(o.add)}</small>`)}${when(o.hint, `<small>${esc(o.hint)}</small>`)}</span></label>`;

  const tiles = (s.services || []).map((x, i) => `<li class="tile tile-${i + 1}" data-tilt>
      <h3>${esc(x.name)}</h3>
      <p class="tile-price"><small>from</small> ${money(x.from)}</p>
      <p>${esc(x.desc)}</p>
    </li>`).join("");

  const reviews = k.reviews();

  return `${k.head(css)}
<body${demo ? ' class="has-demo"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="top-in">
    <a class="logo" href="#main"><span class="logo-tile" aria-hidden="true">R</span><span class="logo-name">Ramirez <i>&amp;</i> Son</span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([hr, t]) => `<a href="${hr}">${t}</a>`).join("")}</nav>
    <p class="open" data-open hidden><span class="dot" aria-hidden="true"></span><span data-open-text></span></p>
    ${k.call("header", `<span class="top-num">${k.phone}</span>`, "top-call", ` aria-label="Call ${k.phone}"`)}
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="kicker">${esc(h.kicker || b.tagline || "")}</p>
      <h1><span class="h1-what">${esc(h.headline)}</span> <span class="h1-big">${esc(h.headlineEm)}</span></h1>
      <p class="lede">${esc(h.sub)}</p>
      <div class="ctas">${k.book("hero", s.booking?.cta, "btn btn-go")}${k.text("hero", "Text Rudy a photo", "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <figure class="van-stage">
      <canvas class="van" data-van width="560" height="440" role="img" aria-label="${esc(h.vanAlt || "A drawing of our white van with the shade tent up. Drag it to spin it around.")}"></canvas>
      <figcaption><button type="button" class="pause" data-pause aria-pressed="false">Pause motion</button><span class="spin-hint" data-spin-hint>${esc(h.vanHint || "Drag the van to spin it")}</span>${when(h.vanNote, `<span class="hand">${esc(h.vanNote)}</span>`)}</figcaption>
    </figure>
  </div>
  ${when(s.marquee?.length, `<div class="marquee" aria-label="Neighborhoods we cover">
    <ul class="mq-track">${s.marquee.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <ul class="mq-track" aria-hidden="true">${s.marquee.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
  </div>`)}
</section>

${when(rt.stops?.length, `<section class="today" id="today" aria-labelledby="today-h">
  <div class="wrap today-in">
    <div class="today-copy">
      <h2 id="today-h">${esc(rt.title)}${when(demo, ' <span class="sample-tag">(sample day)</span>')}</h2>
      ${paras(rt.body)}
      <p class="today-now" data-now aria-live="polite">${esc(rt.fallback || "")}</p>
    </div>
    <ol class="stops" data-stops data-hours="${esc(JSON.stringify((b.hours || []).map(x => [x.days, x.opens, x.closes])))}">
      ${rt.stops.map(x => `<li data-from="${esc(x.from)}" data-to="${esc(x.to)}"><time>${esc(x.label)}</time><b>${esc(x.where)}</b><span>${esc(x.job)}</span></li>`).join("")}
    </ol>
  </div>
</section>`)}

<section class="board" id="board" aria-labelledby="board-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="board-h">${esc(s.servicesHeadline)}${when(demo, ' <span class="sample-tag">(sample prices)</span>')}</h2>
      <p class="hand note-r">${esc(s.servicesNote || "")}</p>
    </div>
    <ul class="bento">${tiles}</ul>
  </div>
</section>

<section class="wash" id="wash" aria-labelledby="wash-h">
  <div class="wrap wash-in">
    <div class="wash-copy">
      <h2 id="wash-h">${esc(w.title)}</h2>
      ${paras(w.body)}
      <p class="wash-meter" aria-live="polite"><span data-wash-pct>0%</span> ${esc(w.meter || "clean")}</p>
      <button type="button" class="btn btn-line" data-wash-auto>${esc(w.auto || "Wash it for me")}</button>
      <div class="wash-done" data-wash-done hidden>
        <p class="hand">${esc(w.done)}</p>
        ${k.book("wash", w.cta || s.booking?.cta, "btn btn-go", ` data-pick="${esc(w.pick || "")}"`)}
      </div>
    </div>
    <div class="wash-pad" data-wash>
      ${carSvg()}
      <canvas class="mud" data-mud aria-hidden="true"></canvas>
    </div>
  </div>
</section>

<section class="price" id="price" aria-labelledby="price-h">
  <div class="wrap price-in">
    <div class="price-copy">
      <h2 id="price-h">${esc(e.title)}</h2>
      ${paras(e.body)}
      <ul class="pkgs">${(s.packages || []).map(p => `<li class="pkg${p.popular ? " pop" : ""}" data-spot>
        ${when(p.popular, `<span class="pkg-tag">${esc(p.popularLabel || "Most booked")}</span>`)}
        <h3>${esc(p.name)} <span>${money(p.price)}</span></h3>
        <p class="pkg-note">${esc(p.note || "")}</p>
        <p class="pkg-has">${(p.features || []).map(esc).join(" · ")}</p>
      </li>`).join("")}</ul>
      ${when(s.pricing?.sub, `<p class="fine">${esc(s.pricing.sub)}${when(demo, " Sample prices for this demo.")}</p>`)}
    </div>
    <form class="est" data-est>
      ${e.questions.map((q, qi) => `<fieldset><legend>${esc(q.q)}</legend><div class="chips">${q.options.map((o, oi) => opt(o, qi, oi)).join("")}</div></fieldset>`).join("\n      ")}
      <div class="est-out" aria-live="polite">
        <span class="est-label">${esc(e.totalLabel)}${when(demo, ' <span class="sample-tag">(sample)</span>')}</span>
        <output class="est-total" data-est-total>${money(start)}</output>
        <span class="est-sum" data-est-sum>${esc(first.map(o => o.say || o.label).join(" · "))}</span>
      </div>
      ${k.book("estimator", e.cta, "btn btn-go btn-block", ` data-pick="${esc(first.find(o => o.pick)?.pick || "")}" data-est-book`)}
      ${when(e.fine, `<p class="fine">${esc(e.fine)}</p>`)}
    </form>
  </div>
</section>

${(s.blocks || []).filter(x => x.id === "story").map(x => `<section class="story" id="story" aria-labelledby="story-h">
  <div class="wrap story-in">
    <div class="letter">
      <h2 id="story-h">${esc(x.title)}</h2>
      ${paras(x.body)}
      <p class="sign">${esc(x.sign)}</p>
    </div>
    <ul class="kit">${(x.items || []).map(i => `<li data-tilt><b>${esc(i.v)}</b><span>${esc(i.k)}</span><small>${esc(i.note || "")}</small></li>`).join("")}</ul>
  </div>
</section>`).join("")}

<section class="reviews" id="reviews" aria-labelledby="reviews-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="reviews-h">${esc(s.reviews.headline)}</h2>
      ${k.rating("rating")}
    </div>
    <ul class="revs" role="list" tabindex="0" aria-label="Customer reviews${demo ? " (sample)" : ""}">
      ${reviews.map(r => `<li class="rev"><blockquote><p>${esc(r.text)}</p></blockquote><p class="who"><b>${esc(r.name)}</b>${esc(r.detail || "")}${when(r.date, ` · <time datetime="${esc(r.date)}">${k.date(r.date)}</time>`)}</p></li>`).join("")}
    </ul>
    ${k.reviewNote("fine")}
  </div>
</section>

<section class="promise" id="promise" aria-labelledby="promise-h">
  <div class="wrap promise-in">
    <h2 id="promise-h">${esc(s.guarantee.title)}</h2>
    <p>${esc(s.guarantee.body)}</p>
    <p class="sign">${esc(s.guarantee.sign || "")}</p>
  </div>
</section>

<section class="route" id="route" aria-labelledby="route-h">
  <div class="wrap route-in">
    <div>
      <h2 id="route-h">${esc(s.areas.headline)}</h2>
      ${paras(s.areas.body)}
      <ul class="towns">${(s.areas.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>
    ${when(mapSvg, `<div class="map" role="img" aria-label="${esc(s.areas.mapAlt || "Service area map")}">${mapSvg}</div>`)}
  </div>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div>
      <h2 id="book-h">${esc(s.booking.headline)}</h2>
      ${paras(s.booking.body)}
      <p class="book-alt">${k.call("book", `Call ${k.phone}`, "btn btn-line")}${k.text("book", "Text instead", "btn btn-line")}</p>
    </div>
    ${k.form({ cls: "quote", labelledby: "book-h" })}
  </div>
</section>

<section class="faq-sec" id="faq" aria-labelledby="faq-h">
  <div class="wrap faq-in">
    <h2 id="faq-h">${esc(s.faqHeadline)}</h2>
    ${k.faq("faq")}
  </div>
</section>

<section class="final">
  <div class="wrap">
    <h2>${esc(s.final.headline)}</h2>
    <p>${esc(s.final.sub)}</p>
    <div class="ctas">${k.book("final", s.booking?.cta, "btn btn-go")}${k.call("final", `Call ${k.phone}`, "btn btn-line on-dark")}</div>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <p><b>${esc(b.name)}</b><br>${esc(b.footerLine || "")}<br>${esc(b.hoursText || "")}<br>${k.addr()}</p>
    <p>${k.credit()}</p>
  </div>
</footer>
${k.sticky("sticky")}
${k.scripts()}
${scripts.map(f => `<script src="${f}" defer></script>`).join("\n")}
</body>
</html>`;
}

// A plain sedan, side on. The mud is painted over it on a canvas by van.js.
function carSvg() {
  return `<svg class="car" viewBox="0 0 640 260" role="img" aria-label="A clean car, side view">
  <ellipse cx="320" cy="236" rx="270" ry="12" class="c-shadow"/>
  <path class="c-body" d="M52 190c-6-30 6-52 40-60l84-14c36-34 74-58 140-60 70-2 116 22 160 62l78 12c32 6 46 26 44 60l-4 18H58z"/>
  <path class="c-glass" d="M196 114c30-28 62-44 112-46v48zM324 68c50 2 86 18 116 48H324z"/>
  <path class="c-line" d="M316 68v122M180 150h420"/>
  <path class="c-shine" d="M120 140c80-10 200-12 300-6"/>
  <rect x="540" y="146" width="40" height="12" rx="6" class="c-lamp"/>
  <rect x="60" y="150" width="30" height="10" rx="5" class="c-tail"/>
  <g class="c-wheel"><circle cx="164" cy="204" r="38"/><circle cx="164" cy="204" r="18" class="c-rim"/></g>
  <g class="c-wheel"><circle cx="490" cy="204" r="38"/><circle cx="490" cy="204" r="18" class="c-rim"/></g>
</svg>`;
}
