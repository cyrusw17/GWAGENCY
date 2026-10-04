// Layout "almanac": a coastal soft-wash business that times every job to the season.
// The signature is a 12-month wash calendar (pollen, mildew, storms); prices read like a
// tide table. Raised-house proportions: tall before/after, airy columns.
import * as k from "../../kit.mjs";
const { esc, when, money } = k;

export function render(s, { css }) {
  const b = s.business, h = s.hero, r = s.reviews, a = s.almanac, demo = !!s.demo;
  const cmp = s.work?.compare;
  const legend = Object.fromEntries((a?.legend || []).map(x => [x.key, x.label]));
  const now = new Date(s.builtAt || Date.now()).getMonth();

  return `<!doctype html>
<html lang="en">
<head>
${k.head(s, { css: k.baseCss + css, preloadFonts: ["young-serif-400.woff2", "karla-400-700.woff2"], themeColor: "#EDF1EC" })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar(s)}
<header class="al-head">
  <a class="al-mark" href="#main"><span>${esc(b.name.replace(/ Soft Wash$/, ""))}</span><small>Soft Wash · ${esc(b.address?.city || "")}</small></a>
  <nav aria-label="Sections"><a href="#calendar">Calendar</a><a href="#prices">Prices</a><a href="#reviews">Reviews</a></nav>
  <div class="al-head-act">${k.textLink(s, "header", "Text Rhea", "al-link")}${k.callLink(s, "header", esc(b.phone), "al-pill")}</div>
</header>

<main id="main">
<section class="al-hero">
  <div class="al-hero-text">
    <p class="al-eyebrow">${esc(h.eyebrow)}</p>
    <h1>${esc(h.headline)}</h1>
    <p class="al-lede">${esc(h.sub)}</p>
    <div class="al-ctas">
      ${k.bookLink("hero", s.booking?.cta || "Get my quote", "al-btn")}
      ${k.callLink(s, "hero", `or call ${esc(b.phone)}`, "al-link")}
    </div>
    ${when(r?.rating, `<p class="al-rating">${k.rating(s)}</p>`)}
  </div>
  ${when(cmp, () => `<figure class="al-hero-fig">
    ${k.compare(cmp, { cls: "al-compare", eager: true })}
    <figcaption>${k.sampleTag(s, "Sample photo")} ${esc(cmp.caption || "")}. Drag to compare.</figcaption>
  </figure>`)}
</section>

${when(a, () => `<section class="al-cal" id="calendar" aria-labelledby="cal-h">
  <div class="al-cal-head">
    <h2 id="cal-h">${esc(a.headline)}</h2>
    <p>${esc(a.sub)}</p>
    <ul class="al-legend">${a.legend.map(x => `<li><i class="t-${esc(x.key)}"></i>${esc(x.label)}</li>`).join("")}</ul>
  </div>
  <ol class="al-months">
    ${a.months.map((m, i) => { const tags = m.tags || []; return `<li class="${i === now ? "now" : ""}">
      <b>${esc(m.m)}</b>
      <span class="bars">${["pollen", "mildew", "storm", "best"].map(t => `<i class="t-${t}${tags.includes(t) ? " on" : ""}"${tags.includes(t) ? ` title="${esc(legend[t] || t)}"` : ""}></i>`).join("")}</span>
      <span class="sr-only">${esc(tags.map(t => legend[t] || t).join(", "))}.</span>
      <p>${esc(m.note)}</p>
    </li>`; }).join("")}
  </ol>
</section>`)}

<section class="al-prices" id="prices" aria-labelledby="prices-h">
  <div class="al-prices-head">
    <h2 id="prices-h">Prices, posted like the tides</h2>
    <p>Starting prices for a typical house east of the Cooper. Raised and two-story homes run about a third more.</p>
    ${when(demo, `<p class="al-small">${k.sampleTag(s, "Sample prices")} Real sites show the owner's own price list.</p>`)}
  </div>
  <div class="al-table" role="table" aria-label="Services and starting prices">
    <div class="al-tr al-th" role="row"><span role="columnheader">Service</span><span role="columnheader">From</span><span role="columnheader">Best month</span></div>
    ${s.services.map(x => `<div class="al-tr" role="row">
      <span role="cell"><b>${esc(x.name)}</b><small>${esc(x.desc)} Price for ${esc(x.unit)}.</small></span>
      <span role="cell" class="al-num"><small>from</small> ${money(x.from)}</span>
      <span role="cell" class="al-when">${esc(x.when || "")}</span>
    </div>`).join("")}
  </div>
  ${k.bookLink("prices", "Price my house", "al-btn")}
</section>

<section class="al-letter" aria-labelledby="letter-h">
  <div class="al-ceiling" aria-hidden="true"></div>
  <div class="al-letter-body">
    <h2 id="letter-h">Why we wait for the pollen</h2>
    <p>${esc(s.owner.story)}</p>
    <p class="al-sign">${esc(s.owner.sign)}</p>
    <p class="al-small">${esc(s.owner.name)}, ${esc(s.owner.role)}. ${esc(b.insured || "")}</p>
  </div>
  <figure class="al-portrait">${s.owner.image ? k.img(s.owner.image, s.owner.photo || s.owner.name, { w: 600, h: 800 }) : ""}<figcaption>${esc(s.owner.photo || "")}${when(demo && !s.owner.image, ". Sample photo slot: the real site shows the owner here.")}</figcaption></figure>
</section>

${when(s.work?.second, () => `<section class="al-second" aria-labelledby="roof-h">
  <h2 id="roof-h">Roofs, in the cool months</h2>
  <p>Streaks on the north and west slopes are algae feeding on the shingles. Soft wash kills it, and the roof stays clean for years.</p>
  ${k.compare(s.work.second, { cls: "al-compare wide" })}
  <p class="al-small">${k.sampleTag(s, "Sample photo")} ${esc(s.work.second.caption)}</p>
</section>`)}

${when(r?.items?.length, () => `<section class="al-reviews" id="reviews" aria-labelledby="rev-h">
  <h2 id="rev-h">From the neighbors</h2>
  ${when(r?.rating, `<p class="al-rating">${k.rating(s)}</p>`)}
  ${k.sampleReviewsNote(s)}
  <div class="al-quotes">
    ${k.newestFirst(r.items).map(x => `<figure><blockquote>${esc(x.text)}</blockquote><figcaption>${esc(x.name)}, ${esc(x.detail || "")}${when(x.date, `, <time datetime="${esc(x.date)}">${esc(k.monthYear(x.date))}</time>`)}</figcaption></figure>`).join("")}
  </div>
</section>`)}

<section class="al-quote" id="quote" aria-labelledby="quote-h">
  <div class="al-quote-head">
    <h2 id="quote-h">Get your price</h2>
    <p>Three short steps. Or text a photo of the house to ${k.textLink(s, "quote section", esc(b.sms || b.phone))} and Rhea will price it from that.</p>
    <p class="al-small">${esc(b.hoursText)}</p>
  </div>
  ${k.quoteForm(s, { cls: "al-form", nextCls: "al-btn", submitCls: "al-btn" })}
</section>

<section class="al-area" id="area" aria-labelledby="area-h">
  <div>
    <h2 id="area-h">${esc(s.areas.headline)}</h2>
    <p>${esc(s.areas.body)}</p>
  </div>
  <ul>${s.areas.cities.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
</section>

<section class="al-faq" id="faq" aria-labelledby="faq-h">
  <h2 id="faq-h">Good questions</h2>
  ${k.faq(s, "al-faqlist")}
</section>
</main>

<footer class="al-foot">
  <div><p class="al-foot-mark">${esc(b.name)}</p><p>${esc(b.tagline)}. ${esc(b.insured || "")}</p></div>
  <div><p>${k.callLink(s, "footer", esc(b.phone))} · ${k.textLink(s, "footer", "Text")}</p><p>${esc(b.hoursText)}</p><p>${esc(k.addressLine(b))}</p></div>
  <p class="al-small">© ${k.year(s)} ${esc(b.name)} · ${k.credit(s)}</p>
</footer>

<nav class="al-sticky" aria-label="Quick actions">
  ${k.callLink(s, "sticky", "Call", "al-sbtn")}
  ${k.textLink(s, "sticky", "Text", "al-sbtn")}
  ${k.bookLink("sticky", s.booking?.cta || "Get my quote", "al-btn")}
</nav>
${k.script(s)}
</body>
</html>
`;
}
