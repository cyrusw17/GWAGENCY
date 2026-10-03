// Layout "lawn-rotulo": the crew's truck, lettered by a sign painter. Papel picado across the top,
// drop-shaded lettering, painted banner section heads in English with Spanish under them,
// a taquería-style price board. Order: truck door, trust, price board, watering day,
// services, before/after, the primos, reviews, estimate, area, FAQ.
import { kit, esc, when, money } from "../_kit.mjs";

const fmtDate = d => { const t = new Date(d + "T12:00:00Z"); return isNaN(t) ? esc(d || "") : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };
const banner = (en, es, id = "") => `<h2 class="banner"${id ? ` id="${id}"` : ""}><span class="banner-en">${esc(en)}</span>${when(es, `<span class="banner-es" lang="es">${esc(es)}</span>`)}</h2>`;
// Papel picado: one string of cut-paper flags. Cut-outs are drawn per flag in CSS.
const picado = n => `<div class="picado" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<span class="pf c${i % 5}"></span>`).join("")}</div>`;
// Sign painter's pinstripe flourish between sections.
const flourish = `<svg class="flourish" viewBox="0 0 240 30" aria-hidden="true" focusable="false"><path d="M120 15c-18-14-40-14-48 0 8 10 22 8 26 0M120 15c18-14 40-14 48 0-8 10-22 8-26 0M72 15H8M168 15h64M120 9v12"/></svg>`;

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b;
  const [first, ...rest] = b.name.split(" ");

  return `${k.head(css)}
