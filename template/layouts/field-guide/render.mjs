// Layout "field-guide": a solo real estate agent who sells a city one neighborhood at a time.
// The hero is a map the agent "drew": tap a neighborhood and her field note opens (the houses, the
// drive downtown, what's walkable, her one piece of advice). Fair housing: notes describe houses,
// streets and drive times, never who lives there, schools or safety. Then the two ways she works
// (selling, buying) as day-by-day timelines, a rough seller net sheet, a recently-sold notebook,
// reviews, her note, the 3-step request form with text consent, FAQ, and a footer with the
// brokerage, license number and Equal Housing statement. guide.js only adds behavior; without it
// every field note is listed under the map and the net sheet shows its default numbers.
import { kit, esc, when } from "../_kit.mjs";
export const behavior = "funnel.js"; // tracking and the step form
export const scripts = ["guide.js"];

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, g = s.guide || {}, ns = s.netsheet || {}, ld = s.lead || {}, ow = s.owner || {};
  const hoods = g.hoods || [];
  // Net sheet defaults, worked out here too so the slip reads right before (or without) guide.js.
  const usd = n => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
  const nP = Number(ns.price) || 300000, nC = Number(ns.comm) || 5, nO = Number(ns.payoff) || 150000, nK = Number(ns.costsPct) || 1.5;
  const slip = { price: usd(nP), comm: "- " + usd(nP * nC / 100), costs: "- " + usd(nP * nK / 100), pay: "- " + usd(nO), net: usd(nP * (1 - nC / 100 - nK / 100) - nO) };
  const nav = [["#guide", "Neighborhoods"], ["#how", "Selling & buying"], ["#net", "Net sheet"], ["#sold", "Recently sold"], ["#faq", "FAQ"]];
  const note = (h, i) => `<article class="fnote${i === 0 ? " on" : ""}" id="note-${esc(h.key)}" data-note="${esc(h.key)}" aria-labelledby="nh-${esc(h.key)}">
      <p class="fn-tag">Field note ${String(i + 1).padStart(2, "0")}</p>
      <h3 id="nh-${esc(h.key)}">${esc(h.name)}</h3>
      <dl><div><dt>The houses</dt><dd>${esc(h.houses)}</dd></div><div><dt>Drive downtown</dt><dd>${esc(h.drive)}</dd></div><div><dt>Close by</dt><dd>${esc(h.near)}</dd></div></dl>
      <p class="hand">${esc(h.note)}</p>
    </article>`;

  return `${k.head(css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><span class="mono-mark" aria-hidden="true">${esc(b.initials || "")}</span><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", `<span class="top-num">${k.phone}</span>`, "top-call", ` aria-label="Call ${k.phone}"`)}${k.book("header", s.booking?.headerCta || "Talk to Nadia", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", k.bookLabel)}${k.text("hero", "Text Nadia", "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <div class="guide" id="guide">
      <div class="map-wrap">
        <p class="map-title" id="map-h">${esc(g.title || "The neighborhoods I know street by street")}</p>
        <svg class="map" viewBox="0 0 600 470" role="group" aria-labelledby="map-h">
          <rect x="6" y="6" width="588" height="458" rx="6" class="paper"/>
          <path class="ridge" d="M40 70c30-30 80-34 110-10M28 120c40-18 90-14 120 6M180 470c10-40 40-70 70-90M210 470c12-34 34-60 64-76"/>
          <path class="river" d="M600 118c-60 6-120 26-170 52s-58 58-92 72-90 4-122 30-30 64-74 62-50-58-20-82 70-16 64-52-60-30-96-6-60 60-90 70"/>
          <text class="river-l" x="452" y="150" transform="rotate(-14 452 150)">${esc(g.river || "")}</text>
          ${(g.roads || []).map(rd => `<path class="road" d="${esc(rd.d)}"/><text class="road-l" x="${Number(rd.x) || 0}" y="${Number(rd.y) || 0}">${esc(rd.label)}</text>`).join("")}
          ${(g.marks || []).map(m => `<text class="mark-l" x="${Number(m.x) || 0}" y="${Number(m.y) || 0}">${esc(m.label)}</text>`).join("")}
          ${hoods.map(h => `<g class="pin" data-pin="${esc(h.key)}"><a href="#note-${esc(h.key)}" aria-label="${esc(h.name)}" data-pin-link="${esc(h.key)}"><circle cx="${Number(h.x) || 0}" cy="${Number(h.y) || 0}" r="30" class="hit"/><circle cx="${Number(h.x) || 0}" cy="${Number(h.y) || 0}" r="11" class="dot"/><text x="${(Number(h.x) || 0) + (h.lx ?? 17)}" y="${(Number(h.y) || 0) + (h.ly ?? 7)}" class="lab"${h.anchor ? ` text-anchor="${esc(h.anchor)}"` : ""}>${esc(h.name)}</text></a></g>`).join("")}
          <text class="compass" x="548" y="44">N ↑</text>
        </svg>
        <p class="map-hint">${esc(g.hint || "Tap a neighborhood for my notes.")}</p>
      </div>
      <div class="notes" data-notes>${hoods.map(note).join("")}</div>
      <p class="fair">${esc(g.fair || "")}</p>
    </div>
  </div>
</section>

<ul class="trust wrap" aria-label="At a glance">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>

<section class="how wrap" id="how" aria-labelledby="how-h">
  <h2 id="how-h">${esc(s.paths?.headline || "")}</h2>
  <p class="sub">${esc(s.paths?.sub || "")}</p>
  <div class="tracks">${(s.paths?.tracks || []).map(t => `<div class="track">
    <h3>${esc(t.name)}</h3>
    <ol>${(t.steps || []).map(st => `<li><span class="day">${esc(st.day)}</span><b>${esc(st.what)}</b><span class="d">${esc(st.detail)}</span></li>`).join("")}</ol>
    ${k.book(t.name, t.cta, "btn btn-line")}
  </div>`).join("")}</div>
  <p class="fine">${esc(s.paths?.fine || "")}</p>
</section>

<section class="net" id="net" aria-labelledby="net-h">
  <div class="wrap net-in">
    <div>
      <h2 id="net-h">${esc(ns.title || "Rough net sheet")}</h2>
      <p class="sub">${esc(ns.sub || "")}</p>
      <form class="net-form" data-net="${esc(JSON.stringify({ costs: Number(ns.costsPct) || 1.5 }))}" onsubmit="return false">
        <label for="n-price">Sale price <output for="n-price" data-out="price">$${(Number(ns.price) || 300000).toLocaleString("en-US")}</output></label>
        <input type="range" id="n-price" min="100000" max="1200000" step="5000" value="${Number(ns.price) || 300000}">
        <label for="n-comm">Total commission you agree to <output for="n-comm" data-out="comm">${Number(ns.comm) || 5}%</output></label>
        <input type="range" id="n-comm" min="0" max="7" step="0.25" value="${Number(ns.comm) || 5}">
        <label for="n-pay">Mortgage payoff</label>
        <div class="money">$<input id="n-pay" type="number" inputmode="numeric" min="0" step="1000" value="${Number(ns.payoff) || 150000}"></div>
      </form>
    </div>
    <div class="slip" aria-live="polite">
      <p class="slip-h">Estimated net to you <span class="sample-tag">(sample math)</span></p>
      <dl>
        <div><dt>Sale price</dt><dd data-r="price">${slip.price}</dd></div>
        <div><dt>Commission</dt><dd data-r="comm">${slip.comm}</dd></div>
        <div><dt>Title, closing and prorations, about ${esc(String(Number(ns.costsPct) || 1.5))}%</dt><dd data-r="costs">${slip.costs}</dd></div>
        <div><dt>Mortgage payoff</dt><dd data-r="pay">${slip.pay}</dd></div>
        <div class="tot"><dt>Roughly yours at closing</dt><dd data-r="net">${slip.net}</dd></div>
      </dl>
      <p class="fine">${esc(ns.note || "")}</p>
      ${k.book("net sheet", ns.cta || "Get my real net sheet", "btn btn-go")}
    </div>
  </div>
</section>

<section class="sold wrap" id="sold" aria-labelledby="sold-h">
  <h2 id="sold-h">${esc(s.sold?.headline || "Recently sold")} ${when(k.demo, '<span class="sample-tag">(sample)</span>')}</h2>
  <ol class="nb">${(s.sold?.items || []).map(x => `<li>
    ${k.shot(x.photo, x.alt, x.shot, "nb-shot")}
    <div class="nb-txt"><p class="nb-where">${esc(x.where)}</p><h3>${esc(x.what)}</h3><p class="nb-meta">${esc(x.meta)}</p><p class="hand">${esc(x.note)}</p></div>
  </li>`).join("")}</ol>
  <p class="fine">${esc(s.sold?.fine || "")}</p>
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap">
    <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
  </div>
</section>

${when(s.owner, `<section class="owner wrap" aria-labelledby="owner-h">
  ${k.shot(ow.photo, `${ow.name}, ${b.tagline || ""}`, ow.shot || "", "owner-shot")}
  <div class="letter"><h2 id="owner-h">${esc(ow.headline || "")}</h2>${(ow.story || []).map(p => `<p>${esc(p)}</p>`).join("")}<p class="sign">${esc(ow.sign || ow.name)}</p><p class="lic">${esc(b.license || "")}</p></div>
