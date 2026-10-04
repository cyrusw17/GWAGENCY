// Layout "lawn-season": the same quarter-acre lot through a central Ohio year. A drawn 3D yard
// (Zdog, loaded after first paint) that the mower stripes as you watch, and a month strip that
// changes the grass, the mowing height and what Pruitt would do for you this month. The page opens
// on today's month. Bento tiles: route-day checker with the next visit date, today's mowing height,
// how the crew texts. Then the price sheet with each job's best months, before/after, reviews,
// Denny's note, route days by ZIP, the 3-step estimate form and FAQ.
// yard.js only adds behavior; without it the page shows a drawn yard and every month's plan as a list.
import { kit, esc, when } from "../_kit.mjs";
export const behavior = "funnel.js"; // the step form and tracking from template/funnel.js
export const scripts = ["zdog.min.js", "yard.js"]; // yard.js pulls in zdog.min.js itself, after first paint

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The still yard: what shows before (or without) the 3D one. Same lot, drawn flat, freshly striped.
const poster = `<svg class="yard-still" viewBox="0 0 520 420" role="img" aria-label="Drawing of a striped front lawn with a house, a driveway and a maple">
  <defs><pattern id="stripes" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="22" height="44" fill="#4E9A43"/><rect x="22" width="22" height="44" fill="#3E8238"/></pattern></defs>
  <path d="M40 250 L260 140 L480 250 L260 360 Z" fill="url(#stripes)" stroke="#2B5E2A" stroke-width="3"/>
  <path d="M300 160 L340 180 L170 265 L130 245 Z" fill="#CFC8B8"/>
  <path d="M210 120 L300 75 L380 115 L380 175 L290 220 L210 180 Z" fill="#F4EFE2" stroke="#12352E" stroke-width="3"/>
  <path d="M200 125 L295 60 L392 112 L300 160 Z" fill="#33463F"/>
  <rect x="262" y="160" width="20" height="34" fill="#12352E" transform="skewY(-26)"/>
  <circle cx="410" cy="215" r="38" fill="#C9862C"/><circle cx="392" cy="200" r="22" fill="#D99A3A"/><rect x="406" y="240" width="8" height="34" fill="#5A3E2B"/>
  <rect x="120" y="275" width="26" height="16" rx="3" fill="#F2C230" stroke="#12352E" stroke-width="2"/>
</svg>`;

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, rt = s.route || {}, yr = s.year || [];
  const nav = [["#year", "The year"], ["#prices", "Prices"], ["#reviews", "Reviews"], ["#areas", "Route days"], ["#faq", "FAQ"]];
  const pk = name => (s.packages || []).find(p => p.name === name) || {};
  // The months JSON yard.js reads. Built from site.json only, so the page and the script can't disagree.
  const yearJson = JSON.stringify(yr.map(m => ({ m: m.m, season: m.season, cut: m.cut ?? null, offer: m.offer, line: m.line, price: pk(m.offer).price || "", unit: pk(m.offer).unit || "" }))).replace(/</g, "\\u003c");
  const routeJson = JSON.stringify(rt.days?.map(d => [d.day, d.town, d.zips || []]) || []).replace(/</g, "\\u003c");

  return `${k.head(css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M6 30 L20 6 L34 30" fill="none"/><path d="M11 30v-6M17 30v-9M23 30v-9M29 30v-6"/></svg><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", `<span class="top-num">${k.phone}</span>`, "top-call", ` aria-label="Call ${k.phone}"`)}${k.book("header", "Free estimate", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", s.hero.cta)}${k.call("hero", `Call ${k.phone}`, "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <div class="yard-tile" id="year">
      <div class="yard-stage">
        ${poster}
        <canvas class="yard-3d" data-yard aria-hidden="true" tabindex="-1"></canvas>
        <p class="yard-cut" aria-hidden="true"><span data-cut>3.25</span><small>in</small></p>
        <div class="yard-tools">
          <button type="button" class="tool" data-mow>Mow a stripe</button>
          <button type="button" class="tool" data-pause aria-pressed="false">Pause motion</button>
        </div>
        <p class="yard-hint">Drag the yard to turn it.</p>
      </div>
      <div class="months" role="group" aria-labelledby="months-h">
        <p class="months-h" id="months-h">${esc(s.yearTitle || "Pick a month. The yard and our plan change with it.")}</p>
        <div class="month-row">${yr.map((m, i) => `<button type="button" class="mo s-${esc(m.season)}" data-month="${i}" aria-pressed="false">${esc(m.m)}</button>`).join("")}</div>
        <div class="plan" aria-live="polite">
          <p class="plan-when"><span data-today hidden>This month</span> <b data-plan-month>${esc(yr[9]?.m || "")}</b></p>
          <p class="plan-line" data-plan-line>${esc(yr[9]?.line || "")}</p>
          <p class="plan-offer"><span data-plan-offer>${esc(yr[9]?.offer || "")}</span> <b data-plan-price>${esc(pk(yr[9]?.offer).price || "")}</b> <small data-plan-unit>${esc(pk(yr[9]?.offer).unit || "")}</small></p>
          ${k.book("month plan", "Price this for my yard", "btn btn-go plan-btn", ` data-plan-pick data-pick="${esc(yr[9]?.offer || "")}"`)}
        </div>
      </div>
      <details class="all-months"><summary>The whole year as a list</summary><ol>${yr.map(m => `<li><b>${esc(m.m)}</b> ${esc(m.line)}</li>`).join("")}</ol></details>
    </div>
  </div>
</section>

<section class="bento wrap" aria-label="Route day, mowing height and how we keep in touch">
  <div class="tile t-route">
    <h2>${esc(rt.ask || "Which day are we on your street?")}</h2>
    <form class="zip-check" data-route="${esc(routeJson)}">
      <label for="route-zip">Your ZIP</label>
      <div class="zip-row"><input id="route-zip" inputmode="numeric" maxlength="5" placeholder="e.g. 43017" autocomplete="postal-code"><button type="submit" class="btn btn-ink">Check</button></div>
      <p class="zip-out" aria-live="polite">${esc(rt.note || "")}</p>
    </form>
  </div>
  <div class="tile t-height">
    <h2>${esc(s.heights?.title || "How tall we leave it")}</h2>
    <p class="big-cut"><span data-cut>3.25</span><small> in</small></p>
    <p class="t-note">${esc(s.heights?.note || "")}</p>
    <ul class="cut-rows">${(s.heights?.rows || []).map(r => `<li><b>${esc(r.in)} in</b> ${esc(r.when)}</li>`).join("")}</ul>
  </div>
  <div class="tile t-text">
    <h2>${esc(s.texts?.title || "You'll hear from us")}</h2>
    <div class="thread" aria-label="Example texts from the crew">${(s.texts?.items || []).map(t => `<p class="msg"><span class="msg-t">${esc(t.time)}</span>${esc(t.text)}</p>`).join("")}</div>
    <p class="t-note">${esc(s.texts?.note || "")}</p>
  </div>
  <ul class="tile t-trust">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
</section>

<section class="prices wrap" id="prices" aria-labelledby="prices-h">
  <div class="prices-head"><h2 id="prices-h">${esc(s.pricing?.headline || "Prices")}</h2><p>${esc(s.pricing?.sub || "")}</p></div>
  <ul class="tags">${(s.packages || []).map(p => `<li class="tag-card${p.popular ? " pop" : ""}">
    <div class="tag-hole" aria-hidden="true"></div>
    <h3>${esc(p.name)}</h3>
    <p class="amt">${esc(p.price)} <small>${esc(p.unit || "")}</small></p>
    <p class="tag-note">${esc(p.note || "")}${when(p.popular, ` <em>${esc(p.popularLabel || "Most popular")}</em>`)}</p>
    <ul class="incl">${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
    ${when(p.months?.length, `<p class="best"><span class="sr-only">Best months: ${p.months.map(n => MONTHS[n - 1]).join(", ")}</span><span class="ticks" aria-hidden="true">${MONTHS.map((m, i) => `<i${p.months.includes(i + 1) ? ' class="on"' : ""}>${m[0]}</i>`).join("")}</span></p>`)}
    ${when(p.how, `<p class="how-line"><b>How it starts:</b> ${esc(p.how)}</p>`)}
    ${k.book("price " + p.name, "Price my yard", "tag-btn", ` data-pick="${esc(p.name)}"`)}
  </li>`).join("")}</ul>
  ${when(s.addon, `<p class="addon"><b>Add ${esc(s.addon.name)}</b> ${esc(s.addon.price)} ${esc(s.addon.unit || "")}</p>`)}
  <p class="fine">${esc(s.pricing?.fine || "")}</p>
</section>

<section class="work" id="work" aria-labelledby="work-h">
  <div class="wrap work-in">
    <h2 id="work-h">${esc(s.work?.headline || "Recent work")}</h2>
    <div class="work-cmp">${k.compare(s.work?.compare)}<p class="fine">${esc(s.work?.compare?.caption || "Drag to compare.")}</p></div>
    ${when(s.guarantee, `<div class="promise"><h3>${esc(s.guarantee.title)}</h3><p>${esc(s.guarantee.body)}</p>${k.text("guarantee", "Text us a photo", "btn btn-line")}</div>`)}
  </div>
</section>

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list" tabindex="0" aria-label="Customer reviews (sample)">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
</section>

${when(s.owner, `<section class="owner" aria-labelledby="owner-h">
  <div class="wrap owner-in">
    ${k.shot(s.owner.photo, `${s.owner.name} with the crew trailer`, s.owner.shot || "Shot list: Denny by the trailer, early light, mower on the ramp.", "owner-shot")}
    <div class="note-card"><h2 id="owner-h">${esc(s.owner.name)}</h2><p class="owner-role">${esc(s.owner.role || "")}</p><p class="owner-story">${esc(s.owner.story)}</p><p class="sign">${esc(s.owner.sign || "— " + s.owner.name.split(" ")[0])}</p><p class="lic">${esc(b.license || "")}</p></div>
  </div>
</section>`)}

<section class="areas wrap" id="areas" aria-labelledby="areas-h">
  <h2 id="areas-h">${esc(s.areas?.headline || "Where we work")}</h2>
  <p class="areas-body">${esc(s.areas?.body || "")}</p>
  <ul class="days" aria-label="Route days by ZIP">${(rt.days || []).map(d => `<li><b>${esc(d.day)}</b>${esc(d.town)}${when(d.zips?.length, `<small>${(d.zips || []).map(esc).join(" · ")}</small>`)}</li>`).join("")}${(s.areas?.cities || []).filter(c => !(rt.days || []).some(d => d.town === c)).map(c => `<li><b>Ask</b>${esc(c)}</li>`).join("")}</ul>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy">
      <h2 id="book-h">${esc(s.booking?.headline || "Get a free estimate")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Rather talk? ${k.call("book section", k.phone, "alt-link")} or ${k.text("book section", "send a text", "alt-link")}.</p>
    </div>
    ${k.form({ cls: "quote" })}
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec" id="faq" aria-labelledby="faq-h"><div class="wrap narrow"><h2 id="faq-h">${esc(s.faqHeadline || "Things people ask on the estimate")}</h2>${k.faq()}</div></section>`)}

<section class="final">
  <div class="wrap final-in"><h2>${esc(s.final?.headline || "Ready?")}</h2><p>${esc(s.final?.sub || "")}</p><div class="ctas">${k.book("final")}${k.call("final", `Call ${k.phone}`, "btn btn-line")}</div></div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div><b>${esc(b.name)}</b><br>${k.addr()}<br>${esc(b.license || "")}</div>
    <div><b>Call or text</b><br>${k.call("footer", k.phone, "foot-link")}<br>${esc(b.hoursText || "")}${when(b.email, `<br><a class="foot-link" href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}</div>
    <p class="credit">${k.credit()}</p>
  </div>
</footer>
${k.sticky("sticky")}
<script type="application/json" id="year-data">${yearJson}</script>
${k.scripts()}
<script src="yard.js" defer></script>
</body>
</html>
`;
}