<body${k.demo ? ' class="has-demo"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><span class="logo-a">${esc(first)}</span> <span class="logo-b">${esc(rest.join(" "))}</span></a>
    <nav class="nav" aria-label="Sections"><a href="#precios">Prices</a><a href="#trabajo">Our work</a><a href="#resenas">Reviews</a><a href="#preguntas">FAQ</a></nav>
    <div class="top-act">${k.call("header", k.phone, "top-call")}${k.book("header", "Free estimate", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="door">
  ${picado(26)}
  <div class="wrap door-in">
    <div class="door-panel">
      <p class="door-es" lang="es">${esc(s.hero.es || "")}</p>
      <p class="door-name" aria-hidden="true"><span>${esc(first)}</span><span>${esc(rest[0] || "")}</span></p>
      ${k.call("hero number", `<span class="door-num">${k.phone}</span>`, "door-phone")}
      <p class="door-sub">${esc(b.tagline || "")}</p>
    </div>
    <div class="door-copy">
      <h1>${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", s.hero.cta)}${k.text("hero", "Text a photo", "btn btn-line")}</div>
      ${k.rating("rating")}
    </div>
  </div>
</section>

${when(s.trust?.length, `<ul class="trust wrap">${s.trust.map(t => `<li><b>${esc(t.en || t)}</b>${when(t.es, `<span lang="es">${esc(t.es)}</span>`)}</li>`).join("")}</ul>`)}

<section class="board-sec" id="precios">
  <div class="wrap">
    ${banner(s.pricing?.headline || "Prices", s.pricing?.headlineEs)}
    <div class="board">
      <p class="board-sub">${esc(s.pricing?.sub || "")}</p>
      <ul class="menu">${(s.packages || []).map(p => `<li class="item${p.popular ? " pop" : ""}">
        <div class="item-top"><h3>${esc(p.name)}<span lang="es">${esc(p.es || "")}</span></h3><p class="big"><small>${esc(p.pre || "")}</small>${esc(p.price)}<small>${esc(p.unit || "")}</small></p></div>
        ${when(p.popular, `<p class="star-tag">${esc(p.popularLabel || "Popular")}</p>`)}
        <p class="item-note">${esc(p.note || "")}</p>
        <ul class="item-list">${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        ${k.book("board " + p.name, "Get my price", "btn btn-board", ` data-pick="${esc(p.name)}"`)}
      </li>`).join("")}</ul>
      ${when(s.addon, `<p class="board-add"><b>+ ${esc(s.addon.name)}</b> <span lang="es">${esc(s.addon.es || "")}</span> <span class="add-p">${esc(s.addon.price)} ${esc(s.addon.unit || "")}</span></p>`)}
      <p class="board-fine">${esc(s.pricing?.fine || "")}</p>
    </div>
  </div>
</section>

${when(s.water, `<section class="water">
  <div class="wrap water-in">
    <div><p class="water-es" lang="es">${esc(s.water.es || "")}</p><h2>${esc(s.water.title)}</h2><p>${esc(s.water.body)}</p></div>
    <form class="water-check">
      <label for="house-no">Your house number <span lang="es">· Número de casa</span></label>
      <div class="water-row"><input id="house-no" inputmode="numeric" maxlength="6" placeholder="e.g. 214"><button type="submit" class="btn btn-go">Find my day</button></div>
      <ol class="drop" aria-hidden="true"><li data-d="0">0-1<b>Mon</b></li><li data-d="1">2-3<b>Tue</b></li><li data-d="2">4-5<b>Wed</b></li><li data-d="3">6-7<b>Thu</b></li><li data-d="4">8-9<b>Fri</b></li></ol>
      <p class="water-out" aria-live="polite"></p>
    </form>
  </div>
</section>`)}

<section class="svc">
  <div class="wrap">
    ${banner(s.servicesHeadline || "What we do", s.servicesHeadlineEs)}
    <ul class="svc-list">${(s.services || []).map(x => `<li><h3>${esc(x.name)} <span lang="es">${esc(x.es || "")}</span></h3><p>${esc(x.desc)}</p><p class="svc-p">${x.from != null ? `from ${money(x.from)}` : esc(x.priceText || "")}</p></li>`).join("")}</ul>
  </div>
</section>

${flourish}

<section class="work" id="trabajo">
  <div class="wrap work-in">
    <div>${banner(s.work?.headline || "Our work", s.work?.headlineEs)}
    ${when(s.guarantee, `<div class="promise"><p class="promise-es" lang="es">${esc(s.guarantee.es || "")}</p><h3>${esc(s.guarantee.title)}</h3><p>${esc(s.guarantee.body)}</p>${k.text("guarantee", "Text us a photo", "btn btn-line-dark")}</div>`)}</div>
    <div class="frame">${k.compare(s.work?.compare)}<p class="fine">${esc(s.work?.compare?.caption || "Drag to compare.")}</p></div>
  </div>
</section>

${when(s.owner, `<section class="primos">
  <div class="wrap primos-in">
    ${k.shot(s.owner.photo, `${s.owner.name} by the crew truck`, "Shot list: both cousins leaning on the lettered truck door, mid-morning, mowers on the trailer.", "primos-shot")}
    <div><p class="eyebrow" lang="es">Los primos</p><h2>${esc(s.owner.name)}</h2><p class="role">${esc(s.owner.role || "")}</p><p class="story">${esc(s.owner.story)}</p><p class="lic">${esc(b.license || "")}</p></div>
  </div>
</section>`)}

<section class="revs" id="resenas">
  <div class="wrap">
    ${banner(s.reviews?.headline || "Reviews", s.reviews?.headlineEs)}
    <div class="revs-meta">${k.rating("rating")}${k.reviewNote("sample-note")}</div>
    <div class="rev-row" role="list">${k.reviews().map(x => `<figure class="rev" role="listitem"><div class="stars" role="img" aria-label="${Number(x.stars) || 5} out of 5 stars">${"★".repeat(Number(x.stars) || 5)}${"☆".repeat(5 - (Number(x.stars) || 5))}</div><blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")} · <time datetime="${esc(x.date || "")}">${fmtDate(x.date)}</time></figcaption></figure>`).join("")}</div>
  </div>
</section>

<section class="book" id="book">
  ${picado(26)}
  <div class="wrap book-in">
    <div class="book-copy">
      <p class="eyebrow">${esc(s.booking?.eyebrow || "Free estimate")}</p>
      <h2 id="book-h">${esc(s.booking?.headline || "Get a free estimate")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">${k.call("book section", `Call ${k.phone}`, "alt-link")} · ${k.text("book section", "Text us", "alt-link")}</p>
    </div>
    ${k.form({ cls: "quote" })}
  </div>
</section>

<section class="area">
  <div class="wrap">
    ${banner(s.areas?.headline || "Where we work", s.areas?.headlineEs)}
    <p class="area-body">${esc(s.areas?.body || "")}</p>
    <ul class="hoods">${(s.areas?.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
  </div>
</section>

${when(s.faq?.length, `<section class="qa" id="preguntas"><div class="wrap narrow">${banner(s.faqHeadline || "Questions", "Preguntas")}${k.faq()}</div></section>`)}

<section class="final">
  <div class="wrap"><p class="final-es" lang="es">${esc(s.final?.es || "")}</p><h2>${esc(s.final?.headline || "")}</h2><p>${esc(s.final?.sub || "")}</p><div class="ctas">${k.text("final", "Text a photo", "btn btn-go")}${k.call("final", `Call ${k.phone}`, "btn btn-line")}</div></div>
</section>
</main>

<footer class="foot">
  <div class="wrap foot-in">
    <div><b class="foot-name">${esc(b.name)}</b><br>${k.addr()}<br>${esc(b.hoursText || "")}</div>
    <p>${k.call("footer", k.phone, "foot-link")}${when(b.email, `<br><a class="foot-link" href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}<br>${esc(b.license || "")}</p>
    <p class="credit">${k.credit()}</p>
  </div>
</footer>
${k.sticky("sticky")}
${k.scripts()}
<script>
// SAWS watering day from the last digit of the house number (0-1 Mon ... 8-9 Fri); we mow the day before.
(function(){var f=document.querySelector(".water-check");if(!f)return;var D=["Monday","Tuesday","Wednesday","Thursday","Friday"],M=["Sunday","Monday","Tuesday","Wednesday","Thursday"],out=f.querySelector(".water-out");
f.addEventListener("submit",function(e){e.preventDefault();var n=f.querySelector("input").value.replace(/[^0-9]/g,"");
f.querySelectorAll(".drop li").forEach(function(li){li.classList.remove("on")});
if(!n){out.textContent="Type the number on your house or mailbox.";return}var i=Math.floor(Number(n.slice(-1))/2);
f.querySelector('.drop li[data-d="'+i+'"]').classList.add("on");
out.textContent="Your SAWS watering day is "+D[i]+" (check your bill to confirm). We'd mow on "+M[i]+".";});})();
</script>
</body>
</html>
`;
}
