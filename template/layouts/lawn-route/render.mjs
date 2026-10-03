// Layout "lawn-route": a mow crew's route sheet. Mowing stripes, a clipboard with this week's
// streets, a printed price sheet. Order: route, price sheet, before/after, how it works,
// reviews, owner, areas by day, estimate form, FAQ.
import { kit, esc, when, url } from "../_kit.mjs";

const fmtDate = d => { const t = new Date(d + "T12:00:00Z"); return isNaN(t) ? esc(d || "") : t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); };

export function render(s, { css = "" } = {}) {
  const k = kit(s), b = k.b, rt = s.route || {};
  const nav = [["#prices", "Prices"], ["#work", "Our work"], ["#reviews", "Reviews"], ["#areas", "Route days"], ["#faq", "FAQ"]];

  return `${k.head(css)}
<body${k.demo ? ' class="has-demo"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${k.demoBar()}
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="#main"><span class="logo-mark" aria-hidden="true">P</span><span>${esc(b.name)}<small>${esc(b.tagline || "")}</small></span></a>
    <nav class="nav" aria-label="Sections">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
    <div class="top-act">${k.call("header", `<span class="top-num">${k.phone}</span>`, "top-call", ` aria-label="Call ${k.phone}"`)}${k.book("header", "Free estimate", "btn btn-go btn-sm")}</div>
  </div>
</header>

<main id="main">
<section class="hero">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="kicker">${esc(s.hero.kicker || "")}</p>
      <h1>${esc(s.hero.headline)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="ctas">${k.book("hero", s.hero.cta)}${k.call("hero", `Call ${k.phone}`, "btn btn-line")}</div>
      ${k.rating("rating on-dark")}
    </div>
    ${when(rt.days?.length, `<aside class="clip" aria-labelledby="route-h">
      <div class="clip-top" aria-hidden="true"></div>
      <div class="clip-paper">
        <p class="clip-week">${esc(rt.week || "")}</p>
        <h2 id="route-h">${esc(rt.title || "This week's route")}</h2>
        <ol class="route">${rt.days.map(d => `<li><b>${esc(d.day)}</b><span><strong>${esc(d.town)}</strong>${esc(d.streets)}</span></li>`).join("")}</ol>
        <form class="zip-check" data-route="${esc(JSON.stringify(rt.days.map(d => [d.day, d.town, d.zips || []])))}">
          <label for="route-zip">${esc(rt.note || "Is your street on a route?")}</label>
          <div class="zip-row"><input id="route-zip" inputmode="numeric" maxlength="5" placeholder="Your ZIP" autocomplete="postal-code"><button type="submit">Check</button></div>
          <p class="zip-out" aria-live="polite"></p>
        </form>
      </div>
    </aside>`)}
  </div>
</section>

${when(s.trust?.length, `<ul class="checks wrap" aria-label="Why customers stay">${s.trust.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`)}

<section class="sheet-sec" id="prices">
  <div class="wrap">
    <div class="sheet">
      <div class="sheet-head"><h2>${esc(s.pricing?.headline || "Prices")}</h2><p class="sheet-co">${esc(b.name)} · ${esc(b.address?.city || "")}, ${esc(b.address?.region || "")}</p></div>
      <p class="sheet-sub">${esc(s.pricing?.sub || "")}</p>
      <ul class="lines">
        ${(s.packages || []).map(p => `<li class="line${p.popular ? " pop" : ""}">
          <div class="line-row"><h3>${esc(p.name)}</h3><span class="dots" aria-hidden="true"></span><span class="amt">${esc(p.price)} <small>${esc(p.unit || "")}</small></span></div>
          <p>${esc(p.note || "")}${when(p.popular, ` <em class="pop-note">${esc(p.popularLabel || "Most popular")}</em>`)}</p>
          <p class="incl">${(p.features || []).map(esc).join(" · ")}</p>
          ${k.book("price " + p.name, "Price my yard", "line-btn", ` data-pick="${esc(p.name)}"`)}
        </li>`).join("")}
        ${when(s.addon, `<li class="line addon"><div class="line-row"><h3>Add: ${esc(s.addon?.name)}</h3><span class="dots" aria-hidden="true"></span><span class="amt">${esc(s.addon?.price)} <small>${esc(s.addon?.unit || "")}</small></span></div></li>`)}
      </ul>
      <p class="sheet-fine">${esc(s.pricing?.fine || "")}</p>
    </div>
  </div>
</section>

<section class="work" id="work">
  <div class="wrap work-in">
    <div><p class="label">Before / after</p><h2>${esc(s.work?.headline || "Recent work")}</h2>${when(s.guarantee, `<div class="promise"><h3>${esc(s.guarantee.title)}</h3><p>${esc(s.guarantee.body)}</p>${k.text("guarantee", "Text us a photo", "btn btn-line-dark")}</div>`)}</div>
    <div>${k.compare(s.work?.compare)}<p class="fine">${esc(s.work?.compare?.caption || "Drag to compare.")}</p></div>
  </div>
</section>

<section class="how">
  <div class="wrap">
    <p class="label">How it works</p>
    <h2>${esc(s.stepsHeadline || "From estimate to your first mow")}</h2>
    <ol class="ticket">${(s.steps || []).map(x => `<li><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></li>`).join("")}</ol>
  </div>
</section>

<section class="reviews" id="reviews">
  <div class="wrap">
    <div class="rev-head"><div><p class="label">Reviews</p><h2>${esc(s.reviews?.headline || "Reviews")}</h2></div>${k.rating("rating")}</div>
    ${k.reviewNote("sample-note")}
    <div class="rev-row" role="list">${k.reviews().map(x => `<figure class="rev" role="listitem"><div class="stars" role="img" aria-label="${Number(x.stars) || 5} out of 5 stars">${"★".repeat(Number(x.stars) || 5)}${"☆".repeat(5 - (Number(x.stars) || 5))}</div><blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b> · ${esc(x.where || "")}<time datetime="${esc(x.date || "")}">${fmtDate(x.date)}</time></figcaption></figure>`).join("")}</div>
  </div>
</section>

${when(s.owner, `<section class="owner">
  <div class="wrap owner-in">
    ${k.shot(s.owner.photo, `${s.owner.name} with the crew trailer`, "Shot list: Denny by the trailer, early light, mower on the ramp.", "owner-shot")}
    <div><p class="label">Who mows your lawn</p><h2>${esc(s.owner.name)}</h2><p class="owner-role">${esc(s.owner.role || "")}</p><p class="owner-story">${esc(s.owner.story)}</p><p class="lic">${esc(b.license || "")}</p></div>
  </div>
</section>`)}

<section class="areas" id="areas">
  <div class="wrap">
    <p class="label">Service area</p>
    <h2>${esc(s.areas?.headline || "Where we work")}</h2>
    <p class="areas-body">${esc(s.areas?.body || "")}</p>
    <ul class="days">${(rt.days || []).map(d => `<li><b>${esc(d.day)}</b>${esc(d.town)}</li>`).join("")}${(s.areas?.cities || []).filter(c => !(rt.days || []).some(d => d.town === c)).map(c => `<li><b>Ask</b>${esc(c)}</li>`).join("")}</ul>
  </div>
</section>

<section class="book" id="book">
  <div class="wrap book-in">
    <div class="book-copy">
      <p class="label">${esc(s.booking?.eyebrow || "Estimate")}</p>
      <h2 id="book-h">${esc(s.booking?.headline || "Get a free estimate")}</h2>
      <p>${esc(s.booking?.body || "")}</p>
      <p class="alt">Rather talk? ${k.call("book section", k.phone, "alt-link")} or ${k.text("book section", "send a text", "alt-link")}.</p>
    </div>
    ${k.form({ cls: "quote" })}
  </div>
</section>

${when(s.faq?.length, `<section class="faq-sec" id="faq"><div class="wrap narrow"><p class="label">Questions</p><h2>${esc(s.faqHeadline || "Things people ask on the estimate")}</h2>${k.faq()}</div></section>`)}

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
${k.scripts()}
<script>
// Route checker: ZIP in, mow day out. Unknown ZIPs are pointed at the estimate form instead of a dead end.
(function(){var f=document.querySelector(".zip-check");if(!f)return;var days=JSON.parse(f.getAttribute("data-route")),out=f.querySelector(".zip-out");
f.addEventListener("submit",function(e){e.preventDefault();var z=f.querySelector("input").value.trim().slice(0,5),hit=days.filter(function(d){return d[2].indexOf(z)>-1})[0];
out.textContent=hit?"Yes. We're in "+hit[1]+" every "+({Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday"}[hit[0]]||hit[0])+".":/^[0-9]{5}$/.test(z)?"Not on a route yet. Ask anyway: we add streets when three neighbors sign up.":"Type a 5-digit ZIP.";});})();
</script>
</body>
</html>
`;
}
