// Layout "text-thread": a solo agent who sells herself first, the way people actually meet an
// agent now: by text. The hero is her phone thread; tap a question chip and her answer arrives in
// her voice (who she is, why trust her, how she works, what she charges). Then a week in her life
// (family and work on the same calendar), the agent part (how she sells and buys), homes sent as
// picture messages, client texts as reviews, the request form, FAQ and the agent footer.
// thread.js only adds behavior; without it the whole conversation shows.
import { kit, esc, when, url } from "../_kit.mjs";
import { agentForm, agentFooter, AGENT_CSS } from "../_agent.mjs";
export const behavior = "funnel.js";
export const scripts = ["thread.js"];

const usd = n => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, t = s.thread || {}, me = s.me || {};
  const nav = [["#thread", "Meet me"], ["#week", "My week"], ["#work", "How I work"], ["#homes", "Homes"], ["#faq", "FAQ"]];

  return `${k.head(AGENT_CSS + css)}
<body class="no-js${k.demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><img src="${url(me.avatar)}" alt="" width="40" height="40"><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, x]) => `<a href="${h}">${x}</a>`).join("")}</nav>
    <div class="top-act">${k.text("header", `Text ${esc(me.first || "me")}`, "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <h1 id="h1">${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.text("hero", `Text ${esc(me.first || "me")} at ${esc(b.phone)}`, "btn btn-go")}${k.book("hero", k.bookLabel, "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
    <div class="phone" id="thread">
      <div class="ph-top"><img src="${url(me.avatar)}" alt="" width="36" height="36"><b>${esc(me.first || b.name)}</b><span>${esc(t.status || "")}</span></div>
      <ol class="msgs" data-msgs aria-live="polite" aria-label="Conversation with ${esc(me.first || b.name)}">
        ${(t.opening || []).map(m => `<li class="in">${esc(m)}</li>`).join("")}
        <li class="in pic"><img src="${url(me.photo)}" alt="${esc(me.photoAlt || "")}" width="800" height="800"><small>${esc(s.artNote || "")}</small></li>
        ${(t.qa || []).map((x, i) => `<li class="out" data-q="${i}">${esc(x.q)}</li>${x.a.map(a => `<li class="in" data-a="${i}">${esc(a)}</li>`).join("")}`).join("")}
      </ol>
      <div class="chips" role="group" aria-label="Ask ${esc(me.first || "me")} something">${(t.qa || []).map((x, i) => `<button type="button" data-ask="${i}">${esc(x.q)}</button>`).join("")}</div>
    </div>
  </div>
</section>

<section class="week wrap" id="week" aria-labelledby="week-h">
  <h2 id="week-h">${esc(s.week?.headline || "")}</h2>
  <p class="sub">${esc(s.week?.sub || "")}</p>
  <ol class="cal">${(s.week?.days || []).map(([d, items]) => `<li><p class="d">${esc(d)}</p><ul>${items.map(([kind, x]) => `<li class="${kind === "me" ? "me" : "job"}">${esc(x)}</li>`).join("")}</ul></li>`).join("")}</ol>
  <p class="legend"><span class="me">Me</span><span class="job">Clients</span></p>
</section>

<section class="work" id="work" aria-labelledby="work-h">
  <div class="wrap">
    <h2 id="work-h">${esc(s.work?.headline || "")}</h2>
    <p class="sub">${esc(s.work?.sub || "")}</p>
    <div class="two">${(s.work?.sides || []).map(sd => `<div class="side"><h3>${esc(sd.name)}</h3><ol>${sd.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>${k.book(sd.name, sd.cta, "btn btn-line")}</div>`).join("")}</div>
    <dl class="nums">${(s.work?.numbers || []).map(([n, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(n)}</dd></div>`).join("")}</dl>
    <p class="fine">${esc(s.work?.fine || "")}</p>
  </div>
</section>

<section class="homes wrap" id="homes" aria-labelledby="homes-h">
  <h2 id="homes-h">${esc(s.homes?.headline || "")} ${when(k.demo, '<span class="sample-tag">(sample listings)</span>')}</h2>
  <p class="sub">${esc(s.homes?.sub || "")}</p>
  <ul class="mms">${(s.homes?.items || []).map(x => `<li><figure><img src="${url(x.img)}" alt="${esc(x.alt)}" width="1200" height="800" loading="lazy" decoding="async"><figcaption><b>${usd(x.price)}</b> · ${esc(x.line)}<span>${esc(x.where)}</span></figcaption></figure><p class="her">${esc(x.note)}</p></li>`).join("")}</ul>
  <p class="fine">${esc(s.homes?.fine || "")} ${esc(s.artNote || "")}</p>
</section>

<section class="reviews" id="reviews" aria-labelledby="rev-h">
  <div class="wrap">
    <div class="rev-head"><h2 id="rev-h">${esc(s.reviews?.headline || "Reviews")}</h2>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="rev-row" role="list">${k.reviews().map(x => `<div role="listitem"><figure class="rev"><blockquote>${esc(x.text)}</blockquote><figcaption>${k.stars(x.stars)}<b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${k.date(x.date)}</time></figcaption></figure></div>`).join("")}</div>
  </div>
</section>

<section class="book" id="book" aria-labelledby="book-h">
  <div class="wrap book-in">
    <div class="book-copy">
      <h2 id="book-h">${esc(s.booking?.headline || "")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Faster? ${k.text("book section", "Text me", "alt-link")} or ${k.call("book section", k.phone, "alt-link")}.</p>
    </div>
    ${agentForm(k, s)}
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec wrap" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">${esc(s.faqHeadline || "Questions")}</h2>${k.faq()}</section>`)}
</main>
${agentFooter(k, s)}
${k.sticky("sticky")}
${k.scripts()}
<script src="thread.js" defer></script>
</body>
</html>
`;
}
