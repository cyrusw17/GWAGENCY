// Shared parts for the designed layouts in template/layouts/<name>/.
// Each layout owns its markup, CSS and fonts, so sites can look nothing alike.
// Everything that must stay the same underneath lives here: the <head> (SEO, schema,
// noindex on demos), the demo notice, tracked call/text/book links, the quote form
// that funnel.js drives, and the config funnel.js reads.
import { esc, when, url, money, price, digits, schema } from "./render.mjs";
export { esc, when, url, money, price, digits };

export const tel = s => digits(s.business.phone);
export const sms = s => digits(s.business.sms || s.business.phone);

// Tracked links. data-ev feeds the click counts behind the monthly results text and the guarantee.
export const callLink = (s, where, inner, cls = "") =>
  when(tel(s), `<a class="${cls}" href="tel:${tel(s)}" data-ev="call" data-label="${esc(where)}">${inner ?? esc(s.business.phone)}</a>`);
export const textLink = (s, where, inner = "Text us", cls = "") =>
  when(sms(s), `<a class="${cls}" href="sms:${sms(s)}" data-ev="text" data-label="${esc(where)}">${inner}</a>`);
export const bookLink = (where, label, cls = "", pick = "") =>
  `<a class="${cls}" href="#quote" data-ev="book" data-label="${esc(where)}"${pick ? ` data-pick="${esc(pick)}"` : ""}>${esc(label)}</a>`;

// "4.8 · 112 reviews on Google", with the link to the profile when there is one.
export function rating(s, { stars = "★★★★★" } = {}) {
  const r = s.reviews;
  if (!r?.rating) return "";
  const src = r.url ? `<a href="${url(r.url)}" rel="noopener" target="_blank">${esc(r.source || "Google")}</a>` : esc(r.source || "Google");
  return `<span class="k-stars" aria-hidden="true">${stars}</span> <b>${esc(r.rating)}</b> <span>${r.count ? esc(r.count) + " reviews on " : "on "}${src}${when(s.demo, " (sample)")}</span>`;
}

