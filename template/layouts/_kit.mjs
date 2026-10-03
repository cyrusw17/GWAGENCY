// Shared parts for template/layouts/<name>/render.mjs.
// A layout owns its markup, section order and CSS. Everything that must behave the same on every
// site comes from here: <head> (SEO, schema, noindex for demos), the demo notice, tracked call /
// text / book buttons, the multi-step quote form, the sticky phone bar and the FUNNEL config that
// funnel.js reads. Every string from site.json goes through esc() or url().
import { esc, when, url, price, digits, ICON, schema, theme } from "../render.mjs";

export { esc, when, url, price, digits, ICON };
export const money = n => esc(price(n));

// Hidden steps, screen-reader text and the honeypot. Layout CSS styles everything else.
const BASE_CSS = `.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
[data-steps] [data-step]{border:0;margin:0;padding:0;min-width:0}
[data-steps] [data-step]:not(.on){display:none}
[data-steps].sent [data-step],[data-steps].sent .k-progress{display:none}
.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;z-index:99;padding:10px 14px;background:#fff;color:#000}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

export function kit(s) {
  const b = s.business, demo = !!s.demo;
  const tel = digits(b.phone), sms = digits(b.sms || b.phone);
  const r = s.reviews || {};
  const bookLabel = s.booking?.cta || "Get a free estimate";

  // Same rules as the default template: "tracking": "groundwork" sends counts and leads to our collector.
  const gw = s.tracking === "groundwork" ? (s.trackingBase || "https://groundwork-web.com") + "/api/sites.php?a=" : "";
  const thanks = s.lead?.thanks || `Got it. ${b.name} will get back to you shortly${b.hoursText ? " (" + b.hoursText + ")" : ""}.`;
  const cfg = { slug: s.slug, demo, sms, thanks,
    lead: s.lead?.endpoint || (gw && gw + "lead"), analytics: s.analytics?.endpoint || (gw && !demo ? gw + "event" : ""), plain: !!gw && !s.lead?.endpoint };

  const k = { s, b, demo, tel, sms, r, bookLabel };

  k.head = (css, extraHead = "") => `<!doctype html>