</section>`)}

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy">
      <h2 id="book-h">${esc(s.booking?.headline || "")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Rather talk now? ${k.call("book section", k.phone, "alt-link")} or ${k.text("book section", "send a text", "alt-link")}.</p>
    </div>
    <form class="quote" id="lead" data-steps novalidate aria-labelledby="book-h">
      <p class="k-progress" aria-live="polite"><span data-progress>Step 1 of 3</span></p>
      <fieldset data-step="1" class="on">
        <legend>${esc(ld.start?.question || "What are you thinking about?")}</legend>
        <div class="choices">${(ld.start?.options || []).map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x.value)}" id="kind-${i}"><span><b>${esc(x.value)}</b>${when(x.hint, `<small>${esc(x.hint)}</small>`)}</span></label>`).join("")}</div>
        <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="2">
        <legend>${esc(ld.step2 || "Where and when?")}</legend>
        <label for="f-service">Neighborhood</label>
        <select name="service" id="f-service">${hoods.map(h => `<option>${esc(h.name)}</option>`).join("")}<option>Somewhere else nearby</option><option>Not sure yet</option></select>
        <label for="f-when">Timeline</label>
        <select name="timeline" id="f-when">${(ld.timelines || []).map(t => `<option>${esc(t)}</option>`).join("")}</select>
        <label for="f-notes">Address or anything I should know <span class="opt">(optional)</span></label>
        <textarea name="notes" id="f-notes" maxlength="1000" rows="3" placeholder="${esc(ld.notesHint || "")}"></textarea>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="3">
        <legend>${esc(ld.step3 || "How should I reach you?")}</legend>
        <label for="f-name">Your name</label>
        <input name="name" id="f-name" autocomplete="name" required>
        <label for="f-phone">Mobile number</label>
        <input name="phone" id="f-phone" type="tel" autocomplete="tel" inputmode="tel">
        <label for="f-email">or email</label>
        <input name="email" id="f-email" type="email" autocomplete="email" pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+">
        <p class="hint">${esc(ld.contactHint || "")}</p>
        <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
        <p class="consent">${esc(ld.consent || "")}</p>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button class="btn btn-go" type="submit">${esc(ld.submit || "Send")}</button></div>
        <p class="note">${esc(ld.privacy || "")}</p>
      </fieldset>
      <p class="k-status" role="status" aria-live="polite" tabindex="-1"></p>
    </form>
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec wrap" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">${esc(s.faqHeadline || "Questions")}</h2>${k.faq()}</section>`)}

<section class="final">
  <div class="wrap final-in"><h2>${esc(s.final?.headline || "")}</h2><p>${esc(s.final?.sub || "")}</p><div class="ctas">${k.book("final", k.bookLabel)}${k.call("final", `Call ${k.phone}`, "btn btn-line")}</div></div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div><b>${esc(b.name)}</b><br>${esc(b.brokerage || "")}<br>${k.addr()}<br>${esc(b.license || "")}</div>
    <div><b>Call or text</b><br>${k.call("footer", k.phone, "foot-link")}<br>${esc(b.hoursText || "")}${when(b.email, `<br><a class="foot-link" href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}</div>
    <p class="eho"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M20 4 3 16h4v18h26V16h4z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 20h14M13 26h14" stroke="currentColor" stroke-width="3"/></svg><span>${esc(s.eho || "Equal Housing Opportunity.")}</span></p>
    <p class="credit">${k.credit()}</p>
  </div>
</footer>
${k.sticky("sticky")}
${k.scripts()}
<script src="guide.js" defer></script>
</body>
</html>
`;
}
