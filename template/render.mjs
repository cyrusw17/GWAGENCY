// GroundWork Funnel Template: turns one site.json into a finished static page.
// Section order follows the funnel: promise, proof, price, process, proof of work,
// reviews, risk reversal, area check, booking, objections (FAQ), last call.
// No dependencies. Every string from site.json is escaped before it reaches the page.

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const digits = s => String(s || "").replace(/[^\d+]/g, "");
const money = n => (typeof n === "number" ? "$" + n.toLocaleString("en-US") : esc(n));
const when = (cond, html) => (cond ? html : "");

const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

function media(img, alt, cap, demo, cls = "f-media", eager = false) {
  const inner = img
    ? `<img src="${esc(img)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
    : `<div class="f-ph" aria-hidden="true"></div>`;
  const caption = cap || (!img && demo ? "Sample image. Real sites use the owner's own job photos." : "");
  return `<div class="${cls}">${inner}${when(caption, `<div class="f-cap">${caption}</div>`)}</div>`;
}

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
  const out = [biz];
  // The page itself: who publishes it and when it was last built (freshness + author signals for AI answers).
  out.push({ "@context": "https://schema.org", "@type": "WebPage", name: s.seo?.title, url: s.seo?.canonical, dateModified: s.builtAt, author: { "@type": "Organization", name: b.name }, publisher: { "@type": "Organization", name: b.name }, about: { "@type": biz["@type"], name: b.name } });
  if (s.faq?.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  // Inside <script>, "</" must not appear; JSON.stringify already escapes quotes.
  return out.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
}

function theme(t = {}) {
  const map = { bg: "--f-bg", surface: "--f-surface", surface2: "--f-surface-2", text: "--f-text", muted: "--f-muted", line: "--f-line", accent: "--f-accent", accentInk: "--f-accent-ink", accent2: "--f-accent-2", display: "--f-display", body: "--f-body", radius: "--f-radius" };
  const rules = Object.entries(map).filter(([k]) => t[k]).map(([k, v]) => `${v}:${String(t[k]).replace(/[;{}<>]/g, "")}`);
  const fonts = (t.fontFaces || []).map(f => `@font-face{font-family:"${esc(f.family)}";font-weight:${Number(f.weight) || 400};font-style:normal;font-display:swap;src:url("${esc(f.src)}") format("woff2")}`);
  return `<style>${fonts.join("")}:root{${rules.join(";")}}</style>`;
}

export function render(s, { assetBase = "" } = {}) {
  const b = s.business, demo = !!s.demo;
  const tel = digits(b.phone), sms = digits(b.sms || b.phone);
  const bookHref = "#book";
  const bookLabel = s.booking?.cta || "Book now";
  const services = s.packages?.length ? s.packages.map(p => p.name) : (s.services || []).map(x => x.name);
  const thanks = s.lead?.thanks || `Got it. ${b.name} will text you back shortly${b.hoursText ? " (" + b.hoursText + ")" : ""}.`;
  const cfg = { slug: s.slug, demo, phone: tel, sms, lead: s.lead?.endpoint || "", analytics: s.analytics?.endpoint || "", thanks };

  const nav = [["#services", "Services"], ["#pricing", "Pricing"], ["#work", "Our work"], ["#reviews", "Reviews"], ["#areas", "Areas"], ["#faq", "FAQ"]]
    .filter(([id]) => ({ "#services": s.services?.length, "#pricing": s.packages?.length, "#work": s.work, "#reviews": s.reviews?.items?.length, "#areas": s.areas, "#faq": s.faq?.length })[id]);

  const reviewsBlock = s.reviews?.items?.length ? `
<section id="reviews">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">Reviews</p><h2>${esc(s.reviews.headline || "What customers say")}</h2></div>
    ${when(demo && s.reviews.sampleNote !== "", `<p class="f-sample">${esc(s.reviews.sampleNote || "Sample reviews for this demo. Real sites show the business's own Google reviews.")}</p>`)}
    ${when(s.reviews.rating, `<p class="f-rating"><span class="stars" aria-hidden="true">★★★★★</span><b>${esc(s.reviews.rating)}</b><span class="f-muted">${esc(s.reviews.count ? s.reviews.count + " reviews on " : "on ")}${s.reviews.url ? `<a href="${esc(s.reviews.url)}" rel="noopener" target="_blank">${esc(s.reviews.source || "Google")}</a>` : esc(s.reviews.source || "Google")}</span></p>`)}
    <div class="f-reviews">
      ${s.reviews.items.map(r => `<figure class="f-rev"><div class="stars" role="img" aria-label="${Number(r.stars) || 5} out of 5 stars">${"★".repeat(Number(r.stars) || 5)}</div><blockquote>${esc(r.text)}</blockquote><figcaption><b>${esc(r.name)}</b>${esc(r.detail || "")}</figcaption></figure>`).join("\n      ")}
    </div>
  </div>
</section>` : "";

  let bookWidget;
  if (s.booking?.embedUrl) {
    bookWidget = `<div class="f-embed"><iframe src="${esc(s.booking.embedUrl)}" title="Book with ${esc(b.name)}" loading="lazy"></iframe></div>`;
  } else {
    bookWidget = `<form class="f-form" id="lead" aria-labelledby="book-h" novalidate>
      <label>Your name<input name="name" autocomplete="name" required></label>
      <label>Mobile number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="We text you back"></label>
      <div class="row">
        <label>${esc(s.lead?.serviceLabel || "What do you need?")}<select name="service">${services.map(n => `<option>${esc(n)}</option>`).join("")}<option>Not sure yet</option></select></label>
        <label>ZIP code<input name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10"></label>
      </div>
      <label>Anything we should know? <span class="opt">(optional)</span><textarea name="notes" maxlength="1000" placeholder="${esc(s.lead?.notesHint || "")}"></textarea></label>
      <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
      <button class="f-btn f-btn-primary f-btn-block" type="submit">${esc(s.lead?.submit || "Get my quote")}</button>
      <p class="note">${esc(s.lead?.privacy || "No spam. We only use your number to reply about this request.")}</p>
      <p role="status" aria-live="polite" tabindex="-1"></p>
    </form>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(s.seo?.title || b.name)}</title>
