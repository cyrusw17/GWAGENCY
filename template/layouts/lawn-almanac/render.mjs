// Layout "lawn-almanac": a horticulturist's field journal. Pen-drawn plants, handwritten margin
// notes, a month-by-month garden calendar, seed-packet price cards.
// Order: journal hero, this month, services with margin notes, seed packets, the lawn we fixed,
// letter from the owner, neighbor notes, where we garden, estimate, FAQ.
import { kit, esc, when, money } from "../_kit.mjs";


// A pen-drawn fern frond: a curved stem with paired leaflets that shrink toward the tip.
// Deterministic, so every build draws the same plant.
function fern({ w = 160, h = 360, cls = "fern", pairs = 15 } = {}) {
  const pts = [], leaf = [];
  for (let i = 0; i <= pairs; i++) {
    const t = i / pairs, y = h - 10 - t * (h - 30), x = w / 2 + Math.sin(t * 2.2) * 18 * t;
    pts.push([x, y]);
    if (i > 0 && i < pairs) {
      const len = (1 - t) * (w * 0.42) + 6, lift = 10 + t * 6;
      for (const side of [-1, 1]) leaf.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} q ${(side * len * 0.55).toFixed(1)} ${(-lift - 8).toFixed(1)} ${(side * len).toFixed(1)} ${(-lift).toFixed(1)} q ${(-side * len * 0.45).toFixed(1)} ${(4).toFixed(1)} ${(-side * len).toFixed(1)} ${(lift).toFixed(1)}"/>`);
    }
  }
  const stem = "M" + pts.map(p => p.map(n => n.toFixed(1)).join(" ")).join(" L");
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path d="${stem}" fill="none"/>${leaf.join("")}</svg>`;
}

// A small sprig for section marks and the seed packets.
const sprig = (cls = "sprig") => `<svg class="${cls}" viewBox="0 0 60 60" aria-hidden="true" focusable="false"><path d="M30 56 C30 40 28 26 34 6" fill="none"/><path d="M31 40 q-14 -4 -18 -16 q12 2 18 16z"/><path d="M32 28 q12 -6 16 -18 q-12 4 -16 18z"/><path d="M33 16 q-8 -2 -10 -10 q8 2 10 10z"/></svg>`;

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, cal = s.calendar || {};
  const cur = (cal.months || [])[(cal.current || 1) - 1];

  return `${k.head(css)}