<html lang="${esc(s.lang || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(s.seo?.title || b.name)}</title>
<meta name="description" content="${esc(s.seo?.description || "")}">
${demo ? '<meta name="robots" content="noindex">' : when(s.seo?.canonical, `<link rel="canonical" href="${url(s.seo.canonical)}">`)}
<meta name="author" content="${esc(b.name)}">
<meta property="article:modified_time" content="${esc(s.builtAt || "")}">
<link rel="alternate" type="text/markdown" href="index.md">
<meta name="theme-color" content="${esc(s.theme?.themeColor || s.theme?.bg || "#ffffff")}">
<meta property="article:published_time" content="${esc(s.published || s.builtAt || "")}">
<meta property="og:type" content="website">
${when(s.seo?.canonical && !demo, `<meta property="og:url" content="${url(s.seo.canonical)}">`)}
<meta name="twitter:card" content="summary">
<meta property="og:title" content="${esc(s.seo?.title || b.name)}">
<meta property="og:description" content="${esc(s.seo?.description || "")}">
${when(s.seo?.ogImage, `<meta property="og:image" content="${url(s.seo.ogImage)}">`)}
${b.favicon ? `<link rel="icon" href="${url(b.favicon)}">` : '<link rel="icon" href="data:,">'}
${when(s.hero?.image, `<link rel="preload" as="image" href="${url(s.hero.image)}" fetchpriority="high">`)}
${(s.theme?.fontFaces || []).filter(f => f.preload).map(f => `<link rel="preload" as="font" type="font/woff2" href="${url(f.src)}" crossorigin>`).join("\n")}
<style>${theme({ fontFaces: s.theme?.fontFaces })}${BASE_CSS}${css}</style>
${extraHead}
${schema(s)}
</head>`;

  // Every tracked button carries data-ev (what funnel.js counts) and data-label (where it was).
  k.book = (where, label = bookLabel, cls = "btn btn-go", extra = "") =>
    `<a class="${cls}" href="#book" data-ev="book" data-label="${esc(where)}"${extra}>${esc(label)}</a>`;
  k.call = (where, inner = `Call ${esc(b.phone)}`, cls = "btn btn-call", extra = "") =>
    when(tel, `<a class="${cls}" href="tel:${tel}" data-ev="call" data-label="${esc(where)}"${extra}>${inner}</a>`);
  k.text = (where, inner = "Text us", cls = "btn btn-text", extra = "") =>
    when(sms, `<a class="${cls}" href="sms:${sms}" data-ev="text" data-label="${esc(where)}"${extra}>${inner}</a>`);
  k.phone = esc(b.phone);

  // "4.8 ★ · 61 reviews on Google (sample)": the sample tag is forced on demos (FTC rule).
  k.rating = (cls = "rating") => when(r.rating, `<p class="${cls}"><span class="stars" aria-hidden="true">★★★★★</span> <b>${esc(r.rating)}</b> <span>${esc(r.count ? r.count + " reviews on " : "on ")}${r.url ? `<a href="${url(r.url)}" rel="noopener" target="_blank">${esc(r.source || "Google")}</a>` : esc(r.source || "Google")}</span>${when(demo, ' <span class="sample-tag">(sample)</span>')}</p>`);
  k.reviewNote = cls => when(demo, `<p class="${cls || "sample-note"}">${esc(s.reviews?.sampleNote || "Sample reviews for this demo. Your site shows your own Google reviews, newest first, with names and dates.")}</p>`);
  // Reviews newest first; dates and names come from site.json.
  k.reviews = () => [...(r.items || [])].sort((a, z) => String(z.date || "").localeCompare(String(a.date || "")));

  k.demoBar = () => when(demo, `<div class="demo-bar" role="region" aria-label="Demo notice"><b>GroundWork demo</b> <span>${esc(s.demoNote || "Fictional business with sample photos and reviews.")}</span> <a href="${url(s.demoCta?.href || "https://groundwork-web.com/start/")}">${esc(s.demoCta?.label || "Get this site")}</a></div>`);

  // A placeholder that doubles as the shot list for the owner: says which photo goes here.
  k.shot = (src, alt, note, cls = "shot", eager = false) => src
    ? `<figure class="${cls}"><img src="${url(src)}" alt="${esc(alt || "")}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${when(note, `<figcaption>${esc(note)}</figcaption>`)}</figure>`
    : `<figure class="${cls} is-ph"><div class="ph" role="img" aria-label="${esc(alt || "Photo placeholder")}"></div><figcaption>${when(demo, '<b>Sample photo slot.</b> ')}${esc(note || alt || "")}</figcaption></figure>`;

  k.compare = (c = s.work?.compare, cls = "compare") => when(c, `<div class="${cls}" data-compare>
    <div class="pane before">${when(c.before, `<img src="${url(c.before)}" alt="Before${c.caption ? ": " + esc(c.caption) : ""}" loading="lazy" decoding="async">`)}</div>
    <div class="pane after">${when(c.after, `<img src="${url(c.after)}" alt="After${c.caption ? ": " + esc(c.caption) : ""}" loading="lazy" decoding="async">`)}</div>
    <span class="tag l">Before</span><span class="tag r">After</span><div class="handle" aria-hidden="true"></div>
    <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after${c.caption ? ": " + esc(c.caption) : ""}">
  </div>`);

  // Quote form, three short steps (marketing checklist 6, 7, 11): the easy question first,
  // then the job, then contact details last. Phone or email, whichever they prefer.
  const services = s.packages?.length ? s.packages.map(p => p.name).concat((s.services || []).map(x => x.name).filter(n => !s.packages.some(p => p.name === n))) : (s.services || []).map(x => x.name);
  const start = s.lead?.start || { question: "Weekly mowing or a one-time project?", options: [{ value: "Weekly mowing" }, { value: "One-time project" }] };
  k.form = (o = {}) => s.booking?.embedUrl
    ? `<div class="embed"><iframe src="${url(s.booking.embedUrl)}" title="Book with ${esc(b.name)}" loading="lazy"></iframe></div>`
    : `<form class="${o.cls || "quote"}" id="lead" data-steps novalidate aria-labelledby="${o.labelledby || "book-h"}">
  <p class="k-progress" aria-live="polite"><span data-progress>Step 1 of 3</span>${when(o.progressNote, ` <span class="k-progress-note">${esc(o.progressNote)}</span>`)}</p>
  <fieldset data-step="1" class="on">
    <legend>${esc(start.question)}</legend>
    <div class="choices">${start.options.map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x.value)}" id="kind-${i}"><span><b>${esc(x.label || x.value)}</b>${when(x.hint, `<small>${esc(x.hint)}</small>`)}</span></label>`).join("")}</div>
    <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
  </fieldset>
  <fieldset data-step="2">
    <legend>${esc(s.lead?.step2 || "Tell us about the yard")}</legend>
    <label for="f-service">${esc(s.lead?.serviceLabel || "What should we price?")}</label>
    <select name="service" id="f-service">${services.map(n => `<option>${esc(n)}</option>`).join("")}<option>Not sure yet</option></select>
    <label for="f-zip">ZIP code</label>
    <input name="zip" id="f-zip" inputmode="numeric" autocomplete="postal-code" maxlength="10" placeholder="${esc(s.lead?.zipHint || "")}">
    <label for="f-notes">Anything we should know? <span class="opt">(optional)</span></label>
    <textarea name="notes" id="f-notes" maxlength="1000" rows="3" placeholder="${esc(s.lead?.notesHint || "")}"></textarea>
    <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button type="button" class="btn btn-go" data-next>Next</button></div>
  </fieldset>
  <fieldset data-step="3">
    <legend>${esc(s.lead?.step3 || "Where should we send your estimate?")}</legend>
    <label for="f-name">Your name</label>
    <input name="name" id="f-name" autocomplete="name" required>
    <label for="f-phone">Mobile number</label>
    <input name="phone" id="f-phone" type="tel" autocomplete="tel" inputmode="tel">
    <label for="f-email">or email</label>
    <input name="email" id="f-email" type="email" autocomplete="email" pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+">
    <p class="hint">${esc(s.lead?.contactHint || "Phone or email, whichever you check first. You only need one.")}</p>
    <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
    <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button class="btn btn-go" type="submit">${esc(s.lead?.submit || "Get my free estimate")}</button></div>
    <p class="note">${esc(s.lead?.privacy || "No spam. We only use this to reply about your yard.")}</p>
  </fieldset>
  <p class="k-status" role="status" aria-live="polite" tabindex="-1"></p>
