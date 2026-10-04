// Layout "porch": a Lowcountry soft-wash outfit, drawn from a raised house at dusk.
// A 3D house (Zdog, self-hosted) you turn by dragging and wash with a slider, a sky that follows the
// real Mount Pleasant clock and sunset, a pressure dial that shows why soft wash, the 12-month wash
// calendar, a tide-table price list and the 3-step quote form. house.js only adds behavior: the page
// reads fine and the form works without it. Every string from site.json goes through esc() or url().
import * as k from "../../kit.mjs";
const { esc, when, money } = k;
export const scripts = ["zdog.min.js", "house.js"];

export function render(s, { css }) {
  const b = s.business, h = s.hero, r = s.reviews, a = s.almanac, p = s.pressure, pr = s.process, demo = !!s.demo;
  const cmp = s.work?.compare, roof = s.work?.second;
  const first = s.owner?.name?.split(" ")[0] || "us";
  // Licensed/insured is a claim the owner must confirm; demos show it as sample copy.
  const insured = demo || b.insuredConfirmed === true ? b.insured || "" : "";
  const legend = Object.fromEntries((a?.legend || []).map(x => [x.key, x.label]));
  const built = new Date(s.builtAt || Date.now()).getMonth();
  const cta = s.booking?.cta || "Get my quote";
  // The live strip and the sky read this; everything else about "now" is filled in by house.js.
  const live = { ...(s.live || {}), owner: s.owner?.name?.split(" ")[0] || "", hours: b.hours || [], months: (a?.months || []).map(m => ({ m: m.m, note: m.note, tags: (m.tags || []).map(t => legend[t] || t) })) };

  return `<!doctype html>
<html lang="en" class="no-js">
<head>
${k.head(s, { css: k.baseCss + css, preloadFonts: ["gloock-400.woff2", "figtree-var.woff2"], themeColor: "#0E2233" })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar(s)}
<header class="pc-head">
  <a class="pc-mark" href="#main"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 30V14a12 12 0 0 1 24 0v16z"/><path d="M11 22h10"/></svg><span>${esc(b.short || b.name)}</span></a>
  <nav aria-label="Sections"><a href="#today">Today</a><a href="#why">Why soft</a><a href="#prices">Prices</a><a href="#reviews">Reviews</a></nav>
  <div class="pc-head-act">${k.callLink(s, "header", esc(b.phone), "pc-call")}${k.bookLink("header", cta, "pc-btn pc-head-book")}</div>
</header>

<main id="main">
<section class="pc-hero" data-sky="dusk">
  <div class="pc-stars" aria-hidden="true"></div>
  <div class="pc-hero-in">
    <div class="pc-hero-text">
      <p class="pc-eyebrow">${esc(h.eyebrow)}</p>
      <h1>${esc(h.headline)}</h1>
      <p class="pc-lede">${esc(h.sub)}</p>
      <div class="pc-ctas">
        ${k.bookLink("hero", cta, "pc-btn pc-shine")}
        ${k.textLink(s, "hero", `Text ${esc(first)} a photo`, "pc-ghost")}
      </div>
      ${when(r?.rating, `<p class="pc-rating">${k.rating(s)}</p>`)}
    </div>
    <figure class="pc-stage">
      <noscript><style>.pc-house,.pc-wash,.pc-pause,.pc-hint{display:none}</style>${when(cmp, () => k.img(cmp.after, h.houseAlt || cmp.caption || "", { w: 1200, h: 900, cls: "pc-house-still" }))}</noscript>
      <canvas class="pc-house" data-house width="520" height="440" role="img" aria-label="${esc(h.houseAlt || "A drawing of a raised house with a haint blue porch ceiling")}"></canvas>
      <div class="pc-wash">
        <label for="wash">${esc(h.washLabel || "Slide to wash the house")}</label>
        <input id="wash" type="range" min="0" max="100" value="0" data-wash>
      </div>
      <figcaption>
        <button type="button" class="pc-pause" data-pause aria-pressed="false">Pause motion</button>
        <span class="pc-hint">${esc(h.houseHint || "Drag the house to turn it")}</span>
        ${when(h.houseNote, `<span class="pc-note">${esc(h.houseNote)}</span>`)}
      </figcaption>
    </figure>
  </div>
</section>

<section class="pc-today" id="today" aria-labelledby="today-h">
  <h2 id="today-h" class="sr-only">Today in ${esc(s.live?.place || b.address?.city || "")}</h2>
  <div class="pc-bento">
    <div class="pc-cell pc-clock">
      <p class="pc-k">Right now in ${esc(s.live?.place || b.address?.city || "")}</p>
      <p class="pc-big" data-clock>${esc(b.hoursText)}</p>
      <p class="pc-open" data-open>Texts answered between jobs.</p>
    </div>
    <div class="pc-cell pc-sun">
      <p class="pc-k">Sunset tonight</p>
      <p class="pc-big" data-sunset>Before dark</p>
      <p>Crews pack up before dark. Cleaner needs daylight to dry right.</p>
    </div>
    ${when(a, () => `<div class="pc-cell pc-month">
      <p class="pc-k">This month</p>
      <p class="pc-big" data-month-name>${esc(a.months[built]?.m || "")}</p>
      <p data-month-note>${esc(a.months[built]?.note || "")}</p>
    </div>`)}
  </div>
  <script type="application/json" id="live">${JSON.stringify(live).replace(/</g, "\\u003c")}</script>
</section>

${when(a, () => `<section class="pc-cal" id="calendar" aria-labelledby="cal-h">
  <div class="pc-sec-head">
    <h2 id="cal-h">${esc(a.headline)}</h2>
    <p>${esc(a.sub)}</p>
    <ul class="pc-legend">${a.legend.map(x => `<li><i class="t-${esc(x.key)}"></i>${esc(x.label)}</li>`).join("")}</ul>
  </div>
  <ol class="pc-months">
    ${a.months.map((m, i) => { const tags = m.tags || []; return `<li${i === built ? ' class="now"' : ""}>
      <b>${esc(m.m)}</b>
      <span class="bars" aria-hidden="true">${["pollen", "mildew", "storm", "best"].map(t => `<i class="t-${t}${tags.includes(t) ? " on" : ""}"></i>`).join("")}</span>
      <span class="sr-only">${esc(tags.map(t => legend[t] || t).join(", "))}.</span>
      <p>${esc(m.note)}</p>
    </li>`; }).join("")}
  </ol>
</section>`)}

${when(p, () => `<section class="pc-why" id="why" aria-labelledby="why-h">
  <div class="pc-sec-head">
    <h2 id="why-h">${esc(p.headline)}</h2>
    <p>${esc(p.sub)}</p>
  </div>
  <div class="pc-dial" data-dial>
    <div class="pc-board" data-board aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i>
      <span class="chip c1"></span><span class="chip c2"></span><span class="chip c3"></span>
      <span class="drip"></span>
    </div>
    <div class="pc-gauge">
      <label for="psi">Pressure</label>
      <p class="pc-psi"><output data-psi-out for="psi">${Number(p.stops[0].psi) || 0}</output> <small>PSI</small></p>
      <input id="psi" type="range" min="0" max="3000" step="100" value="0" data-psi>
      <ul class="pc-says" aria-live="polite">${p.stops.map((x, i) => `<li data-psi-at="${Number(x.psi) || 0}" class="${esc(x.tone || "")}${i === 0 ? " on" : ""}"><b>${Number(x.psi) ? `${Number(x.psi).toLocaleString("en-US")}+ PSI` : "Soft wash"}</b> ${esc(x.say)}</li>`).join("")}</ul>
    </div>
  </div>
</section>`)}

${when(cmp || roof, () => `<section class="pc-proof" aria-labelledby="proof-h">
  <div class="pc-sec-head"><h2 id="proof-h">Same houses, one wash apart</h2></div>
  <div class="pc-proof-grid">
    ${[cmp, roof].filter(Boolean).map(c => `<figure class="pc-card" data-spot>
      ${k.compare(c, { cls: "pc-compare" })}
      <figcaption>${k.sampleTag(s, "Sample photo")} ${esc(c.caption || "")}. Drag to compare.</figcaption>
    </figure>`).join("")}
  </div>
</section>`)}

<section class="pc-prices" id="prices" aria-labelledby="prices-h">
  <div class="pc-sec-head">
    <h2 id="prices-h">Prices, posted like the tides</h2>
    <p>Starting prices for a typical house east of the Cooper. Raised and two-story homes run about a third more.</p>
    ${when(demo, `<p class="pc-small">${k.sampleTag(s, "Sample prices")} Real sites show the owner's own price list.</p>`)}
  </div>
  <div class="pc-table" role="table" aria-label="Services and starting prices">
    <div class="pc-tr pc-th" role="row"><span role="columnheader">Service</span><span role="columnheader">From</span><span role="columnheader">Best month</span></div>
    ${s.services.map(x => `<div class="pc-tr" role="row">
      <span role="cell"><b>${esc(x.name)}</b><small>${esc(x.desc)} Price for ${esc(x.unit)}.</small></span>
      <span role="cell" class="pc-num">${money(x.from)}</span>
      <span role="cell" class="pc-when">${esc(x.when || "")}</span>
    </div>`).join("")}
  </div>
  ${k.bookLink("prices", "Price my house", "pc-btn")}
</section>

${when(pr?.steps?.length, () => `<section class="pc-process" aria-labelledby="proc-h">
  <div class="pc-sec-head"><h2 id="proc-h">${esc(pr.headline)}</h2>${when(pr.sub, `<p>${esc(pr.sub)}</p>`)}</div>
  <ol class="pc-beam">${pr.steps.map(x => `<li>${when(x.at, `<time class="pc-at">${esc(x.at)}</time>`)}<h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></li>`).join("")}</ol>
</section>`)}

<section class="pc-letter" aria-labelledby="letter-h">
  <div class="pc-letter-body">
    <h2 id="letter-h">Why we wait for the pollen</h2>
    <p>${esc(s.owner.story)}</p>
    <p class="pc-sign">${esc(s.owner.sign)}</p>
    <p class="pc-small">${esc(s.owner.name)}, ${esc(s.owner.role)}. ${esc(insured)}</p>
  </div>
  <figure class="pc-portrait${s.owner.image ? "" : " empty"}">${s.owner.image ? k.img(s.owner.image, s.owner.photo || s.owner.name, { w: 600, h: 800 }) : ""}<figcaption>${esc(s.owner.photo || "")}${when(demo && !s.owner.image, ". Sample photo slot: the real site shows the owner here.")}</figcaption></figure>
</section>

${when(r?.items?.length, () => `<section class="pc-reviews" id="reviews" aria-labelledby="rev-h">
  <div class="pc-sec-head">
    <h2 id="rev-h">From the neighbors</h2>
    ${when(r?.rating, `<p class="pc-rating">${k.rating(s)}</p>`)}
    ${k.sampleReviewsNote(s)}
  </div>
  <div class="pc-quotes">
    ${k.newestFirst(r.items).map(x => `<figure class="pc-card" data-spot><blockquote>${esc(x.text)}</blockquote><figcaption>${esc(x.name)}, ${esc(x.detail || "")}${when(x.date, `, <time datetime="${esc(x.date)}">${esc(k.monthYear(x.date))}</time>`)}</figcaption></figure>`).join("")}
  </div>
</section>`)}

<section class="pc-quote" id="quote" aria-labelledby="quote-h">
  <div class="pc-sec-head">
    <h2 id="quote-h">Get your price</h2>
    <p>Three short steps. Or text a photo of the house to ${k.textLink(s, "quote section", esc(b.sms || b.phone))} and ${esc(first)} will price it from that.</p>
    <p class="pc-small">${esc(b.hoursText)}</p>
  </div>
  ${k.quoteForm(s, { cls: "pc-form", nextCls: "pc-btn", submitCls: "pc-btn" })}
</section>

<section class="pc-area" id="area" aria-labelledby="area-h">
  <div>
    <h2 id="area-h">${esc(s.areas.headline)}</h2>
    <p>${esc(s.areas.body)}</p>
  </div>
  <ul>${s.areas.cities.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
</section>

<section class="pc-faq" id="faq" aria-labelledby="faq-h">
  <h2 id="faq-h">Good questions</h2>
  ${k.faq(s, "pc-faqlist")}
</section>
</main>

<footer class="pc-foot">
  <div><p class="pc-foot-mark">${esc(b.name)}</p><p>${esc(b.tagline)}. ${esc(insured)}</p></div>
  <div><p>${k.callLink(s, "footer", esc(b.phone))} · ${k.textLink(s, "footer", "Text")}</p><p>${esc(b.hoursText)}</p><p>${esc(k.addressLine(b))}</p></div>
  <p class="pc-small">© ${k.year(s)} ${esc(b.name)} · ${k.credit(s)}</p>
</footer>

<nav class="pc-dock" aria-label="Quick actions">
  ${k.callLink(s, "sticky", "Call", "pc-dbtn")}
  ${k.textLink(s, "sticky", "Text", "pc-dbtn")}
  ${k.bookLink("sticky", cta, "pc-btn")}
</nav>
${k.script(s)}
${scripts.map(f => `<script src="${f}" defer></script>`).join("\n")}
</body>
</html>
`;
}
