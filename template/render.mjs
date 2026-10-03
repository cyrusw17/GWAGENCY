// GroundWork Funnel Template: turns one site.json into a finished static page.
// Section order follows the funnel: promise, proof, price, process, proof of work,
// reviews, risk reversal, area check, booking, objections (FAQ), last call.
// No dependencies. Every string from site.json is escaped before it reaches the page,
// and every link or image address goes through url().

export const digits = s => String(s || "").replace(/[^\d+]/g, "");
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = (cond, html) => (cond ? (typeof html === "function" ? html() : html) : "");
const cssStr = (v = "") => String(v).replace(/[\\"'<>;{}\n\r]/g, ""); // values inside <style>, where HTML escapes don't decode
export const price = n => (typeof n === "number" ? "$" + n.toLocaleString("en-US") : String(n ?? ""));
const money = n => esc(price(n));
// Only web links and site-relative paths; anything else (javascript:, data:) becomes "#".
export const safeUrl = u => { u = String(u || "").trim(); return /^(https?:)?\/\//i.test(u) || !/^[a-z][\w+.-]*:/i.test(u) ? u : "#"; };
const url = u => esc(safeUrl(u));
const host = u => { try { return new URL(u).hostname.replace(/^www\./, "").split(".")[0]; } catch { return u; } };

const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

const img = (src, alt, eager = false) =>
  `<img src="${url(src)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;

function media(src, alt, cap, demo, cls = "f-media", eager = false) {
  const caption = cap || (!src && demo ? "Sample image. Real sites use the owner's own job photos." : "");
  return `<div class="${cls}">${src ? img(src, alt, eager) : '<div class="f-ph" aria-hidden="true"></div>'}${when(caption, `<div class="f-cap">${esc(caption)}</div>`)}</div>`;
}

// H1 names the service and the town: what search, Maps and AI answers read first.
export const headline = s => s.hero?.headline || `${s.business?.service || ""} in ${s.business?.area || s.business?.address?.city || ""}`;

const head = (eyebrow, title, sub) =>
  `<div class="f-head">${when(eyebrow, `<p class="f-eyebrow">${esc(eyebrow)}</p>`)}<h2>${esc(title)}</h2>${when(sub, `<p>${esc(sub)}</p>`)}</div>`;
const paras = body => (Array.isArray(body) ? body : [body]).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
// A key/value list: spec rows, kit lists, readings, seasons. Used by hero.card and blocks.
const rows = items => `<dl class="f-rows">${(items || []).map(x => `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}${when(x.note, `<small>${esc(x.note)}</small>`)}</dd></div>`).join("")}</dl>`;

function schema(s) {
  const b = s.business, a = b.address || {};
  const biz = {
    "@context": "https://schema.org",
    "@type": b.schemaType || "LocalBusiness",
    name: b.name,
    description: s.seo?.description,
    url: s.seo?.canonical,
    telephone: b.phone,
    email: b.email,
    image: s.seo?.ogImage || s.hero?.image,
    priceRange: b.priceRange,
    address: a.city ? { "@type": "PostalAddress", streetAddress: a.street, addressLocality: a.city, addressRegion: a.region, postalCode: a.postal, addressCountry: a.country || "US" } : undefined,
    areaServed: (s.areas?.cities || []).map(c => ({ "@type": "City", name: c })),
    openingHoursSpecification: (b.hours || []).map(h => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    sameAs: b.social?.length ? b.social : undefined,
    hasOfferCatalog: s.packages?.length ? {
      "@type": "OfferCatalog", name: "Services",
      itemListElement: s.packages.map(p => ({ "@type": "Offer", name: p.name, price: typeof p.price === "number" ? p.price : undefined, priceCurrency: "USD", itemOffered: { "@type": "Service", name: p.name } })),
    } : undefined,
  };
  const out = [biz,
    // The page itself: who publishes it and when it was last built (freshness + author signals for AI answers).
    { "@context": "https://schema.org", "@type": "WebPage", name: s.seo?.title, url: s.seo?.canonical, dateModified: s.builtAt, author: { "@type": "Organization", name: b.name }, publisher: { "@type": "Organization", name: b.name }, about: { "@type": biz["@type"], name: b.name } }];
  if (s.faq?.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  // Inside <script>, "</" must not appear; JSON.stringify already escapes quotes.
  return out.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
}

function theme(t = {}) {
  const map = { bg: "--f-bg", surface: "--f-surface", surface2: "--f-surface-2", text: "--f-text", muted: "--f-muted", line: "--f-line", accent: "--f-accent", accentInk: "--f-accent-ink", accent2: "--f-accent-2", display: "--f-display", body: "--f-body", radius: "--f-radius" };
  const rules = Object.entries(map).filter(([k]) => t[k]).map(([k, v]) => `${v}:${String(t[k]).replace(/[;{}<>]/g, "")}`);
  const fonts = (t.fontFaces || []).map(f => `@font-face{font-family:"${cssStr(f.family)}";font-weight:${Number(f.weight) || 400};font-style:normal;font-display:swap;src:url("${cssStr(f.src)}") format("woff2")}`);
  return `${fonts.join("")}:root{${rules.join(";")}}`;
}

export function render(s, { css = "", design = "", assetBase = "" } = {}) {
  const b = s.business, demo = !!s.demo;
  const tel = digits(b.phone), sms = digits(b.sms || b.phone);
  const bookLabel = s.booking?.cta || "Book now";
  const thanks = s.lead?.thanks || `Got it. ${b.name} will text you back shortly${b.hoursText ? " (" + b.hoursText + ")" : ""}.`;
  // "tracking": "groundwork" sends counts and leads to our collector (public/api/sites.php) for the monthly results text.
  const gw = s.tracking === "groundwork" ? (s.trackingBase || "https://groundwork-web.com") + "/api/sites.php?a=" : "";
  const cfg = { slug: s.slug, demo, sms, thanks,
    lead: s.lead?.endpoint || (gw && gw + "lead"), analytics: s.analytics?.endpoint || (gw && !demo ? gw + "event" : ""), plain: !!gw && !s.lead?.endpoint };

  const bookBtn = (where, label = bookLabel, cls = "f-btn f-btn-primary", extra = "") =>
    `<a class="${cls}" href="#book" data-ev="book" data-label="${esc(where)}"${extra}>${esc(label)}</a>`;
  const callBtn = (where, inner = `${ICON.phone}Call ${esc(b.phone)}`, extra = "") =>
    when(tel, `<a class="f-btn f-btn-ghost" href="tel:${tel}" data-ev="call" data-label="${esc(where)}"${extra}>${inner}</a>`);

  const heroLayout = ["compare", "overlay", "type", "stack"].includes(s.layout?.hero) ? s.layout.hero : "split";
  const eb = (id, dflt) => s.eyebrows?.[id] ?? dflt; // per-site section labels; "" hides one
  const r = s.reviews, w = s.work, members = (s.packages || []).some(p => p.member != null);
  const ratingLine = r?.rating && `<span class="stars" aria-hidden="true">★★★★★</span><b>${esc(r.rating)}</b><span>${esc(r.count ? r.count + " reviews on " : "on ")}${r.url ? `<a href="${url(r.url)}" rel="noopener" target="_blank">${esc(r.source || "Google")}</a>` : esc(r.source || "Google")}</span>${when(demo, '<span class="f-tag">sample</span>')}`;
  // Newest first, and "Latest review: N days ago" (recency is what visitors weigh most).
  const reviews = [...(r?.items || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const monthYear = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const compare = where => `<div class="f-compare-wrap"><div class="f-compare" data-compare>
      ${pane("before", w.compare.before)}${pane("after", w.compare.after)}
      <span class="tag l">Before</span><span class="tag r">After</span><div class="handle"></div>
      <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after${w.compare.caption ? ": " + esc(w.compare.caption) : ""}">
    </div>
    <p class="f-fine">${esc(w.compare.caption || (demo ? "Drag to compare. Sample imagery in this demo." : "Drag to compare."))}</p></div>`;
  const pane = (side, src) => `<div class="pane ${side}${src ? "" : " ph"}">${when(src, img(src, `${side === "before" ? "Before" : "After"}${w.compare.caption ? ": " + w.compare.caption : ""}`))}</div>`;

  // One list decides both what renders and what the nav links to.
  const sections = [
    { id: "services", nav: "Services", show: s.services?.length, html: () => `
<section id="services">
  <div class="f-wrap">
    ${head(eb("services", "Services"), s.servicesHeadline || "What we do")}
    <div class="f-services">
      ${s.services.map(x => `<div class="f-svc"><div class="top"><h3>${esc(x.name)}</h3>${when(x.from != null, `<span class="price">from ${money(x.from)}</span>`)}</div><p>${esc(x.desc)}</p></div>`).join("\n      ")}
    </div>
  </div>
</section>` },
    { id: "pricing", nav: "Pricing", show: s.packages?.length, html: () => `
<section class="f-band f-pricing" id="pricing">
  <div class="f-wrap">
    ${head(eb("pricing", "Pricing"), s.pricing?.headline || "Clear prices, up front", s.pricing?.sub)}
    ${when(members, `<fieldset class="f-toggle"><legend class="sr-only">Price type</legend>
      <label><input type="radio" name="bill" value="once" checked><span>${esc(s.pricing?.onceLabel || "One-time")}</span></label>
      <label><input type="radio" name="bill" value="member" id="bill-member"><span>${esc(s.pricing?.memberLabel || "Member")}</span></label>
    </fieldset>`)}
    <div class="f-pkgs">
      ${s.packages.map(p => `<div class="f-pkg${p.popular ? " pop" : ""}">
        ${when(p.popular, `<div class="tag" aria-hidden="true">${esc(p.popularLabel || "Most popular")}</div>`)}
        <div class="pn">${esc(p.name)}${when(p.popular, `<span class="sr-only">, ${esc(p.popularLabel || "most popular")}</span>`)}</div>
        <div class="pp"><span class="once">${money(p.price)}</span>${when(p.member != null, `<span class="member">${money(p.member)}<small> ${esc(s.pricing?.memberUnit || "/visit")}</small></span>`)}</div>
        ${when(p.note, `<div class="pt">${esc(p.note)}</div>`)}
        <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        ${bookBtn("package " + p.name, p.cta || "Choose " + p.name, `f-btn ${p.popular ? "f-btn-primary" : "f-btn-ghost"} f-btn-block`, ` data-pick="${esc(p.name)}"`)}
      </div>`).join("\n      ")}
    </div>
    ${when(s.pricing?.fine, `<p class="f-fine">${esc(s.pricing.fine)}</p>`)}
  </div>
</section>` },
    { id: "how", show: s.steps?.length, html: () => `
<section id="how">
  <div class="f-wrap">
    ${head(eb("how", "How it works"), s.stepsHeadline || "Booked in under a minute")}
    <ol class="f-steps">${s.steps.map(x => `<li><div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div></li>`).join("")}</ol>
  </div>
</section>` },
    { id: "work", nav: "Our work", show: w, html: () => `
<section class="f-band" id="work">
  <div class="f-wrap">
    ${head(eb("work", "Our work"), w.headline || "Recent jobs", w.sub)}
    ${when(w.compare && heroLayout !== "compare", () => compare("work"))}
    ${when(w.gallery?.length, `<div class="f-gallery">${(w.gallery || []).map(g => media(g.image, g.alt || g.caption || "", g.caption, false)).join("")}</div>`)}
  </div>
</section>` },
    { id: "reviews", nav: "Reviews", show: r?.items?.length, html: () => `
<section id="reviews">
  <div class="f-wrap">
    ${head(eb("reviews", "Reviews"), r.headline || "What customers say")}
    ${when(demo && r.sampleNote !== "", `<p class="f-sample">${esc(r.sampleNote || "Sample reviews for this demo. Real sites show the business's own Google reviews.")}</p>`)}
    ${when(ratingLine, `<p class="f-rating">${ratingLine}${when(reviews[0]?.date, () => `<span class="f-muted">· Latest review <span data-since="${esc(reviews[0].date)}">${esc(monthYear(reviews[0].date))}</span></span>`)}</p>`)}
  </div>
  <div class="f-reviews" role="list">
    ${reviews.map(x => `<figure class="f-rev" role="listitem"><div class="stars" role="img" aria-label="${Number(x.stars) || 5} out of 5 stars">${"★".repeat(Number(x.stars) || 5)}</div><blockquote>${esc(x.text)}</blockquote><figcaption><b>${esc(x.name)}</b>${esc(x.detail || "")}${when(x.date, `<time datetime="${esc(x.date)}">${esc(monthYear(x.date))}</time>`)}</figcaption></figure>`).join("\n    ")}
  </div>
</section>` },
    { id: "promise", show: s.guarantee, html: () => `
<section>
  <div class="f-wrap">
    <div class="f-guarantee">
      <div><p class="f-eyebrow">${esc(s.guarantee.eyebrow || "Our promise")}</p><h2>${esc(s.guarantee.title)}</h2><p>${esc(s.guarantee.body)}</p></div>
      ${bookBtn("guarantee", bookLabel, "f-btn")}
    </div>
  </div>
</section>` },
    { id: "areas", nav: "Areas", show: s.areas, html: () => `
<section class="f-band" id="areas">
  <div class="f-wrap f-areas-grid">
    <div>
      ${when(eb("areas", "Service area"), () => `<p class="f-eyebrow">${esc(eb("areas", "Service area"))}</p>`)}<h2>${esc(s.areas.headline || "Where we work")}</h2>
      ${when(s.areas.body, `<p class="f-muted f-lead">${esc(s.areas.body)}</p>`)}
      <ul class="f-areas" aria-label="Areas we serve">${(s.areas.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>
    ${s.areas.mapEmbed ? `<div class="f-map"><iframe src="${url(s.areas.mapEmbed)}" title="Service area map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : when(demo, media("", "", "Real sites embed a Google map of the service area here.", demo, "f-map"))}
  </div>
</section>` },
    { id: "book", show: true, html: () => `
<section id="book">
  <div class="f-wrap f-book">
    <div>
      ${when(s.booking?.eyebrow !== "", `<p class="f-eyebrow">${esc(s.booking?.eyebrow || "Book")}</p>`)}
      <h2 id="book-h">${esc(s.booking?.headline || "Get your price and a time")}</h2>
      ${when(s.booking?.body, `<p class="f-muted f-lead">${esc(s.booking?.body)}</p>`)}
      ${when(sms, `<p class="f-alt">Rather talk? ${when(tel, `<a href="tel:${tel}" data-ev="call" data-label="book section">Call ${esc(b.phone)}</a> or `)}<a href="sms:${sms}" data-ev="text" data-label="book section">send a text</a>.</p>`)}
    </div>
    ${bookWidget}
  </div>
</section>` },
    { id: "faq", nav: "FAQ", show: s.faq?.length, html: () => `
<section class="f-band" id="faq">
  <div class="f-wrap">
    ${head(eb("faq", "FAQ"), s.faqHeadline || "Questions, answered")}
    <div class="f-faq">${(s.faq || []).map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </div>
</section>` },
    // Free-form sections for what makes this business itself: the owner's note, the van kit, a spec sheet, a season calendar.
    ...(s.blocks || []).map(x => ({ id: x.id, nav: x.nav, show: true, html: () => `
<section class="f-block f-block-${esc(x.kind || "text")}${x.band ? " f-band" : ""}" id="${esc(x.id)}">
  <div class="f-wrap">
    <div class="f-block-copy">
      ${when(x.eyebrow, `<p class="f-eyebrow">${esc(x.eyebrow)}</p>`)}
      ${when(x.title, `<h2>${esc(x.title)}</h2>`)}
      ${paras(x.body)}
      ${when(x.sign, `<p class="f-sign">${esc(x.sign)}</p>`)}
    </div>
    ${when(x.items?.length, () => rows(x.items))}
    ${when(x.image, () => media(x.image, x.imageAlt || "", x.caption, demo))}
  </div>
</section>` })),
  ];
  const order = s.layout?.order;
  if (order) sections.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99));
  const shown = sections.filter(x => x.show);
  const nav = shown.filter(x => x.nav);

  const multi = !!s.lead?.multi;
  const choices = s.lead?.options || (s.packages?.length ? s.packages.map(p => p.name) : (s.services || []).map(x => x.name)).concat("Not sure yet");
  const bookWidget = s.booking?.embedUrl
    ? `<div class="f-embed"><iframe src="${url(s.booking.embedUrl)}" title="Book with ${esc(b.name)}" loading="lazy"></iframe></div>`
    : `<form class="f-form" id="lead" aria-labelledby="book-h" novalidate>
      <p class="f-step" aria-live="polite">Step <span data-step>1</span> of 2</p>
      <div class="s1">
        <fieldset class="f-chips"><legend>${esc(s.lead?.question || "What do you need?")}${when(multi, ' <span class="opt">(pick all that apply)</span>')}</legend>
          ${choices.map((n, i) => `<label><input type="${multi ? "checkbox" : "radio"}" name="service" value="${esc(n)}"${!multi && i === 0 ? " checked" : ""}><span>${esc(n)}</span></label>`).join("\n          ")}
        </fieldset>
        <label>ZIP code<input name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10"></label>
        <button class="f-btn f-btn-primary f-btn-block" type="button" data-next>${esc(s.lead?.next || "Next")}</button>
      </div>
      <div class="s2">
        <label>Mobile number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="We text you back"></label>
        <label>Your name <span class="opt">(optional)</span><input name="name" autocomplete="name"></label>
        <details><summary>Add details <span class="opt">(optional)</span></summary><textarea name="notes" maxlength="1000" aria-label="Details" placeholder="${esc(s.lead?.notesHint || "")}"></textarea></details>
        <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
        <button class="f-btn f-btn-primary f-btn-block" type="submit">${esc(s.lead?.submit || "Get my quote")}</button>
        <p class="note">${esc(s.lead?.privacy || "No spam. We only use your number to reply about this request.")}</p>
      </div>
      <p role="status" aria-live="polite" tabindex="-1"></p>
    </form>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(s.seo?.title || b.name)}</title>
<meta name="description" content="${esc(s.seo?.description || "")}">
${demo ? '<meta name="robots" content="noindex">' : when(s.seo?.canonical, `<link rel="canonical" href="${url(s.seo.canonical)}">`)}
<meta name="author" content="${esc(b.name)}">
<meta property="article:modified_time" content="${esc(s.builtAt || "")}">
<link rel="alternate" type="text/markdown" href="index.md">
<meta name="theme-color" content="${esc(s.theme?.bg || "#F6F5F1")}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.seo?.title || b.name)}">
<meta property="og:description" content="${esc(s.seo?.description || "")}">
${when(s.seo?.ogImage, `<meta property="og:image" content="${url(s.seo.ogImage)}">`)}
<link rel="icon" href="${b.favicon ? url(b.favicon) : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${cssStr(s.theme?.accent || "#C2410C")}"/><text x="16" y="23" font-family="system-ui,sans-serif" font-size="19" font-weight="700" text-anchor="middle" fill="${cssStr(s.theme?.accentInk || "#fff")}">${esc((b.name || "?")[0])}</text></svg>`)}`}">
${when(s.hero?.image, `<link rel="preload" as="image" href="${url(s.hero.image)}" fetchpriority="high">`)}
${(s.theme?.fontFaces || []).filter(f => f.preload).map(f => `<link rel="preload" as="font" type="font/woff2" href="${url(f.src)}" crossorigin>`).join("\n")}
<style>${css}${theme(s.theme)}${design}</style>
${css ? "" : `<link rel="stylesheet" href="${assetBase}funnel.css">`}
${schema(s)}
</head>
<body class="f-hero-is-${heroLayout}${demo ? " has-demo" : ""}">
<a class="skip" href="#main">Skip to content</a>
${when(demo, `<div class="f-demo" role="region" aria-label="Demo notice"><div class="f-wrap"><b>${esc(s.demoLabel || "GroundWork demo")}</b><span>${esc(s.demoNote || "Fictional business. Yours gets your name, photos and prices.")}</span><a href="${url(s.demoCta?.href || "https://groundwork-web.com/start/")}">${esc(s.demoCta?.label || "Get this site")}</a></div></div>`)}
${when(s.offer?.bar, `<div class="f-offerbar">${esc(s.offer.bar)} ${bookBtn("offer bar", s.offer.barCta || "Claim it", "")}</div>`)}
<header class="f-header">
  <div class="f-wrap">
    <a class="f-logo" href="#main">${b.logo ? `<img src="${url(b.logo)}" alt="${esc(b.name)}">` : `${esc(b.name)}${when(b.tagline, `<small class="f-tagline">${esc(b.tagline)}</small>`)}`}</a>
    ${when(nav.length, `<nav class="f-nav" aria-label="Sections">${nav.map(x => `<a href="#${x.id}">${x.nav}</a>`).join("")}</nav>`)}
    <div class="f-actions">
      ${callBtn("header", `${ICON.phone}<span class="f-call-text">${esc(b.phone)}</span>`, ` aria-label="Call ${esc(b.phone)}"`)}
      ${bookBtn("header")}
    </div>
  </div>