<meta name="description" content="${esc(s.seo?.description || "")}">
${demo ? '<meta name="robots" content="noindex">' : when(s.seo?.canonical, `<link rel="canonical" href="${esc(s.seo?.canonical)}">`)}
<meta name="author" content="${esc(b.name)}">
<meta property="article:modified_time" content="${esc(s.builtAt || "")}">
<link rel="alternate" type="text/markdown" href="index.md">
<meta name="theme-color" content="${esc(s.theme?.bg || "#F6F5F1")}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.seo?.title || b.name)}">
<meta property="og:description" content="${esc(s.seo?.description || "")}">
${when(s.seo?.ogImage, `<meta property="og:image" content="${esc(s.seo?.ogImage)}">`)}
${when(s.business.favicon, `<link rel="icon" href="${esc(s.business?.favicon)}">`)}
<link rel="stylesheet" href="${assetBase}funnel.css">
${theme(s.theme)}
${when(s.hero?.image, `<link rel="preload" as="image" href="${esc(s.hero?.image)}">`)}
${schema(s)}
</head>
<body${demo ? ' class="has-demo"' : ""}>
<a class="skip" href="#main">Skip to content</a>
${when(demo, `<div class="f-demo" role="region" aria-label="Demo notice"><div class="f-wrap"><b>${esc(s.demoLabel || "GroundWork demo")}</b><span>${esc(s.demoNote || "Fictional business. Yours gets your name, photos and prices.")}</span><a href="${esc(s.demoCta?.href || "https://groundwork-web.com/start/")}">${esc(s.demoCta?.label || "Get this site")}</a></div></div>`)}
${when(s.offer?.bar, `<div class="f-offerbar">${esc(s.offer?.bar)} <a href="${bookHref}" data-ev="book" data-label="offer bar">${esc(s.offer?.barCta || "Claim it")}</a></div>`)}
<header class="f-header">
  <div class="f-wrap">
    <a class="f-logo" href="#main">${s.business.logo ? `<img src="${esc(s.business.logo)}" alt="${esc(b.name)}">` : `${esc(b.name)}${when(b.tagline, `<small>${esc(b.tagline)}</small>`)}`}</a>
    ${when(nav.length, `<nav class="f-nav" aria-label="Sections">${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</nav>`)}
    <div class="f-actions">
      ${when(tel, `<a class="f-btn f-btn-ghost" href="tel:${tel}" data-ev="call" data-label="header" aria-label="Call ${esc(b.phone)}">${ICON.phone}<span class="f-call-text">${esc(b.phone)}</span></a>`)}
      <a class="f-btn f-btn-primary" href="${bookHref}" data-ev="book" data-label="header">${esc(bookLabel)}</a>
    </div>
  </div>
