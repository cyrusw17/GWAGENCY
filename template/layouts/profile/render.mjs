// Layout "profile": the agent as the subject of a magazine feature. The cover sells the person
// (portrait, cover lines), the interview tells who they are in their own words with pull quotes,
// then "which client are you?" shows how they'd work with you plus the review from a client like
// you. Only after that: the numbers, sold homes, reviews, the request form, FAQ and footer.
// pick.js only adds behavior; without it every client type shows, one after another.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["pick.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, me = s.me || {}, c = s.cover || {}, iv = s.interview || {}, w = s.which || {};
  const nav = [["#story", "The interview"], ["#which", "Working with me"], ["#sold", "Sold"], ["#reviews", "Reviews"], ["#faq", "FAQ"]];

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main">${esc(b.name)}</a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, x]) => `<a href="${h}">${x}</a>`).join("")}</nav>
    ${k.book("header", s.booking?.headerCta || k.bookLabel, "btn btn-go btn-sm")}
  </div>
</header>

<main id="main">
<section class="cover" aria-labelledby="h1">
  <div class="wrap cover-in">
    <p class="mast"><span>${esc(c.mast || "")}</span><span>${esc(c.issue || "")}</span></p>
    <figure class="cover-pic"><img src="${url(me.photo)}" alt="${esc(me.photoAlt || "")}" width="800" height="800"><figcaption>${esc(s.artNote || "")}</figcaption></figure>
    <div class="cover-copy">
      <p class="kicker">${esc(c.kicker || "")}</p>
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <ul class="lines">${(c.lines || []).map(([n, x]) => `<li><b>${esc(n)}</b> ${esc(x)}</li>`).join("")}</ul>
      <div class="ctas">${k.book("hero", k.bookLabel, "btn btn-go")}${k.call("hero", `Call ${esc(k.phone)}`, "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
  </div>
</section>

<article class="story" id="story" aria-labelledby="story-h">
  <div class="wrap story-in">
    <header class="story-head"><p class="kicker">${esc(iv.kicker || "")}</p><h2 id="story-h">${esc(iv.headline || "")}</h2><p class="dek">${esc(iv.dek || "")}</p></header>
    <div class="qa">${(iv.items || []).map(x => x.pull
      ? `<blockquote class="pull"><p>${esc(x.pull)}</p></blockquote>`
      : `<h3>${esc(x.q)}</h3>${x.a.map((p, i) => `<p${i ? "" : ' class="first"'}>${esc(p)}</p>`).join("")}`).join("")}</div>
  </div>
</article>

<section class="which" id="which" aria-labelledby="which-h">
  <div class="wrap">
    <h2 id="which-h">${esc(w.headline || "")}</h2>
    <p class="sub">${esc(w.sub || "")}</p>
    <div class="tabs" role="group" aria-label="Pick the one that sounds like you">${(w.items || []).map((x, i) => `<button type="button" data-whopick="${i}" aria-pressed="${i ? "false" : "true"}" aria-controls="who-${i}">${esc(x.who)}</button>`).join("")}</div>
    ${(w.items || []).map((x, i) => `<div class="who" id="who-${i}" data-who="${i}">
      <div class="who-plan"><h3>${esc(x.title)}</h3><ol>${x.steps.map(st => `<li>${esc(st)}</li>`).join("")}</ol>${k.book(x.who, x.cta, "btn btn-go")}</div>
      <figure class="who-rev"><blockquote>${esc(x.review.text)}</blockquote><figcaption>${k.stars(x.review.stars || 5)} ${esc(x.review.name)} · ${esc(x.review.where)}${when(k.demo, ' <span class="sample-tag">(sample review)</span>')}</figcaption></figure>
    </div>`).join("")}
  </div>
</section>

<section class="sold" id="sold" aria-labelledby="sold-h">
  <div class="wrap">
    <h2 id="sold-h">${esc(s.sold?.headline || "Recently sold")} ${when(k.demo, '<span class="sample-tag">(sample)</span>')}</h2>
    <dl class="nums">${(s.sold?.numbers || []).map(([n, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}</dd></div>`).join("")}</dl>
    <ul class="grid">${(s.sold?.items || []).map(x => `<li><img src="${url(x.img)}" alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><p class="tag">${esc(x.tag || "Sold")}</p><h3>${esc(x.where)}</h3><p>${usd(x.price)} · ${esc(x.line)}</p></li>`).join("")}</ul>
    <p class="fine">${esc(s.sold?.fine || "")} ${esc(s.artNote || "")}</p>
  </div>
</section>

<section class="reviews wrap" id="reviews" aria-labelledby="rev-h">
  <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
  ${k.reviewNote("sample-note")}
  <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev"><blockquote>${esc(x.text)}</blockquote><figcaption>${k.stars(x.stars)} <b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
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
<script src="pick.js" defer></script>
</body>
</html>
`;
}