</header>

<main id="main">
<section class="f-hero f-hero-${heroLayout}"${heroLayout === "overlay" && s.hero.image ? ` style="--hero-img:url('${cssStr(safeUrl(s.hero.image))}')"` : ""}>
  <div class="f-wrap">
    <div class="f-hero-copy">
      ${when(ratingLine && s.hero.ratingBadge !== false, `<p class="f-pill">${ratingLine}</p>`)}
      ${when(s.hero.eyebrow, `<p class="f-eyebrow">${esc(s.hero.eyebrow)}</p>`)}
      <h1>${esc(headline(s))}${when(s.hero.headlineEm, ` <em>${esc(s.hero.headlineEm)}</em>`)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="f-ctas">
        ${bookBtn("hero")}
        ${callBtn("hero")}
      </div>
      ${when(s.hero.proof?.length, `<ul class="f-proof">${(s.hero.proof || []).map(p => `<li><b>${esc(p.value)}</b>${p.href ? `<a href="${url(p.href)}" rel="noopener" target="_blank">${esc(p.label)}</a>` : esc(p.label)}</li>`).join("")}</ul>`)}
    </div>
    ${heroLayout === "compare" && w?.compare ? compare("hero")
      : s.hero.card ? `<aside class="f-hero-card">${when(s.hero.card.title, `<p class="f-eyebrow">${esc(s.hero.card.title)}</p>`)}${rows(s.hero.card.rows)}${when(s.hero.card.note, `<p class="f-fine">${esc(s.hero.card.note)}</p>`)}</aside>`
      : ["overlay", "type"].includes(heroLayout) ? "" : media(s.hero.image, s.hero.imageAlt || "", s.hero.caption, demo, "f-media", true)}
  </div>
</section>

${when(s.trust?.length, `<ul class="f-trust" aria-label="Why customers trust us">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>`)}
${shown.map(x => x.html()).join("\n")}

<section class="f-final">
  <div class="f-wrap">
    <h2>${esc(s.final?.headline || "Ready when you are.")}</h2>
    ${when(s.final?.sub, `<p class="f-muted f-lead">${esc(s.final?.sub)}</p>`)}
    <div class="f-ctas">
      ${bookBtn("final")}
      ${callBtn("final", `${ICON.phone}Call now`)}
    </div>
  </div>
</section>
</main>

<footer class="f-footer">
  <div class="f-wrap">
    <div><b>${esc(b.name)}</b>${esc(b.footerLine || b.tagline || "")}${when(b.address?.city, `<br>${esc([b.address?.street, b.address?.city, [b.address?.region, b.address?.postal].filter(Boolean).join(" ")].filter(Boolean).join(", "))}`)}${when(b.license, `<br>${esc(b.license)}`)}</div>
    <div><b>Contact</b>${when(tel, `<a href="tel:${tel}" data-ev="call" data-label="footer">${esc(b.phone)}</a><br>`)}${when(b.email, `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br>`)}${esc(b.hoursText || "")}</div>
    <div><b>Follow</b>${(b.social || []).map(u => `<a href="${url(u)}" rel="noopener" target="_blank">${esc(host(u))}</a>`).join(" · ") || "&nbsp;"}<p class="credit">© ${(s.builtAt || "").slice(0, 4) || new Date().getFullYear()} ${esc(b.name)}${when(s.credit !== false, ` · Site by <a href="https://groundwork-web.com/">GroundWork</a>`)}</p></div>
  </div>
</footer>

<nav class="f-sticky" aria-label="Quick actions">
  ${callBtn("sticky", `${ICON.phone}Call`)}
  ${when(sms, `<a class="f-btn f-btn-ghost" href="sms:${sms}" data-ev="text" data-label="sticky">${ICON.text}Text</a>`)}
  ${bookBtn("sticky")}
</nav>

<script>window.FUNNEL=${JSON.stringify(cfg).replace(/</g, "\\u003c")};</script>
<script src="${assetBase}funnel.js" defer></script>
</body>
</html>
`;
}

export function robots(s) {
  if (s.demo) return "User-agent: *\nDisallow: /\n";
  return `# Search engines and AI answer engines are welcome.\nUser-agent: *\nAllow: /\n${s.seo?.canonical ? `\nSitemap: ${new URL("sitemap.xml", s.seo.canonical).href}\n` : ""}`;
}

