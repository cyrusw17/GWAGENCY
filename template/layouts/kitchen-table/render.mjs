// Layout "kitchen-table": a family team that sells itself as a family first. The hero is a photo
// album on the kitchen table with handwritten captions, then the family story as a timeline, then
// the agent part: "fix it or leave it" (sellers guess, the team answers, with a cost), the listing
// of the month, the two agents, reviews, the request form, FAQ and footer.
// table.js only adds behavior; without it every answer in "fix it or leave it" shows.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["table.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, al = s.album || [], st = s.story || {}, fx = s.fix || {}, lm = s.month || {}, tm = s.team || {};
  const nav = [["#story", "Our story"], ["#fix", "Fix it or leave it"], ["#month", "Listing of the month"], ["#team", "Meet us"], ["#faq", "FAQ"]];

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main">${esc(b.name)}<small>${esc(b.tagline || "")}</small></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, x]) => `<a href="${h}">${x}</a>`).join("")}</nav>
    ${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="hand hello">${esc(s.hero.hello || "")}</p>
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", k.bookLabel, "btn btn-go")}${k.call("hero", `Call ${esc(k.phone)}`, "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <ul class="album" aria-label="Family photos">${al.map((x, i) => `<li class="snap s${i}"><img src="${url(x.img)}" alt="${esc(x.alt)}" width="800" height="${x.tall ? 800 : 533}"><p class="hand">${esc(x.cap)}</p></li>`).join("")}</ul>
  </div>
  <p class="wrap fine art">${esc(s.artNote || "")}</p>
</section>

<section class="story" id="story" aria-labelledby="story-h">
  <div class="wrap">
    <h2 id="story-h">${esc(st.headline || "")}</h2>
    <p class="sub">${esc(st.sub || "")}</p>
    <ol class="time">${(st.items || []).map(([y, h, p]) => `<li><p class="yr">${esc(y)}</p><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="fix wrap" id="fix" aria-labelledby="fix-h">
  <h2 id="fix-h">${esc(fx.headline || "")}</h2>
  <p class="sub">${esc(fx.sub || "")}</p>
  <ol class="cards">${(fx.items || []).map((x, i) => `<li class="card" data-card>
    <h3>${esc(x.thing)}</h3>
    <div class="guess" role="group" aria-label="Your guess for ${esc(x.thing)}"><button type="button" data-guess="fix">Fix it</button><button type="button" data-guess="leave">Leave it</button></div>
    <div class="ans" data-ans="${x.verdict}"><p class="hand verdict">${x.verdict === "fix" ? "We'd fix it." : "Leave it."}</p><p>${esc(x.why)}</p><p class="cost">${esc(x.cost)}</p></div>
  </li>`).join("")}</ol>
  <p class="score" data-score aria-live="polite"></p>
  <p>${k.book("fix", fx.cta || "Walk my house with us", "btn btn-go")}</p>
</section>

<section class="month" id="month" aria-labelledby="month-h">
  <div class="wrap month-in">
    <img src="${url(lm.img)}" alt="${esc(lm.alt || "")}" width="1200" height="800" loading="lazy" decoding="async">
    <div>
      <p class="kick">${esc(lm.kicker || "Listing of the month")} ${when(k.demo, '<span class="sample-tag">(sample listing)</span>')}</p>
      <h2 id="month-h">${esc(lm.name || "")}</h2>
      <p class="price">${usd(lm.price)} · ${esc(lm.line || "")}</p>
      <p>${esc(lm.body || "")}</p>
      <ul class="why">${(lm.notes || []).map(([who, x]) => `<li><b class="hand">${esc(who)}:</b> ${esc(x)}</li>`).join("")}</ul>
      ${k.book("listing of the month", lm.cta || "Ask about this house", "btn btn-line")}
    </div>
  </div>
</section>

<section class="team wrap" id="team" aria-labelledby="team-h">
  <h2 id="team-h">${esc(tm.headline || "")}</h2>
  <div class="people">${(tm.people || []).map(p => `<article class="person"><img src="${url(p.img)}" alt="${esc(p.alt)}" width="800" height="800" loading="lazy"><div><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p>${esc(p.bio)}</p><p class="hand">${esc(p.aside)}</p></div></article>`).join("")}</div>
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap">
    <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev"><blockquote>${esc(x.text)}</blockquote><figcaption>${k.stars(x.stars)} <b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
  </div>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy">
      <h2 id="book-h">${esc(s.booking?.headline || "")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p>Or ${k.call("book section", k.phone, "alt-link")}.</p>
    </div>
    ${agentForm(k, s)}
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec wrap" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">${esc(s.faqHeadline || "Questions")}</h2>${k.faq()}</section>`)}
</main>
${agentFooter(k, s)}
${k.sticky("sticky")}
${k.scripts()}
<script src="table.js" defer></script>
</body>
</html>
`;
}
