#!/usr/bin/env node
// Build the niche blogs from content/blog/<niche>/*.md into public/<selling page>/blog/.
//   npm i --no-save marked@12 && node tools/build-blog.mjs
// Posts (front matter has url:) become /<folder>/blog/<slug>/ with Article + BreadcrumbList schema.
// Downloads (checklists, the capability template) become noindex printable pages next to them,
// opened by the checklist form (assets/js/guide.js) after the reader leaves an email.
// Links are written for groundwork-web.com paths; tools/build-cpanel.mjs moves them to the subdomains.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAIN = "https://groundwork-web.com";
const NICHES = {
  // blog: the blog index title and H1, picked from the search terms in seo-terms (tools/seo-terms.mjs).
  "auto-detailing": { folder: "auto-detailing", sub: "detailing", trade: "Auto detailing", reader: "auto detailers", blog: "Car detailing website guides" },
  "exterior-cleaning": { folder: "exterior-cleaning", sub: "exterior", trade: "Pressure washing", reader: "pressure washing owners", blog: "Pressure washing website and marketing guides" },
  landscaping: { folder: "landscaping", sub: "landscaping", trade: "Lawn care", reader: "lawn care owners", blog: "Lawn care website and marketing guides" },
  "commercial-cleaning": { folder: "commercial-cleaning", sub: "commercial", trade: "Commercial cleaning", reader: "commercial cleaning owners", blog: "Commercial cleaning website and contract guides" },
  "real-estate-agents": { folder: "real-estate", sub: "realestate", trade: "Real estate", reader: "real estate agents", blog: "Real estate agent website guides" },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function read(file) {
  const src = readFileSync(file, "utf8");
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  // Front matter is flat "key: value" lines; values are kept as text (some contain colons and parentheses).
  const fm = Object.fromEntries(m[1].split("\n").map((l) => l.match(/^([a-z_]+):\s*(.*)$/)).filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^"(.*)"$/, "$1")]));
  let body = m[2].replace(/\n---\nWriter checks[\s\S]*$/, "\n");
  return { fm, body, slug: fm.slug || basename(file, ".md") };
}

// Every link the posts use, rewritten to a groundwork-web.com path.
function fixLinks(html, n) {
  for (const k of Object.values(NICHES)) html = html.replaceAll(`https://${k.sub}.groundwork-web.com/`, `/${k.folder}/`);
  html = html.replace(/href="\/blog\//g, `href="/${n.folder}/blog/`);
  html = html.replace(/href="(?:https:\/\/groundwork-web\.com)?\/work\/([a-z0-9-]+)\/"/g, (m, d) =>
    existsSync(join(root, "public", "work", d)) ? `href="/work/${d}/"` : `href="/demos/${d}/"`);
  // Task-list checkboxes get the item's own text as their accessible name.
  html = html.replace(/<li><input ([^>]*type="checkbox"[^>]*)>\s*([^<\n]*)/g, (m, attrs, text) =>
    `<li><input ${attrs} aria-label="${text.trim().replace(/"/g, "&quot;")}"> ${text}`);
  return html.replaceAll(`href="${MAIN}/`, 'href="/');
}


