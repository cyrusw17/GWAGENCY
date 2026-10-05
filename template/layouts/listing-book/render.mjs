// Layout "listing-book": a coastal agent's homes laid out like a printed property book.
// The hero is a two-page spread of one featured house (a big picture, then the spec column),
// then the rest of the book as a filterable grid of listings, a payment worksheet that any
// listing can be loaded into, the buyer's checklist only a coastal agent would write (flood
// zone, elevation certificate, wind deductible, termite letter), the agent's note, reviews,
// the request form with text consent, FAQ and a footer with brokerage, license and Equal
// Housing. book.js only adds the filter and the worksheet math; without it every listing shows
// and the worksheet keeps its server-rendered numbers.
import { kit, esc, when, url } from "../_kit.mjs";
export const behavior = "funnel.js";
export const scripts = ["book.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
// Monthly principal and interest for a fixed-rate loan.
const pi = (loan, rate, years = 30) => { const m = rate / 1200, n = years * 12; return m ? loan * m / (1 - Math.pow(1 + m, -n)) : loan / n; };

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, L = s.listings || [], f = L[0] || {}, ws = s.worksheet || {}, ld = s.lead || {}, ow = s.owner || {};
  const nav = [["#book-list", "Homes"], ["#pay", "Payment"], ["#check", "Buyer's checklist"], ["#faq", "FAQ"]];
  const spec = x => `<dl class="spec"><div><dt>Price</dt><dd>${usd(x.price)}</dd></div><div><dt>Beds</dt><dd>${esc(x.beds)}</dd></div><div><dt>Baths</dt><dd>${esc(x.baths)}</dd></div><div><dt>Sq ft</dt><dd>${Number(x.sqft || 0).toLocaleString("en-US")}</dd></div><div><dt>Built</dt><dd>${esc(x.built)}</dd></div><div><dt>Flood zone</dt><dd>${esc(x.flood)}</dd></div></dl>`;
  const pic = (x, cls, eager) => `<figure class="${cls}"><img src="${url(x.img)}" alt="${esc(x.alt || x.name)}" width="1200" height="800" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${esc(s.artNote || "")}</figcaption></figure>`;
  const band = p => p < 400000 ? "a" : p < 700000 ? "b" : "c";
  // Worksheet defaults, worked out here so the numbers read right without book.js.
  const dP = Number(ws.down) || 10, rate = Number(ws.rate) || 6.5, ti = Number(ws.taxIns) || 0;
  const loan = (Number(f.price) || 0) * (1 - dP / 100), mPI = pi(loan, rate);
  const listJson = JSON.stringify(L.map(x => ({ id: x.id, price: Number(x.price) || 0, ti: Number(x.taxIns) || ti, hoa: Number(x.hoa) || 0 }))).replace(/</g, "\\u003c");
  const ld_ = { "@context": "https://schema.org", "@type": "ItemList", name: s.listingsHeadline || "Homes for sale", itemListElement: L.map((x, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "RealEstateListing", name: x.name, description: (x.notes || []).join(" "), offers: { "@type": "Offer", price: Number(x.price) || undefined, priceCurrency: "USD" } } })) };

  return `${k.head(css, `<script type="application/ld+json">${JSON.stringify(ld_).replace(/</g, "\\u003c")}</script>`)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><span>${esc(b.name)}</span><small>${esc(b.tagline || "")}</small></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", k.phone, "top-call")}${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="spread" aria-labelledby="h1">
  <div class="wrap spread-in">
    <div class="page left">
      ${pic(f, "hero-pic", true)}
      <p class="folio"><span>${esc(s.bookTitle || "")}</span><span>p. 1</span></p>
    </div>
    <div class="page right">
      <p class="status">${esc(f.status || "")} ${when(k.demo, '<span class="sample-tag">(sample listing)</span>')}</p>
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="feat-name">${esc(f.name || "")}, <em>${esc(f.where || "")}</em></p>
      ${spec(f)}
      <ul class="feat-notes">${(f.notes || []).map(n => `<li>${esc(n)}</li>`).join("")}</ul>
      <div class="ctas">${k.book("hero")}<a class="btn btn-line" href="#pay" data-load="${esc(f.id || "")}">Estimate the payment</a></div>
      <p class="lede">${esc(s.hero.sub)}</p>
      <p class="folio"><span>${esc(b.name)}</span><span>p. 2</span></p>
    </div>
  </div>
</section>

<ul class="trust wrap" aria-label="At a glance">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>

<section class="list wrap" id="book-list" aria-labelledby="list-h">
  <div class="list-head">
    <h2 id="list-h">${esc(s.listingsHeadline || "In the book this month")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2>
    <div class="filters" role="group" aria-label="Filter homes">${(s.filters || [["all", "All homes"], ["a", "Under $400k"], ["b", "$400k to $700k"], ["c", "$700k and up"]]).map(([v, t], i) => `<button type="button" data-f="${esc(v)}" aria-pressed="${i === 0}">${esc(t)}</button>`).join("")}</div>
  </div>
  <p class="count" aria-live="polite" data-count>${L.length - 1} more homes in the book</p>
  <ol class="grid">${L.slice(1).map((x, i) => `<li class="card" data-band="${band(x.price)}">
    ${pic(x, "card-pic")}
    <div class="card-txt">
      <p class="pg">p. ${i + 3}</p>
      <p class="status">${esc(x.status || "")}</p>
      <h3>${esc(x.name)}</h3>
      <p class="where">${esc(x.where)}</p>
      <p class="line"><b>${usd(x.price)}</b> · ${esc(x.beds)} bed · ${esc(x.baths)} bath · ${Number(x.sqft || 0).toLocaleString("en-US")} sq ft</p>
      <p class="note">${esc((x.notes || [])[0] || "")}</p>
      <div class="card-act"><a class="link" href="#pay" data-load="${esc(x.id)}">Estimate the payment</a>${k.book("listing " + x.id, "Ask about it", "link link-go")}</div>
    </div>
  </li>`).join("")}</ol>
  <p class="fine">${esc(s.listingsFine || "")}</p>
</section>

<section class="pay" id="pay" aria-labelledby="pay-h">
  <div class="wrap pay-in">
    <div>
      <h2 id="pay-h">${esc(ws.title || "What would it cost a month?")}</h2>
      <p class="sub">${esc(ws.sub || "")}</p>
      <form class="ws" data-ws="${esc(listJson)}" onsubmit="return false">
        <label for="ws-home">Home</label>
        <select id="ws-home">${L.map(x => `<option value="${esc(x.id)}">${esc(x.name)}, ${usd(x.price)}</option>`).join("")}</select>
        <label for="ws-down">Down payment <output for="ws-down" data-o="down">${dP}%</output></label>
        <input type="range" id="ws-down" min="3" max="40" step="1" value="${dP}">
        <label for="ws-rate">Interest rate <output for="ws-rate" data-o="rate">${rate}%</output></label>
        <input type="range" id="ws-rate" min="3" max="9" step="0.125" value="${rate}">
      </form>
    </div>
    <div class="ticket" aria-live="polite">
      <p class="t-h">Monthly, roughly <span class="sample-tag">(sample math)</span></p>
      <p class="t-big" data-r="total">${usd(mPI + (Number(f.taxIns) || ti) + (Number(f.hoa) || 0))}</p>
      <dl>
        <div><dt>Loan</dt><dd data-r="loan">${usd(loan)}</dd></div>
        <div><dt>Principal and interest, 30 years</dt><dd data-r="pi">${usd(mPI)}</dd></div>
        <div><dt>Taxes and insurance, estimated</dt><dd data-r="ti">${usd(Number(f.taxIns) || ti)}</dd></div>
        <div><dt>HOA or POA</dt><dd data-r="hoa">${usd(Number(f.hoa) || 0)}</dd></div>
      </dl>
      <p class="fine">${esc(ws.note || "")}</p>
      ${k.book("payment", ws.cta || "Talk it through", "btn btn-go")}
    </div>
  </div>
</section>

<section class="check wrap" id="check" aria-labelledby="check-h">
  <h2 id="check-h">${esc(s.checklist?.headline || "")}</h2>
  <p class="sub">${esc(s.checklist?.sub || "")}</p>
  <ol class="cl">${(s.checklist?.items || []).map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("")}</ol>
</section>

${when(s.owner, `<section class="owner" aria-labelledby="owner-h">
  <div class="wrap owner-in">
    ${k.shot(ow.photo, `${ow.name}`, ow.shot || "", "owner-shot")}
    <div class="letter"><h2 id="owner-h">${esc(ow.headline || "")}</h2>${(ow.story || []).map(p => `<p>${esc(p)}</p>`).join("")}<p class="sign">${esc(ow.sign || ow.name)}</p><p class="lic">${esc(b.license || "")}</p></div>
  </div>
</section>`)}

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev"><blockquote>${esc(x.text)}</blockquote><figcaption>${k.stars(x.stars)}<b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
</section>

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
        <legend>${esc(ld.start?.question || "What can I help with?")}</legend>
        <div class="choices">${(ld.start?.options || []).map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x.value)}" id="kind-${i}"><span><b>${esc(x.value)}</b>${when(x.hint, `<small>${esc(x.hint)}</small>`)}</span></label>`).join("")}</div>
        <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="2">
        <legend>${esc(ld.step2 || "Which home, and when?")}</legend>
        <label for="f-service">Home or area</label>
        <select name="service" id="f-service">${L.map(x => `<option>${esc(x.name)}</option>`).join("")}${(ld.areas || []).map(a => `<option>${esc(a)}</option>`).join("")}<option>Not sure yet</option></select>
        <label for="f-when">Timeline</label>
        <select name="timeline" id="f-when">${(ld.timelines || []).map(t => `<option>${esc(t)}</option>`).join("")}</select>
        <label for="f-notes">Anything I should know? <span class="opt">(optional)</span></label>
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
<script src="book.js" defer></script>
</body>
</html>
`;
}