</header>

<main id="main">
<section class="f-hero">
  <div class="f-wrap">
    <div>
      ${when(s.hero.eyebrow, `<p class="f-eyebrow">${esc(s.hero.eyebrow)}</p>`)}
      <h1>${esc(s.hero.headline)}${when(s.hero.headlineEm, ` <em>${esc(s.hero.headlineEm)}</em>`)}</h1>
      <p class="lede">${esc(s.hero.sub)}</p>
      <div class="f-ctas">
        <a class="f-btn f-btn-primary" href="${bookHref}" data-ev="book" data-label="hero">${esc(s.hero.cta || bookLabel)}</a>
        ${when(tel, `<a class="f-btn f-btn-ghost" href="tel:${tel}" data-ev="call" data-label="hero">${ICON.phone}Call ${esc(b.phone)}</a>`)}
      </div>
      ${when(s.hero.proof?.length, `<ul class="f-proof">${(s.hero.proof || []).map(p => `<li><b>${esc(p.value)}</b>${p.href ? `<a href="${esc(p.href)}" rel="noopener" target="_blank">${esc(p.label)}</a>` : esc(p.label)}</li>`).join("")}</ul>`)}
    </div>
    ${media(s.hero.image, s.hero.imageAlt || "", s.hero.caption ? esc(s.hero.caption) : "", demo, "f-media", true)}
  </div>
</section>

${when(s.trust?.length, `<ul class="f-trust" aria-label="Why customers trust us">${(s.trust || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul>`)}

${when(s.services?.length, `<section id="services">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">Services</p><h2>${esc(s.servicesHeadline || "What we do")}</h2></div>
    <div class="f-services">
      ${(s.services || []).map(x => `<div class="f-svc"><div class="top"><h3>${esc(x.name)}</h3>${when(x.from != null, `<span class="price">from ${money(x.from)}</span>`)}</div><p>${esc(x.desc)}</p></div>`).join("\n      ")}
    </div>
  </div>
</section>`)}

${when(s.packages?.length, `<section class="f-band" id="pricing">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">Pricing</p><h2>${esc(s.pricing?.headline || "Clear prices, up front")}</h2>${when(s.pricing?.sub, `<p>${esc(s.pricing?.sub)}</p>`)}</div>
    <div class="f-pkgs">
      ${(s.packages || []).map(p => `<div class="f-pkg${p.popular ? " pop" : ""}">
        ${when(p.popular, `<div class="tag" aria-hidden="true">${esc(p.popularLabel || "Most popular")}</div>`)}
        <div class="pn">${esc(p.name)}${when(p.popular, `<span class="sr-only">, ${esc(p.popularLabel || "most popular")}</span>`)}</div>
        <div class="pp">${money(p.price)}</div>
        ${when(p.note, `<div class="pt">${esc(p.note)}</div>`)}
        <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        <a class="f-btn ${p.popular ? "f-btn-primary" : "f-btn-ghost"} f-btn-block" href="${bookHref}" data-ev="book" data-label="package ${esc(p.name)}" data-pick="${esc(p.name)}">${esc(p.cta || "Choose " + p.name)}</a>
      </div>`).join("\n      ")}
    </div>
    ${when(s.pricing?.fine, `<p class="f-fine">${esc(s.pricing?.fine)}</p>`)}
  </div>
</section>`)}