</form>`;

  k.faq = (cls = "faq") => when(s.faq?.length, `<div class="${cls}">${s.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>`);

  k.sticky = (cls = "sticky") => `<nav class="${cls}" aria-label="Quick actions">
  ${tel ? k.call("sticky", `${ICON.phone}<span>Call</span>`, "btn btn-call") : k.text("sticky", `${ICON.text}<span>Text</span>`, "btn btn-call")}
  ${when(tel && sms, k.text("sticky", `${ICON.text}<span>Text</span>`, "btn btn-text"))}
  ${k.book("sticky", s.sticky?.book || "Free estimate")}
</nav>`;

  k.credit = () => `© ${(s.builtAt || "").slice(0, 4) || new Date().getFullYear()} ${esc(b.name)}${when(s.credit !== false, ' · Site by <a href="https://groundwork-web.com/">GroundWork</a>')}`;
  k.addr = () => `<address style="font-style:normal;display:inline">${addrText()}</address>`;
  const addrText = () => esc([b.address?.street, b.address?.city, [b.address?.region, b.address?.postal].filter(Boolean).join(" ")].filter(Boolean).join(", "));

  k.scripts = (assetBase = "") => `<script>window.FUNNEL=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>
<script src="${assetBase}funnel.js" defer></script>`;

  return k;
}