export function sitemap(s) {
  if (!s.seo?.canonical) return "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(s.seo.canonical)}</loc><lastmod>${esc(s.builtAt)}</lastmod></url>\n</urlset>\n`;
}

// Plain-text summary for AI answer engines (llms.txt and index.md). Facts only, straight from site.json.
export function llms(s) {
  const b = s.business;
  const lines = [`# ${b.name}`, "", `> ${s.seo?.description || b.tagline || ""}`, ""];
  if (b.phone) lines.push(`- Phone: ${b.phone}`);
  if (b.hoursText) lines.push(`- Hours: ${b.hoursText}`);
  if (s.areas?.cities?.length) lines.push(`- Service area: ${s.areas.cities.join(", ")}`);
  if (s.packages?.length) { lines.push("", "## Prices"); s.packages.forEach(p => lines.push(`- ${p.name}: ${price(p.price)}${p.member != null ? ` (members ${price(p.member)})` : ""}${p.note ? ` (${p.note})` : ""}`)); }
  if (s.services?.length) { lines.push("", "## Services"); s.services.forEach(x => lines.push(`- ${x.name}${x.from != null ? ` (from ${price(x.from)})` : ""}: ${x.desc}`)); }
  if (s.faq?.length) { lines.push("", "## FAQ"); s.faq.forEach(f => lines.push(`- ${f.q} ${f.a}`)); }
  return lines.join("\n") + "\n";
}