${when(s.steps?.length, `<section id="how">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">How it works</p><h2>${esc(s.stepsHeadline || "Booked in under a minute")}</h2></div>
    <ol class="f-steps">${(s.steps || []).map(x => `<li><div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div></li>`).join("")}</ol>
  </div>
</section>`)}

${when(s.work, `<section class="f-band" id="work">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">Our work</p><h2>${esc(s.work?.headline || "Recent jobs")}</h2>${when(s.work?.sub, `<p>${esc(s.work?.sub)}</p>`)}</div>
    ${when(s.work?.compare, `<div class="f-compare" data-compare>
      <div class="pane before${s.work?.compare?.before ? "" : " ph"}"${s.work?.compare?.before ? ` style="background-image:url('${esc(s.work.compare.before)}')"` : ""}></div>
      <div class="pane after${s.work?.compare?.after ? "" : " ph"}"${s.work?.compare?.after ? ` style="background-image:url('${esc(s.work.compare.after)}')"` : ""}></div>
      <span class="tag l">Before</span><span class="tag r">After</span><div class="handle"></div>
      <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after${s.work?.compare?.caption ? ": " + esc(s.work.compare.caption) : ""}">
    </div>
    <p class="f-fine">${esc(s.work?.compare?.caption || (demo ? "Drag to compare. Sample imagery in this demo." : "Drag to compare."))}</p>`)}
    ${when(s.work?.gallery?.length, `<div class="f-gallery">${(s.work?.gallery || []).map(g => media(g.image, g.alt || g.caption || "", g.caption ? esc(g.caption) : "", false)).join("")}</div>`)}
  </div>
</section>`)}

${reviewsBlock}

${when(s.guarantee, `<section>
  <div class="f-wrap">
    <div class="f-guarantee">
      <div><p class="f-eyebrow">${esc(s.guarantee?.eyebrow || "Our promise")}</p><h2>${esc(s.guarantee?.title)}</h2><p>${esc(s.guarantee?.body)}</p></div>
      <a class="f-btn" href="${bookHref}" data-ev="book" data-label="guarantee">${esc(s.guarantee?.cta || bookLabel)}</a>
    </div>
  </div>
</section>`)}