export const monthYear = d => { const t = new Date(d + "T12:00:00Z"); return isNaN(t) ? d : t.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }); };
export const newestFirst = items => [...(items || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

export const sampleTag = (s, text = "Sample") => when(s.demo, `<span class="k-sample">${esc(text)}</span>`);
export const sampleReviewsNote = (s, text = "Sample reviews for this demo. Real sites show the owner's own Google reviews, newest first.") =>
  when(s.demo, `<p class="k-sample-note">${esc(text)}</p>`);

export function img(src, alt, { eager = false, w = 1200, h = 900, cls = "" } = {}) {
  if (!src) return "";
  return `<img${cls ? ` class="${cls}"` : ""} src="${url(src)}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

// Before/after slider driven by a real range input (funnel.js sets --pos).
export function compare(c, { cls = "k-compare", labels = ["Before", "After"], eager = false } = {}) {
  if (!c) return "";
  return `<div class="${cls}" data-compare style="--pos:50%">
  <div class="pane before">${img(c.before, `Before: ${c.caption || ""}`, { eager })}</div>
  <div class="pane after">${img(c.after, `After: ${c.caption || ""}`, { eager })}</div>
  <span class="tag l">${esc(labels[0])}</span><span class="tag r">${esc(labels[1])}</span><span class="handle" aria-hidden="true"></span>
  <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after${c.caption ? ": " + esc(c.caption) : ""}">
</div>`;
}

export function faq(s, cls = "k-faq") {
  return when(s.faq?.length, `<div class="${cls}">${s.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>`);
}

// The quote form. Three short steps: what needs cleaning, the house, then contact details
// (phone or email, either one). Without JavaScript all three steps show as one form.
// The ballpark comes from each option's lo/hi and the size multiplier, so it's always
// the same numbers as the price list on the page.
export function quoteForm(s, o = {}) {
  const q = s.quote || {};
  const opts = q.options || [];
  const L = { step: "Step", of: "of", next: "Next", back: "Back", ...(q.labels || {}) };
  const progress = n => `<p class="k-progress" aria-hidden="true">${esc(L.step)} ${n} ${esc(L.of)} 3</p>`;
  const nav = (n, last) => `<div class="k-nav">${n > 1 ? `<button type="button" class="k-back" data-back>${esc(L.back)}</button>` : ""}${last
    ? `<button class="${o.submitCls || "k-submit"}" type="submit">${esc(q.submit || "Get my quote")}</button>`
    : `<button type="button" class="${o.nextCls || "k-next"}" data-next>${esc(L.next)}</button>`}</div>`;
  return `<form class="k-form ${o.cls || ""}" id="lead" novalidate aria-label="${esc(q.formLabel || "Get a quote")}">
  <fieldset data-step="1">${progress(1)}
    <legend>${esc(q.ask || "What needs washing?")}</legend>
    <div class="k-opts">${opts.map((x, i) => `<label class="k-opt"><input type="checkbox" name="service" value="${esc(x.name)}" data-lo="${Number(x.lo) || 0}" data-hi="${Number(x.hi) || 0}"${x.scale ? " data-scale" : ""}${i === 0 ? " data-first" : ""}><span><b>${esc(x.name)}</b>${when(x.lo, `<small>${esc(x.hint || "from " + price(x.lo))}</small>`)}</span></label>`).join("")}</div>
    <p class="k-err" data-err hidden>${esc(q.pickOne || "Pick at least one so we can price it.")}</p>
    ${nav(1)}
  </fieldset>
  <fieldset data-step="2">${progress(2)}
    <legend>${esc(q.sizeAsk || "About the property")}</legend>
    ${when(q.sizes?.length, `<div class="k-sizes" role="radiogroup" aria-label="${esc(q.sizeLabel || "House size")}">${q.sizes.map((z, i) => `<label class="k-size"><input type="radio" name="size" value="${esc(z.name)}" data-mult="${Number(z.mult) || 1}"${i === 0 ? " checked" : ""}><span>${esc(z.name)}</span></label>`).join("")}</div>`)}
    <label class="k-field">${esc(q.zipLabel || "ZIP code")}<input name="zip" id="q-zip" inputmode="numeric" autocomplete="postal-code" maxlength="10"></label>
    <div class="k-estimate" aria-live="polite"><span>${esc(q.estimateLabel || "Ballpark")}</span><output data-estimate>${esc(q.estimateEmpty || "Pick a service")}</output><small>${esc(q.estimateNote || "Final price after a quick look at photos or the house. No surprise add-ons.")}</small></div>
    ${nav(2)}
  </fieldset>
  <fieldset data-step="3">${progress(3)}
    <legend>${esc(q.contactAsk || "Where should we send the price?")}</legend>
    <label class="k-field">${esc(q.nameLabel || "Your name")}<input name="name" id="q-name" autocomplete="name" required></label>
    <div class="k-oneof" data-oneof>
      <label class="k-field">${esc(q.phoneLabel || "Mobile number")}<input name="phone" id="q-phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="${esc(q.phoneHint || "We text the price")}"></label>
      <label class="k-field">${esc(q.emailLabel || "or email")}<input name="email" id="q-email" type="email" autocomplete="email"></label>
    </div>
    <p class="k-err" data-oneof-err hidden>${esc(q.oneOf || "Add a phone number or an email, whichever you check more.")}</p>
    <label class="k-field">${esc(q.notesLabel || "Anything we should know?")} <span class="k-opt-tag">${esc(q.optional || "(optional)")}</span><textarea name="notes" id="q-notes" maxlength="1000" placeholder="${esc(q.notesHint || "")}"></textarea></label>
    <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
    ${nav(3, true)}
    <p class="k-privacy">${esc(q.privacy || "We only use this to reply about your quote.")}</p>
  </fieldset>
  <p class="k-status" role="status" aria-live="polite" tabindex="-1"></p>
</form>`;
}

// <head> contents shared by every layout. Fonts live in the layout's fonts/ folder and are
// preloaded by file name; the layout's CSS declares the @font-face rules.
export function head(s, { css = "", preloadFonts = [], themeColor = "#ffffff" } = {}) {
  const b = s.business, demo = !!s.demo;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(s.seo?.title || b.name)}</title>
<meta name="description" content="${esc(s.seo?.description || "")}">
${demo ? '<meta name="robots" content="noindex">' : when(s.seo?.canonical, `<link rel="canonical" href="${url(s.seo.canonical)}">`)}
<meta name="author" content="${esc(b.name)}">
<meta property="article:modified_time" content="${esc(s.builtAt || "")}">
<link rel="alternate" type="text/markdown" href="index.md">
<meta name="theme-color" content="${esc(themeColor)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.seo?.title || b.name)}">
<meta property="og:description" content="${esc(s.seo?.description || "")}">
${when(s.seo?.ogImage, `<meta property="og:image" content="${url(s.seo.ogImage)}">`)}
${when(b.favicon, `<link rel="icon" href="${url(b.favicon)}">`)}
${when(s.hero?.image, `<link rel="preload" as="image" href="${url(s.hero.image)}" fetchpriority="high">`)}
${preloadFonts.map(f => `<link rel="preload" as="font" type="font/woff2" href="fonts/${esc(f)}" crossorigin>`).join("\n")}
<style>${css}</style>
${schema(s)}`;
}

export const demoBar = s => when(s.demo, `<div class="k-demo" role="region" aria-label="Demo notice"><b>GroundWork demo</b><span>Fictional business, sample photos and reviews.</span><a href="${url(s.demoCta?.href || "https://groundwork-web.com/start/")}">${esc(s.demoCta?.label || "Get this site")}</a></div>`);

// What funnel.js reads. Same rules as the default template.
export function script(s) {
  const b = s.business, demo = !!s.demo;
  const gw = s.tracking === "groundwork" ? (s.trackingBase || "https://groundwork-web.com") + "/api/sites.php?a=" : "";
  const cfg = {
    slug: s.slug, demo, sms: sms(s),
    thanks: s.quote?.thanks || s.lead?.thanks || `Got it. ${b.name} will text you back shortly${b.hoursText ? " (" + b.hoursText + ")" : ""}.`,
    demoThanks: s.quote?.demoThanks,
    lead: s.lead?.endpoint || (gw && gw + "lead"), analytics: s.analytics?.endpoint || (gw && !demo ? gw + "event" : ""), plain: !!gw && !s.lead?.endpoint,
    estimate: s.quote?.estimateFmt,
  };
  return `<script>window.FUNNEL=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>
<script src="funnel.js" defer></script>`;
}

export const credit = s => when(s.credit !== false, `Site by <a href="https://groundwork-web.com/">GroundWork</a>`);
export const year = s => (s.builtAt || "").slice(0, 4) || String(new Date().getFullYear());
export const addressLine = b => [b.address?.street, b.address?.city, [b.address?.region, b.address?.postal].filter(Boolean).join(" ")].filter(Boolean).join(", ");

// Shared CSS every layout gets before its own: form mechanics, slider mechanics, demo bar,
// sample labels, a11y helpers. No colors or fonts beyond neutral defaults; layouts restyle.
export const baseCss = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0}
img{display:block;max-width:100%;height:auto}
button,input,select,textarea{font:inherit;color:inherit}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:16px;top:-100px;z-index:300;background:#000;color:#fff;padding:12px 16px}
.skip:focus{top:0}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition:none!important;animation:none!important}}
.k-demo{position:relative;z-index:200;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;padding:8px 16px;background:#111;color:#ddd;font:13px/1.3 system-ui,sans-serif}
.k-demo b{color:#fff}
@media (max-width:599px){.k-demo span{display:none}}
.k-demo a{margin-left:auto;color:#111;background:#f2c94c;padding:5px 10px;border-radius:4px;font-weight:700;text-decoration:none}
.k-sample{display:inline-block;font:600 11px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:4px 6px;border-radius:3px;background:rgba(0,0,0,.72);color:#fff}
.k-sample-note{font-size:14px}
[data-compare]{position:relative;overflow:hidden;touch-action:pan-y}
[data-compare] .pane{position:absolute;inset:0}
[data-compare] .pane img{width:100%;height:100%;object-fit:cover}
[data-compare] .after{clip-path:inset(0 0 0 var(--pos))}
[data-compare] .handle{position:absolute;top:0;bottom:0;left:var(--pos);width:3px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.25);pointer-events:none}
[data-compare] .handle::after{content:"";position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
[data-compare] input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0}
[data-compare] .tag{position:absolute;top:12px;font:700 12px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;background:rgba(0,0,0,.65);color:#fff;padding:6px 8px;pointer-events:none}
[data-compare] .tag.l{left:12px}[data-compare] .tag.r{right:12px}
[data-compare]:focus-within .handle::after{outline:3px solid #fff;outline-offset:2px}
.k-form fieldset{border:0;margin:0;padding:0;min-width:0}
.k-form legend{padding:0}
.k-form.js-steps fieldset:not(.on){display:none}
.k-form:not(.js-steps) .k-progress,.k-form:not(.js-steps) .k-nav button[type=button]{display:none}
.k-opts{display:grid;gap:8px}
.k-opt,.k-size{position:relative;display:block;cursor:pointer}
.k-opt input,.k-size input{position:absolute;opacity:0;width:1px;height:1px}
.k-opt span,.k-size span{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-height:52px;align-items:center}
.k-sizes{display:flex;flex-wrap:wrap;gap:8px}
.k-field{display:grid;gap:6px}
.k-field input,.k-field textarea{width:100%;min-height:50px;padding:12px}
.k-field textarea{min-height:90px;resize:vertical}
.k-nav{display:flex;gap:10px;align-items:center}
.k-nav button{min-height:52px;cursor:pointer}
.k-estimate output{display:block}
.k-form .hp{position:absolute;left:-9999px}
.k-form.sent fieldset{display:none}
.k-form fieldset > * + *{margin-top:14px}
.k-err[hidden]{display:none}
`;