// Visuals drawn in code. In a post: ":::visual <kind>" on its own line, a JSON object, then ":::".
// Text fields take inline markdown. Every visual is a <figure> with a caption; none uses an image file.
const il = (s) => marked.parseInline(String(s ?? ""));
const cap = (v) => (v.caption ? `<figcaption>${il(v.caption)}</figcaption>` : "");
const ttl = (v) => (v.title ? `<p class="bv-title">${il(v.title)}</p>` : "");
let checkCount = 0;
const VISUALS = {
  phone: (v) => {
    let pin = 0;
    const rows = v.rows.map((r) => {
      const p = r.pin ? `<span class="bv-pin" aria-hidden="true">${r.pin === true ? ++pin : esc(r.pin)}</span>` : "";
      if (r.k === "bar") return `<div class="bv-row k-bar"><span>${esc(r.text)}</span><span>${esc(r.right || "")}</span>${p}</div>`;
      if (r.k === "price") return `<div class="bv-row k-price"><span>${il(r.text)}</span><span>${il(r.right || "")}</span>${p}</div>`;
      if (r.k === "sticky") return `<div class="bv-row k-sticky"><span>${esc(r.text)}</span><span>${esc(r.right)}</span>${p}</div>`;
      return `<div class="bv-row k-${r.k}">${il(r.text)}${p}</div>`;
    }).join("");
    let k = 0;
    const legend = v.notes.map((n) => `<li><span class="bv-n" aria-hidden="true">${esc(n.pin ?? ++k)}</span><span>${il(n.text ?? n)}</span></li>`).join("");
    return `<figure class="bv">${ttl(v)}<div class="bv-phone-wrap"><div class="bv-phone" role="img" aria-label="${esc(v.alt)}">${rows}</div><ol class="bv-legend">${legend}</ol></div>${cap(v)}</figure>`;
  },
  steps: (v) => `<figure class="bv">${ttl(v)}<ol class="bv-steps">${v.items.map((i) =>
    `<li><b>${il(i.h)}</b>${i.p ? `<span>${il(i.p)}</span>` : ""}${i.tag ? `<em>${esc(i.tag)}</em>` : ""}</li>`).join("")}</ol>${cap(v)}</figure>`,
  compare: (v) => `<figure class="bv">${ttl(v)}<div class="bv-cmp${v.cards.length === 3 ? " is-three" : ""}">${v.cards.map((c) =>
    `<div class="bv-card is-${c.kind || "after"}"><span class="bv-lab">${esc(c.label)}</span>${
      c.list ? `<ul>${c.list.map((l) => `<li>${il(l)}</li>`).join("")}</ul>` : [].concat(c.text).map((t) => `<p>${il(t)}</p>`).join("")
    }${c.why ? `<p class="bv-why">${il(c.why)}</p>` : ""}</div>`).join("")}</div>${cap(v)}</figure>`,
  bars: (v) => {
    const max = v.max || Math.max(...v.items.map((i) => i.value));
    return `<figure class="bv">${ttl(v)}<div class="bv-bars">${v.items.map((i) =>
      `<div class="bv-bar${i.tone ? ` is-${i.tone}` : ""}"><div class="bv-bar-top"><b>${il(i.label)}</b><span>${esc(i.show ?? i.value)}</span></div><div class="bv-track"><div class="bv-fill" style="width:${Math.max(2, Math.round((i.value / max) * 100))}%"></div></div>${i.note ? `<small>${il(i.note)}</small>` : ""}</div>`).join("")}</div>${cap(v)}</figure>`;
  },
  checker: (v) => {
    const id = `chk${++checkCount}`;
    const bands = JSON.stringify([...v.bands].sort((a, b) => b.min - a.min));
    return `<figure class="bv"><div class="bv-check" data-bands="${esc(bands)}"><div class="bv-check-head"><b>${il(v.title)}</b>${v.sub ? `<span>${il(v.sub)}</span>` : ""}</div><ol>${v.items.map((q, i) =>
      `<li><label for="${id}-${i}"><input type="checkbox" id="${id}-${i}"><span>${il(q)}</span></label></li>`).join("")}</ol><div class="bv-check-out" aria-live="polite"><p class="bv-score"><b>0</b> <small>of ${v.items.length} ticked</small></p><div class="bv-meter"><i></i></div><p class="bv-verdict"></p></div></div>${cap(v)}</figure>`;
  },
  form: (v) => `<figure class="bv">${ttl(v)}<div class="bv-form">${v.fields.map((f) =>
    `<div class="bv-f is-${f.state || "keep"}"><b>${il(f.label)}</b><em>${esc({ keep: "keep", cut: "cut", opt: "optional" }[f.state || "keep"])}</em>${f.why ? `<small>${il(f.why)}</small>` : ""}</div>`).join("")}${v.button ? `<div class="bv-form-btn" aria-hidden="true">${esc(v.button)}</div>` : ""}</div>${cap(v)}</figure>`,
  calendar: (v) => `<figure class="bv">${ttl(v)}<div class="bv-cal">${v.rows.map((r) =>
    `<div class="bv-cal-row${r.hi ? " is-hi" : ""}"><span class="bv-cal-m">${esc(r.m)}</span><div><b>${il(r.h)}</b>${r.p ? `<span>${il(r.p)}</span>` : ""}${r.chip ? `<span class="bv-chip">${esc(r.chip)}</span>` : ""}</div></div>`).join("")}</div>${cap(v)}</figure>`,
  price: (v) => `<figure class="bv"><div class="bv-price">${v.stamp ? `<span class="bv-stamp">${esc(v.stamp)}</span>` : ""}<table><thead><tr>${v.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${v.rows.map((r) =>
    `<tr>${r.map((c, i) => (i ? `<td>${il(c)}</td>` : `<td>${il(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table>${v.note ? `<p class="bv-price-note">${il(v.note)}</p>` : ""}</div>${cap(v)}</figure>`,
  texts: (v) => `<figure class="bv"><div class="bv-sms">${v.who ? `<p class="bv-sms-who">${esc(v.who)}</p>` : ""}${v.msgs.map((m) =>
    m.t ? `<p class="bv-msg-t">${esc(m.t)}</p>` : `<p class="bv-msg is-${m.from}">${il(m.text)}</p>`).join("")}</div>${cap(v)}</figure>`,
  pull: (v) => `<p class="bv-pull">${il(v.text)}</p>`,
};
function visuals(md, file) {
  return md.replace(/^:::visual ([a-z]+)\n([\s\S]*?)\n:::$/gm, (m, kind, json) => {
    if (!VISUALS[kind]) throw new Error(`${file}: unknown visual "${kind}"`);
    let v;
    try { v = JSON.parse(json); } catch (e) { throw new Error(`${file}: bad JSON in ${kind} visual: ${e.message}`); }
    return "\n" + VISUALS[kind](v) + "\n";
  });
}

// Headings get ids so the "In this guide" list can link to them.
const slugify = (t) => t.replace(/<[^>]+>/g, "").toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
function anchor(html) {
  const toc = [], seen = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
    let id = slugify(inner) || "section";
    while (seen.has(id)) id += "-2";
    seen.add(id);
    if (lvl === "2") toc.push([id, inner.replace(/<[^>]+>/g, "")]);
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html, toc };
}
const readMins = (md) => Math.max(2, Math.round(md.replace(/<[^>]+>|:::visual[\s\S]*?:::/g, " ").split(/\s+/).filter(Boolean).length / 230));
const kicker = (n, mins) => `<p class="art-kicker"><b>${esc(n.trade)}</b><span>${mins} min read</span></p>`;

let formCount = 0;
function captureForm(block, guide, download, n) {
  const lines = block.split("\n").map((l) => l.replace(/^>\s?/, "")).filter((l) => l.trim());
  const placeholder = lines.find((l) => l.startsWith("[Email]"));
  const button = placeholder ? (placeholder.match(/\*\*(.+?)\*\*/)?.[1] || "Send me the checklist")
    : (lines.find((l) => l.startsWith("Button:")) || "Button: Send me the checklist").slice(7).trim();
  const consent = lines.find((l) => l.startsWith("The checklist opens right here")) ||
    `The checklist opens right here. We'll also send a few short tips for ${n.trade.toLowerCase()} owners. Unsubscribe anytime. [Privacy](${MAIN}/privacy/)`;
  const pitch = lines.filter((l) => !/^(Fields|Button):/.test(l) && l !== consent && l !== placeholder).join(" ");
  const id = `g${++formCount}`;
  return `<form class="guide-form" data-guide="${guide}" novalidate aria-labelledby="${id}-h">
  <p id="${id}-h" class="guide-pitch">${marked.parseInline(pitch)}</p>
  <div data-guide-fields>
    <label for="${id}-email">Email</label>
    <input id="${id}-email" name="email" type="email" autocomplete="email" required>
    <label for="${id}-shop">Business name</label>
    <input id="${id}-shop" name="shop" autocomplete="organization" required>
    <label for="${id}-site">Website <span>(optional)</span></label>
    <input id="${id}-site" name="links" type="url" inputmode="url" autocomplete="url" placeholder="yourbusiness.com">
    <div hidden aria-hidden="true"><input name="company_url" tabindex="-1" autocomplete="off"></div>
    <button class="btn btn-buy" type="submit">${esc(button)}</button>
    <p class="guide-consent">${marked.parseInline(consent)}</p>
  </div>
  <div data-guide-download hidden>
    <p>Here it is. We'll email you a copy within a day.</p>
    <a class="btn" href="/${n.folder}/blog/${download}/">Open the checklist</a>
  </div>
  <p data-guide-status role="status" aria-live="polite"></p>
</form>`;
}

function page({ n, title, desc, canonical, body, schema, noindex, crumbs }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title.length > 43 ? title : `${title} | GroundWork-Web`)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta name="color-scheme" content="light dark">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/ds/tokens.css?v=4">
<link rel="stylesheet" href="/assets/ds/base.css?v=4">
<link rel="stylesheet" href="/assets/ds/components.css?v=4">
<link rel="stylesheet" href="/assets/ds/blog.css?v=1">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="GroundWork-Web">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${MAIN}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n` : ""}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="art-progress" aria-hidden="true"></div>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" translate="no"><span class="dot" aria-hidden="true"></span>GroundWork-Web</a>
    <nav class="links" id="primary-nav" aria-label="Primary">
      <a href="/${n.folder}/">${esc(n.trade)} websites</a>
      <a href="/${n.folder}/blog/">Blog</a>
    </nav>
    <div class="header-end">
      <a class="btn btn-buy btn-sm" href="/${n.folder}/">See the offer</a>
    </div>
  </div>
</header>
<main id="main" class="post">
  <div class="wrap">
    <p class="crumbs-b no-print">${crumbs.map(([t, u]) => (u ? `<a href="${u}">${esc(t)}</a>` : esc(t))).join(" / ")}</p>
${body}
  </div>
</main>
<footer class="site-footer">
  <div class="wrap">
    <div><div class="logo" translate="no"><span class="dot" aria-hidden="true"></span>GroundWork-Web</div>
    <p>Websites for local service businesses, built and looked after from Deer Park, Texas.</p></div>
    <nav class="footer-nav" aria-label="Footer"><a href="/">GroundWork-Web</a><a href="/${n.folder}/">${esc(n.trade)} websites</a><a href="/${n.folder}/blog/">Blog</a><a href="/privacy/">Privacy</a></nav>
  </div>
</footer>
<script src="/assets/js/config.js?v=3.1"></script>
<script src="/assets/js/guide.js" defer></script>
<script src="/assets/js/blog.js?v=1" defer></script>
<script src="/assets/js/analytics.js?v=3.1" defer></script>
</body>
</html>
`;
}

const UPDATED = "2026-10-05", UPDATED_TEXT = "October 5, 2026";
const sitemapUrls = [];
for (const [key, n] of Object.entries(NICHES)) {
  const dir = join(root, "content", "blog", key);
  if (!existsSync(dir)) continue;
  const out = join(root, "public", n.folder, "blog");
  rmSync(out, { recursive: true, force: true });
  const docs = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => read(join(dir, f)));
  const posts = docs.filter((d) => d.fm.url);
  const downloads = docs.filter((d) => !d.fm.url);
  const blogUrl = `${MAIN}/${n.folder}/blog/`;
  const defaultDl = (downloads.find((d) => d.slug.startsWith("checklist-")) || downloads[0]).slug;
  const guideFor = (comment, fm) => {
    const g = comment.match(/data-guide="([a-z0-9-]+)"/)?.[1] || `${n.folder}-checklist`;
    const dl = /capability-statement/.test(g) ? "capability-statement-template" : /bid-ready/.test(g) ? "checklist-bid-ready-website" : defaultDl;
    return [g, dl];
  };

  for (const d of posts) {
    formCount = 0;
    let lastGuide = null;
    const md = d.body.replace(/^# .*\n/m, "").replace(/<!--\s*email-capture([\s\S]*?)-->\s*\n((?:>.*\n?)+)/g, (m, comment, block) => {
      let gd = guideFor(comment, d.fm);
      if (/Same (fields|offer)|as #1|as above/.test(comment) && !/data-guide=/.test(comment) && lastGuide) gd = lastGuide;
      lastGuide = gd;
      return "\n" + captureForm(block, gd[0], gd[1], n) + "\n";
    }).replace(/<!--[\s\S]*?-->\n?/g, "");
    const url = `${blogUrl}${d.slug}/`;
    const title = d.fm.h1 || d.fm.title;
    const mins = readMins(md);
    const { html, toc } = anchor(fixLinks(marked.parse(visuals(md, d.slug)), n));
    const takeaways = (d.fm.takeaways || "").split(" | ").filter(Boolean);
    const more = posts.filter((p) => p !== d).map((p) => `      <li><a href="/${n.folder}/blog/${p.slug}/">${esc(p.fm.h1 || p.fm.title)}<span>${readMins(p.body)} min read</span></a></li>`).join("\n");
    const body = `    <header class="art-head">
      ${kicker(n, mins)}
      <h1>${esc(title)}</h1>
      <p class="art-dek">${esc(d.fm.dek || d.fm.meta_description)}</p>
      <p class="art-meta">By the GroundWork-Web team, who build websites for ${esc(n.reader)}. Updated <time datetime="${UPDATED}">${UPDATED_TEXT}</time>.</p>
    </header>
${takeaways.length ? `    <aside class="art-take" aria-labelledby="take-h"><h2 id="take-h">The short version</h2><ol>${takeaways.map((t) => `<li>${il(t)}</li>`).join("")}</ol></aside>\n` : ""}${toc.length >= 4 ? `    <details class="art-toc no-print"><summary>In this guide (${toc.length} parts)</summary><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join("")}</ol></details>\n` : ""}    <div class="prose">\n${html}\n    </div>
    <nav class="more-guides no-print" aria-labelledby="more-h">\n      <h2 id="more-h">More ${esc(n.trade.toLowerCase())} guides</h2>\n      <ul>\n${more}\n      </ul>\n    </nav>`;
    const schema = { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: title, description: d.fm.meta_description, mainEntityOfPage: url,
        author: { "@id": `${MAIN}/#business` }, publisher: { "@id": `${MAIN}/#business` },
        about: n.trade + " websites", articleSection: n.trade, inLanguage: "en-US", timeRequired: `PT${mins}M`,
        wordCount: md.replace(/<[^>]+>|:::visual[\s\S]*?:::/g, " ").split(/\s+/).filter(Boolean).length, datePublished: UPDATED, dateModified: UPDATED,
        image: { "@type": "ImageObject", url: `${MAIN}/assets/og.png`, width: 1200, height: 630 } },
      { "@type": "Organization", "@id": `${MAIN}/#business`, name: "GroundWork-Web", url: `${MAIN}/`,
        logo: { "@type": "ImageObject", url: `${MAIN}/assets/logo.png`, width: 512, height: 512 } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: `${n.trade} websites`, item: `${MAIN}/${n.folder}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: blogUrl },
        { "@type": "ListItem", position: 3, name: title, item: url }] }] };
    mkdirSync(join(out, d.slug), { recursive: true });
    writeFileSync(join(out, d.slug, "index.html"), page({ n, title: d.fm.title, desc: d.fm.meta_description, canonical: url, body, schema,
      crumbs: [[`${n.trade} websites`, `/${n.folder}/`], ["Blog", `/${n.folder}/blog/`], [title]] }));
    sitemapUrls.push(url);
  }

  for (const d of downloads) {
    const md = d.body.replace(/<!--[\s\S]*?-->\n?/g, "");
    const body = `    <div class="prose">\n${fixLinks(marked.parse(md), n)}\n    </div>\n    <p class="no-print"><button class="btn" type="button" onclick="print()">Print or save as PDF</button></p>`;
    mkdirSync(join(out, d.slug), { recursive: true });
    const dlUrl = `${blogUrl}${d.slug}/`;
    const dlSchema = { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: d.fm.title, description: d.fm.meta_description || d.fm.title, mainEntityOfPage: dlUrl,
        author: { "@id": `${MAIN}/#business` }, publisher: { "@id": `${MAIN}/#business` }, inLanguage: "en-US",
        datePublished: UPDATED, dateModified: UPDATED, image: { "@type": "ImageObject", url: `${MAIN}/assets/og.png`, width: 1200, height: 630 } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: `${n.trade} websites`, item: `${MAIN}/${n.folder}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: blogUrl },
        { "@type": "ListItem", position: 3, name: d.fm.title, item: dlUrl }] }] };
    writeFileSync(join(out, d.slug, "index.html"), page({ n, title: d.fm.title, desc: d.fm.meta_description || d.fm.title, canonical: dlUrl, body, noindex: true, schema: dlSchema,
      crumbs: [[`${n.trade} websites`, `/${n.folder}/`], ["Blog", `/${n.folder}/blog/`], [d.fm.title]] }));
  }

  const list = posts.map((d) => `      <li class="post-card"><a href="/${n.folder}/blog/${d.slug}/">${kicker(n, readMins(d.body))}<h2>${esc(d.fm.h1 || d.fm.title)}</h2><p>${esc(d.fm.dek || d.fm.meta_description)}</p><span class="pc-more">Read the guide</span></a></li>`).join("\n");
  const ibody = `    <header class="blog-head">
      <h1>${esc(n.blog)}</h1>
      <p class="art-dek">Plain, practical guides for ${esc(n.reader)} on what a website needs to bring in work. Each one is useful whether or not you ever hire us.</p>
    </header>
    <ul class="post-cards">\n${list}\n    </ul>
    <p><a class="btn btn-buy" href="/${n.folder}/">See what we build for ${esc(n.trade.toLowerCase())}</a></p>`;
  writeFileSync(join(out, "index.html"), page({ n, title: n.blog[0].toUpperCase() + n.blog.slice(1), desc: `Free guides for ${n.trade.toLowerCase()} owners: what a website needs, how to show prices, and how to get more work from it, whether or not you hire us.`,
    canonical: blogUrl, body: ibody, crumbs: [[`${n.trade} websites`, `/${n.folder}/`], ["Blog"]],
    schema: { "@context": "https://schema.org", "@type": "Blog", name: n.blog, url: blogUrl, inLanguage: "en-US",
      publisher: { "@type": "Organization", "@id": `${MAIN}/#business`, name: "GroundWork-Web", url: `${MAIN}/` },
      blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.fm.h1 || p.fm.title, url: `${blogUrl}${p.slug}/` })) } }));
  sitemapUrls.push(blogUrl);
}

// Sitemap: replace the blog block between markers.
const smPath = join(root, "public", "sitemap.xml");
let sm = readFileSync(smPath, "utf8").replace(/\s*<!-- blog -->[\s\S]*<!-- \/blog -->/, "");
const block = `\n  <!-- blog -->\n${sitemapUrls.map((u) => `  <url><loc>${u}</loc><lastmod>2026-10-05</lastmod></url>`).join("\n")}\n  <!-- /blog -->`;
sm = sm.replace("</urlset>", `${block}\n</urlset>`);
writeFileSync(smPath, sm);
console.log(`blog: ${sitemapUrls.length} pages in the sitemap`);