<body${k.demo ? ' class="has-demo"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="mark" href="#main">${sprig("mark-sprig")}<span><i>${esc(b.name)}</i><small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections"><a href="#month">This month</a><a href="#prices">Prices</a><a href="#notes">Reviews</a><a href="#faq">Questions</a></nav>
    <div class="top-act">${k.call("header", k.phone, "top-call")}${k.book("header", "Free estimate", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="entry">Field journal · ${esc(b.address?.city || "")}, ${esc(b.address?.region || "")}</p>
      <h1>${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", s.hero.cta)}<span class="or">or</span>${k.call("hero", `call ${k.phone}`, "link")}</div>
      ${k.rating("rating")}
    </div>
    <div class="hero-plate">
      ${k.shot(s.hero.image, s.hero.imageAlt, s.hero.note, "plate", true)}
      ${fern({ cls: "fern hero-fern" })}
    </div>
  </div>
</section>

${when(cur, `<section class="month" id="month" aria-labelledby="month-h">
  <div class="wrap">
    <div class="month-head"><h2 id="month-h">${esc(cal.headline || "This month")}</h2><p class="month-now"><span class="hand">${esc(cur.m)}:</span> ${esc(cur.do)}</p></div>
    <ol class="cal">${cal.months.map((x, i) => `<li${i + 1 === cal.current ? ' class="now" aria-current="true"' : ""}><b>${esc(x.m)}</b><span>${esc(x.do)}</span></li>`).join("")}</ol>
  </div>
</section>`)}

<section class="svc">
  <div class="wrap">
    <h2 class="sec-h">${sprig()}${esc(s.servicesHeadline || "What we do")}</h2>
    <div class="entries">${(s.services || []).map(x => `<article class="entry-row">
      <div class="entry-main"><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p><p class="from">${x.from != null ? `from ${money(x.from)}` : esc(x.priceText || "")}</p></div>
      ${when(x.note, `<p class="hand margin">${esc(x.note)}</p>`)}
    </article>`).join("")}</div>
    ${when(s.trust?.length, `<ul class="creds">${s.trust.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`)}
  </div>
</section>

<section class="packets-sec" id="prices">
  <div class="wrap">
    <h2 class="sec-h">${sprig()}${esc(s.pricing?.headline || "Prices")}</h2>
    <p class="sec-sub">${esc(s.pricing?.sub || "")}</p>
    <div class="packets">${(s.packages || []).map(p => `<article class="packet${p.popular ? " pop" : ""}">
      <div class="flap" aria-hidden="true"></div>
      ${when(p.popular, `<p class="stamp">${esc(p.popularLabel || "Popular")}</p>`)}
      <p class="latin">${esc(p.latin || "")}</p>
      <h3>${esc(p.name)}</h3>
      <p class="pk-price">${esc(p.price)} <small>${esc(p.unit || "")}</small></p>
      <p class="pk-note">${esc(p.note || "")}</p>
      <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="sow"><b>Best time</b> ${esc(p.season || "")}</p>
      ${k.book("packet " + p.name, "Price my yard", "btn btn-packet", ` data-pick="${esc(p.name)}"`)}
    </article>`).join("")}</div>
    ${when(s.addon, `<p class="addon"><b>Add on:</b> ${esc(s.addon.name)}, ${esc(s.addon.price)} ${esc(s.addon.unit || "")}. ${esc(s.addon.note || "")}</p>`)}
    <p class="sec-sub small">${esc(s.pricing?.fine || "")}</p>
  </div>
</section>

<section class="specimen">
  <div class="wrap spec-in">
    <div><h2 class="sec-h">${esc(s.work?.headline || "Recent work")}</h2><p class="sec-sub">${esc(s.work?.body || "")}</p>
    ${when(s.guarantee, `<div class="promise"><h3>${esc(s.guarantee.title)}</h3><p>${esc(s.guarantee.body)}</p></div>`)}</div>
    <div class="spec-sheet">${k.compare(s.work?.compare)}<p class="spec-label"><span>Specimen</span> ${esc(s.work?.compare?.caption || "")}</p></div>
  </div>
</section>

${when(s.owner, `<section class="letter">
  <div class="wrap letter-in">
    ${k.shot(s.owner.photo, `${s.owner.name} in a client's garden`, "Shot list: Ruth kneeling at a bed edge, hands in soil, overcast light.", "owner-shot")}
    <div class="letter-body">
      <p class="entry">From the notebook</p>
      <h2>${esc(s.owner.name)}, ${esc(s.owner.role || "")}</h2>
      <p class="story">${esc(s.owner.story)}</p>
      <p class="hand sign">${esc(s.owner.sign || s.owner.name)}</p>
      <p class="lic">${esc(b.license || "")}</p>
    </div>
  </div>
</section>`)}

<section class="notes" id="notes">
  <div class="wrap">
    <div class="notes-head"><h2 class="sec-h">${sprig()}${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="cards" role="list">${k.reviews().map(x => `<figure class="card" role="listitem"><figcaption><time datetime="${esc(x.date || "")}">${k.date(x.date, "long")}</time> · ${esc(x.where || "")}</figcaption>${k.stars(x.stars, false)}<blockquote>${esc(x.text)}</blockquote><p class="who">${esc(x.name)}</p></figure>`).join("")}</div>
  </div>
</section>

<section class="where" id="areas">
  <div class="wrap where-in">
    <div><h2 class="sec-h">${esc(s.areas?.headline || "Where we work")}</h2><p class="sec-sub">${esc(s.areas?.body || "")}</p></div>
    <ul class="places">${(s.areas?.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
  </div>
</section>

<section class="book" id="book">
  <div class="wrap book-in">
    <div class="book-copy">
      ${fern({ cls: "fern book-fern", pairs: 11, h: 280 })}
      <p class="entry">${esc(s.booking?.eyebrow || "Estimate")}</p>
      <h2 id="book-h">${esc(s.booking?.headline || "Get a free estimate")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Rather talk? ${k.call("book section", k.phone, "link")} or ${k.text("book section", "send a text", "link")}.</p>
    </div>
    ${k.form({ cls: "quote" })}
  </div>
</section>

${when(s.faq?.length, `<section class="qa" id="faq"><div class="wrap narrow"><h2 class="sec-h">${sprig()}${esc(s.faqHeadline || "Questions we hear on garden walks")}</h2>${k.faq()}</div></section>`)}

<section class="final"><div class="wrap narrow"><h2>${esc(s.final?.headline || "")}</h2><p>${esc(s.final?.sub || "")}</p><div class="ctas">${k.book("final")}${k.text("final", "Text a photo of the lawn", "link")}</div></div></section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div><i class="foot-name">${esc(b.name)}</i><br>${k.addr()} · ${esc(b.hoursText || "")}</div>
    <p>${k.call("footer", k.phone, "link")}${when(b.email, ` · <a class="link" href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}<br>${esc(b.license || "")}</p>
    <p class="credit">${k.credit()}</p>
  </div>
</footer>
${k.sticky("sticky")}
${k.scripts()}
</body>
</html>
`;
}
