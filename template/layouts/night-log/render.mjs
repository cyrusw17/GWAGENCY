// Layout "night-log": an after-hours commercial cleaning crew, told through one night in one building.
// A drawn 3D office floor (Zdog, loaded after first paint) where the crew's cart goes room to room and
// each room's lights go off as it's done, next to the night log a client gets by email. The page
// follows the company's clock: during the night shift it shows which room the crew would be in.
// Then the credentials a facility manager checks, a night planner (building, square feet, cleanings a
// week -> crew and hours, no prices: these are bid per building), what we clean,
// before/after, reviews, the owner, where the crews go, the walkthrough request and FAQ.
// log.js only adds behavior; without it the page shows a drawn floor plan and the full log.
import { kit, esc, when } from "../_kit.mjs";
export const behavior = "funnel.js"; // the step form and tracking from template/funnel.js
export const scripts = ["zdog.min.js", "log.js"]; // log.js pulls in zdog.min.js itself, after first paint

// The still floor plan: what shows before (or without) the 3D one.
const poster = `<svg class="floor-still" viewBox="0 0 520 400" role="img" aria-label="Drawing of an office floor plan at night with six rooms">
  <rect x="30" y="30" width="460" height="340" fill="#2A3038" stroke="#8C98A4" stroke-width="4"/>
  <g fill="#3A424C" stroke="#8C98A4" stroke-width="3"><rect x="30" y="30" width="150" height="120"/><rect x="180" y="30" width="190" height="200"/><rect x="370" y="30" width="120" height="120"/><rect x="30" y="150" width="150" height="220"/><rect x="370" y="150" width="120" height="220"/><rect x="180" y="230" width="190" height="140"/></g>
  <g fill="#F4E7B8" opacity=".85"><rect x="200" y="50" width="150" height="160"/><rect x="390" y="170" width="80" height="180"/></g>
  <g fill="#2BB673"><circle cx="105" cy="90" r="10"/><circle cx="430" cy="90" r="10"/><circle cx="105" cy="260" r="10"/><circle cx="275" cy="300" r="10"/></g>
</svg>`;

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, lg = s.log || {}, pl = s.planner || {}, ld = s.lead || {}, cr = s.credentials;
  const nav = [["#log", "Night log"], ["#trust", "Credentials"], ["#bid", "Services"], ["#faq", "FAQ"]];
  const logJson = JSON.stringify({ tz: lg.tz || "America/New_York", rooms: (lg.rooms || []).map(r => [r.key, r.name, r.t]) }).replace(/</g, "\\u003c");
  const planJson = JSON.stringify({ types: pl.types || [] }).replace(/</g, "\\u003c");

  return `${k.head(css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="14" cy="20" r="8"/><path d="M22 20h14M30 20v6M35 20v4"/></svg><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", `<span class="top-num">${k.phone}</span>`, "top-call", ` aria-label="Call ${k.phone}"`)}${k.book("header", "Request a walkthrough", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="clock" data-clock hidden><span class="dot" aria-hidden="true"></span><span data-clock-text></span></p>
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero")}${k.call("hero", `Call ${k.phone}`, "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <div class="building" id="log">
      <div class="stage">
        ${poster}
        <canvas class="floor-3d" data-floor aria-hidden="true" tabindex="-1"></canvas>
        <div class="stage-tools">
          <button type="button" class="tool" data-next-room>Clean the next room</button>
          <button type="button" class="tool" data-pause aria-pressed="false">Pause motion</button>
        </div>
        <p class="stage-hint">Drag the floor to turn it.</p>
      </div>
      <div class="logsheet">
        <h2 class="log-h">${esc(lg.title || "Last night's log")}</h2>
        <ol class="log" data-log>${(lg.rooms || []).map(r => `<li data-room="${esc(r.key)}"><time>${esc(r.t)}</time><b>${esc(r.name)}</b><span>${esc(r.did)}</span></li>`).join("")}</ol>
        <p class="log-close">${esc(lg.close || "")}</p>
      </div>
    </div>
  </div>
</section>

<ul class="trust wrap" aria-label="At a glance">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>

${when(cr, `<section class="creds wrap" id="trust" aria-labelledby="cred-h">
  <h2 id="cred-h">${esc(cr?.headline || "")}</h2>
  <dl class="cred-list">${(cr?.items || []).map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>
  <p class="ind-h">Buildings we clean</p>
  <ul class="towns inds">${(cr?.industries || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
  <p class="fine">${esc(cr?.note || "")}</p>
</section>`)}

<section class="est-sec wrap" aria-labelledby="est-h">
  <div class="est">
    <div class="est-in">
      <h2 id="est-h">${esc(pl.title || "Plan your building's night")}</h2>
      <p class="est-sub">${esc(pl.sub || "")}</p>
      <form class="est-form" data-plan="${esc(planJson)}">
        <label for="est-type">Building</label>
        <select id="est-type">${(pl.types || []).map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join("")}</select>
        <label for="est-sqft">Square feet <output for="est-sqft" data-sqft-out>4,000</output></label>
        <input type="range" id="est-sqft" min="500" max="30000" step="500" value="4000">
        <fieldset class="nights"><legend>Cleanings a week</legend>${[1, 2, 3, 5].map(n => `<label><input type="radio" name="nights" value="${n}"${n === 5 ? " checked" : ""}><span>${n}</span></label>`).join("")}</fieldset>
      </form>
    </div>
    <div class="est-out" aria-live="polite">
      <p class="est-label">A night at your building <span class="sample-tag">(for illustration)</span></p>
      <p class="est-num"><span data-plan-crew>1 cleaner</span><small data-plan-hours> · about 1.5 hours</small></p>
      <p class="est-line" data-plan-line>6:00 pm to 7:30 pm, 5 nights a week.</p>
      <p class="est-note">${esc(pl.note || "")}</p>
      ${k.book("planner", "Request a walkthrough", "btn btn-go", " data-plan-book")}
    </div>
  </div>
</section>

<section class="bid wrap" id="bid" aria-labelledby="bid-h">
  <div class="bid-head"><h2 id="bid-h">${esc(s.pricing?.headline || "What we clean")}</h2><p>${esc(s.pricing?.sub || "")}</p></div>
  <ol class="sheet">${(s.packages || []).map((p, i) => `<li class="row">
    <p class="row-no" aria-hidden="true">${String(i + 1).padStart(2, "0")}</p>
    <div class="row-main"><h3>${esc(p.name)}</h3><p class="row-note">${esc(p.note || "")}</p>
    <ul class="incl">${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul></div>
  </li>`).join("")}${(s.services || []).map(x => `<li class="row"><p class="row-no" aria-hidden="true">—</p><div class="row-main"><h3>${esc(x.name)}</h3><p class="row-note">${esc(x.desc)}</p></div></li>`).join("")}</ol>
  <p class="fine">${esc(s.pricing?.fine || "")}</p>
</section>

<section class="work" aria-labelledby="work-h">
  <div class="wrap work-in">
    <h2 id="work-h">${esc(s.work?.headline || "Recent work")}</h2>
    <div class="work-cmp">${k.compare(s.work?.compare)}<p class="fine">${esc(s.work?.compare?.caption || "Drag to compare.")}</p></div>
    ${when(s.guarantee, `<div class="promise"><h3>${esc(s.guarantee.title)}</h3><p>${esc(s.guarantee.body)}</p>${k.text("guarantee", "Text the office", "btn btn-line")}</div>`)}
  </div>
</section>

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list" tabindex="0" aria-label="Customer reviews (sample)">${k.reviews().map(x => `<div role="listitem"><figure class="rev">${k.stars(x.stars)}<blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
</section>

${when(s.owner, `<section class="owner" aria-labelledby="owner-h">
  <div class="wrap owner-in">
    ${k.shot(s.owner.photo, `${s.owner.name} at a client's front desk`, s.owner.shot || "", "owner-shot")}
    <div class="note-card"><h2 id="owner-h">${esc(s.owner.name)}</h2><p class="owner-role">${esc(s.owner.role || "")}</p><p class="owner-story">${esc(s.owner.story)}</p><p class="sign">${esc(s.owner.sign || s.owner.name)}</p><p class="lic">${esc(b.license || "")}</p></div>
  </div>
</section>`)}

<section class="areas wrap" id="areas" aria-labelledby="areas-h">
  <h2 id="areas-h">${esc(s.areas?.headline || "Where we work")}</h2>
  <p class="areas-body">${esc(s.areas?.body || "")}</p>
  <ul class="towns">${(s.areas?.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy">
      <h2 id="book-h">${esc(s.booking?.headline || "Request a walkthrough")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Rather talk? ${k.call("book section", k.phone, "alt-link")} or ${k.text("book section", "send a text", "alt-link")}.</p>
    </div>
    <form class="quote" id="lead" data-steps novalidate aria-labelledby="book-h">
      <p class="k-progress" aria-live="polite"><span data-progress>Step 1 of 3</span></p>
      <fieldset data-step="1" class="on">
        <legend>${esc(ld.facility?.question || "What kind of facility?")}</legend>
        <div class="choices two">${(ld.facility?.options || []).map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x)}" id="kind-${i}"><span><b>${esc(x)}</b></span></label>`).join("")}</div>
        <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="2">
        <legend>${esc(ld.step2 || "About the building")}</legend>
        <label for="f-service">Approximate square feet</label>
        <select name="service" id="f-service">${(ld.sizes || []).map(n => `<option>${esc(n)}</option>`).join("")}</select>
        <fieldset class="nights f-nights"><legend>Cleanings a week</legend>${(ld.nights || []).map((n, i) => `<label><input type="radio" name="per_week" value="${esc(n)}"${i === 2 ? " checked" : ""}><span>${esc(n)}</span></label>`).join("")}</fieldset>
        <label for="f-notes">Anything we should know? <span class="opt">(optional)</span></label>
        <textarea name="notes" id="f-notes" maxlength="1000" rows="3" placeholder="${esc(ld.notesHint || "")}"></textarea>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="3">
        <legend>${esc(ld.step3 || "Where should we send the bid?")}</legend>
        <label for="f-name">Your name</label>
        <input name="name" id="f-name" autocomplete="name" required>
        <label for="f-org">Company or building <span class="opt">(optional)</span></label>
        <input name="company" id="f-org" autocomplete="organization">
        <label for="f-phone">Phone</label>
        <input name="phone" id="f-phone" type="tel" autocomplete="tel" inputmode="tel">
        <label for="f-email">or email</label>
        <input name="email" id="f-email" type="email" autocomplete="email" pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+">
        <p class="hint">${esc(ld.contactHint || "")}</p>
        <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button class="btn btn-go" type="submit">${esc(ld.submit || "Request a walkthrough")}</button></div>
        <p class="note">${esc(ld.privacy || "")}</p>
      </fieldset>
      <p class="k-status" role="status" aria-live="polite" tabindex="-1"></p>
    </form>
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec" id="faq" aria-labelledby="faq-h"><div class="wrap narrow"><h2 id="faq-h">${esc(s.faqHeadline || "Questions office managers ask")}</h2>${k.faq()}</div></section>`)}

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
<script type="application/json" id="log-data">${logJson}</script>
${k.scripts()}
<script src="log.js" defer></script>
</body>
</html>
`;
}
