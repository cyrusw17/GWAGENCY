// Layout "open-house": a small home team whose weekends are open houses, laid out like a
// departures board. Saturday and Sunday tabs list each open house (time, street, price, beds);
// picking a row puts that house on the big screen, and "Add to my route" builds a weekend route
// the visitor can send to the team, which fills the request form. Then a reel of the houses,
// the seller side (what hosting an open house with the team looks like), the team, reviews,
// the request form with text consent, FAQ and a footer with brokerage, license and Equal Housing.
// board.js only adds behavior; without it both days' rows show and the first house is on screen.
import { kit, esc, when, url } from "../_kit.mjs";
export const behavior = "funnel.js";
export const scripts = ["board.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, days = s.board?.days || [], ld = s.lead || {}, all = days.flatMap(d => d.rows);
  const first = all[0] || {};
  const nav = [["#board", "Open houses"], ["#reel", "Homes"], ["#sell", "Selling"], ["#team", "Team"], ["#faq", "FAQ"]];
  const row = (r, d) => `<li class="row" data-row="${esc(r.id)}" data-img="${url(r.img)}" data-alt="${esc(r.alt || r.street)}" data-name="${esc(r.street)}" data-time="${esc(d.label + " " + r.time)}">
      <button type="button" class="pick" aria-describedby="sel-${esc(r.id)}"><span class="t">${esc(r.time)}</span><span class="st"><b>${esc(r.street)}</b><small>${esc(r.hood)}</small></span><span class="pr">${usd(r.price)}</span><span class="bd">${esc(r.beds)}bd ${esc(r.baths)}ba</span></button>
      <span class="sr-only" id="sel-${esc(r.id)}">Show this house</span>
      <button type="button" class="add" data-add="${esc(r.id)}" aria-pressed="false"><span class="sr-only">Add ${esc(r.street)} to my route</span><span aria-hidden="true">+ Route</span></button>
    </li>`;

  return `${k.head(css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true"><path d="M2 34 14 14l7 10 6-8 11 18z" fill="#D9A441"/><path d="M2 34 14 14l7 10" fill="none" stroke="#1D2124" stroke-width="2"/></svg><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", k.phone, "top-call")}${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap">
    <h1 id="h1">${esc(s.hero.headline)}</h1>
    <p class="lede">${esc(s.hero.sub)}</p>
  </div>
  <div class="wrap board-wrap" id="board">
    <div class="board">
      <div class="board-top">
        <p class="b-title">${esc(s.board?.title || "Open houses")} ${when(k.demo, '<span class="sample-tag">(sample)</span>')}</p>
        <div class="tabs" role="group" aria-label="Day">${days.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${i === 0}">${esc(d.label)}</button>`).join("")}</div>
      </div>
      <div class="cols" aria-hidden="true"><span>Time</span><span>Street</span><span>Price</span><span>Beds</span><span></span></div>
      ${days.map((d, i) => `<div class="day" data-daypanel="${i}"><p class="day-h">${esc(d.label)}</p><ol class="rows">${d.rows.map(r => row(r, d)).join("")}</ol></div>`).join("")}
      <p class="b-note">${esc(s.board?.note || "")}</p>
    </div>
    <div class="screen">
      <figure class="scr-pic"><img data-screen src="${url(first.img)}" alt="${esc(first.alt || first.street || "")}" width="1200" height="800" fetchpriority="high"><figcaption>${esc(s.artNote || "")}</figcaption></figure>
      <p class="scr-cap"><span data-screen-time>${esc((days[0]?.label || "") + " " + (first.time || ""))}</span> · <b data-screen-name>${esc(first.street || "")}</b></p>
      <div class="route">
        <p class="route-h">My route <span data-route-n>(0 stops)</span></p>
        <ol class="route-list" data-route><li class="empty">Tap + Route on any open house to plan your weekend.</li></ol>
        ${k.book("route", s.board?.routeCta || "Send me this route", "btn btn-go", " data-route-send")}
      </div>
    </div>
  </div>
</section>

<ul class="trust wrap" aria-label="At a glance">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>

<section class="reel" id="reel" aria-labelledby="reel-h">
  <div class="wrap"><h2 id="reel-h">${esc(s.reel?.headline || "")}</h2><p class="sub">${esc(s.reel?.sub || "")}</p></div>
  <ul class="strip" tabindex="0" aria-label="Homes the team has listed (sample)">${(s.reel?.items || []).map(x => `<li><figure><img src="${url(x.img)}" alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><figcaption><b>${esc(x.hood)}</b> ${esc(x.line)}</figcaption></figure></li>`).join("")}</ul>
  <p class="wrap fine">${esc(s.reel?.fine || "")}</p>
</section>

<section class="sell wrap" id="sell" aria-labelledby="sell-h">
  <div class="sell-copy">
    <h2 id="sell-h">${esc(s.sell?.headline || "")}</h2>
    <p class="sub">${esc(s.sell?.sub || "")}</p>
    ${k.book("sell", s.sell?.cta || "What's my home worth?", "btn btn-go")}
  </div>
  <ol class="sched">${(s.sell?.steps || []).map(([t, w, d]) => `<li><span class="when">${esc(t)}</span><div><b>${esc(w)}</b><p>${esc(d)}</p></div></li>`).join("")}</ol>
</section>

<section class="team" id="team" aria-labelledby="team-h">
  <div class="wrap">
    <h2 id="team-h">${esc(s.team?.headline || "")}</h2>
    <p class="sub">${esc(s.team?.sub || "")}</p>
    <ul class="people">${(s.team?.people || []).map(p => `<li>${k.shot(p.photo, p.name, p.shot, "p-shot")}<h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p>${esc(p.line)}</p><p class="lic">${esc(p.license || "")}</p></li>`).join("")}</ul>
  </div>
</section>

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
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
        <legend>${esc(ld.start?.question || "What can we help with?")}</legend>
        <div class="choices">${(ld.start?.options || []).map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x.value)}" id="kind-${i}"><span><b>${esc(x.value)}</b>${when(x.hint, `<small>${esc(x.hint)}</small>`)}</span></label>`).join("")}</div>
        <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="2">
        <legend>${esc(ld.step2 || "Where and when?")}</legend>
        <label for="f-service">Neighborhood</label>
        <select name="service" id="f-service">${(ld.areas || []).map(a => `<option>${esc(a)}</option>`).join("")}<option>Not sure yet</option></select>
        <label for="f-when">Timeline</label>
        <select name="timeline" id="f-when">${(ld.timelines || []).map(t => `<option>${esc(t)}</option>`).join("")}</select>
        <label for="f-notes">Anything we should know? <span class="opt">(optional)</span></label>
        <textarea name="notes" id="f-notes" maxlength="1000" rows="4" placeholder="${esc(ld.notesHint || "")}"></textarea>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="3">
        <legend>${esc(ld.step3 || "How should we reach you?")}</legend>
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
<script src="board.js" defer></script>
</body>
</html>
`;
}