${when(s.areas, `<section class="f-band" id="areas">
  <div class="f-wrap f-areas-grid">
    <div>
      <p class="f-eyebrow">Service area</p><h2>${esc(s.areas?.headline || "Where we work")}</h2>
      ${when(s.areas?.body, `<p class="f-muted" style="margin-top:12px">${esc(s.areas?.body)}</p>`)}
      <ul class="f-areas" aria-label="Areas we serve">${(s.areas?.cities || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>
    ${s.areas?.mapEmbed ? `<div class="f-map"><iframe src="${esc(s.areas.mapEmbed)}" title="Service area map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : when(demo, media("", "", "Real sites embed a Google map of the service area here.", demo, "f-map"))}
  </div>
</section>`)}

<section id="book">
  <div class="f-wrap f-book">
    <div>
      <p class="f-eyebrow">${esc(s.booking?.eyebrow || "Book")}</p>
      <h2 id="book-h">${esc(s.booking?.headline || "Get your price and a time")}</h2>
      <p class="f-muted" style="margin-top:12px">${esc(s.booking?.body || "")}</p>
      ${when(tel || sms, `<p class="f-alt">Rather talk? ${when(tel, `<a href="tel:${tel}" data-ev="call" data-label="book section">Call ${esc(b.phone)}</a>`)}${when(tel && sms, " or ")}${when(sms, `<a href="sms:${sms}" data-ev="text" data-label="book section">send a text</a>`)}.</p>`)}
    </div>
    ${bookWidget}
  </div>
</section>

${when(s.faq?.length, `<section class="f-band" id="faq">
  <div class="f-wrap">
    <div class="f-head"><p class="f-eyebrow">FAQ</p><h2>${esc(s.faqHeadline || "Questions, answered")}</h2></div>
    <div class="f-faq">${(s.faq || []).map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </div>
</section>`)}

<section class="f-final">
  <div class="f-wrap">
    <h2>${esc(s.final?.headline || "Ready when you are.")}</h2>
    ${when(s.final?.sub, `<p class="f-muted" style="margin-top:12px">${esc(s.final?.sub)}</p>`)}
    <div class="f-ctas">
      <a class="f-btn f-btn-primary" href="${bookHref}" data-ev="book" data-label="final">${esc(bookLabel)}</a>
      ${when(tel, `<a class="f-btn f-btn-ghost" href="tel:${tel}" data-ev="call" data-label="final">${ICON.phone}Call now</a>`)}
    </div>
  </div>
</section>
</main>

<footer class="f-footer">
  <div class="f-wrap">
    <div><b>${esc(b.name)}</b>${esc(b.footerLine || b.tagline || "")}${when(b.address?.city, `<br>${esc([b.address?.street, b.address?.city, [b.address?.region, b.address?.postal].filter(Boolean).join(" ")].filter(Boolean).join(", "))}`)}${when(b.license, `<br>${esc(b.license)}`)}</div>
    <div><b>Contact</b>${when(tel, `<a href="tel:${tel}" data-ev="call" data-label="footer">${esc(b.phone)}</a><br>`)}${when(b.email, `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br>`)}${esc(b.hoursText || "")}</div>
    <div><b>Follow</b>${(b.social || []).map(u => `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(new URL(u).hostname.replace(/^www\./, "").split(".")[0])}</a>`).join(" · ") || "&nbsp;"}<p class="credit" style="margin-top:14px">© ${new Date().getFullYear()} ${esc(b.name)}${when(s.credit !== false, ` · Site by <a href="https://groundwork-web.com/">GroundWork</a>`)}</p></div>
  </div>
</footer>

<nav class="f-sticky" aria-label="Quick actions">
  ${when(tel, `<a class="f-btn f-btn-ghost" href="tel:${tel}" data-ev="call" data-label="sticky">${ICON.phone}Call</a>`)}
  ${when(sms && !tel, `<a class="f-btn f-btn-ghost" href="sms:${sms}" data-ev="text" data-label="sticky">${ICON.text}Text</a>`)}
  <a class="f-btn f-btn-primary" href="${bookHref}" data-ev="book" data-label="sticky">${esc(bookLabel)}</a>
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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(s.seo?.canonical)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`;
}

// Plain-text summary for AI answer engines (llms.txt). Facts only, straight from site.json.
export function llms(s) {
  const b = s.business;
  const lines = [`# ${b.name}`, "", `> ${s.seo?.description || b.tagline || ""}`, ""];
  if (b.phone) lines.push(`- Phone: ${b.phone}`);
  if (b.hoursText) lines.push(`- Hours: ${b.hoursText}`);
  if (s.areas?.cities?.length) lines.push(`- Service area: ${s.areas.cities.join(", ")}`);
  if (s.packages?.length) { lines.push("", "## Prices"); s.packages.forEach(p => lines.push(`- ${p.name}: ${typeof p.price === "number" ? "$" + p.price : p.price}${p.note ? ` (${p.note})` : ""}`)); }
  if (s.services?.length) { lines.push("", "## Services"); s.services.forEach(x => lines.push(`- ${x.name}${x.from != null ? ` (from $${x.from})` : ""}: ${x.desc}`)); }
  if (s.faq?.length) { lines.push("", "## FAQ"); s.faq.forEach(f => lines.push(`- ${f.q} ${f.a}`)); }
  return lines.join("\n") + "\n";
}
