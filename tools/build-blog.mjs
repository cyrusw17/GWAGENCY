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
  "auto-detailing": { folder: "auto-detailing", sub: "detailing", trade: "Auto detailing", blog: "Car detailing website guides" },
  "exterior-cleaning": { folder: "exterior-cleaning", sub: "exterior", trade: "Pressure washing", blog: "Pressure washing website and marketing guides" },
  landscaping: { folder: "landscaping", sub: "landscaping", trade: "Lawn care", blog: "Lawn care website and marketing guides" },
  "commercial-cleaning": { folder: "commercial-cleaning", sub: "commercial", trade: "Commercial cleaning", blog: "Commercial cleaning website and contract guides" },
  "real-estate-agents": { folder: "real-estate", sub: "realestate", trade: "Real estate", blog: "Real estate agent website guides" },
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
<link rel="preload" href="/assets/fonts/oswald-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/source-sans-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/source-sans-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/ds/tokens.css?v=3.1">
<link rel="stylesheet" href="/assets/ds/base.css?v=3.1">
<link rel="stylesheet" href="/assets/ds/components.css?v=3.2">
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
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n` : ""}<style>
.post{padding:clamp(32px,6vw,72px) 0}
.post .wrap{max-width:720px}
.post h1{margin:var(--s3) 0 var(--s5)}
.post .prose h2{margin-top:var(--s6)}
.post .prose table{width:100%;border-collapse:collapse;margin:var(--s4) 0;font-size:.95rem}
.post .prose th,.post .prose td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
.post .prose blockquote{border-left:3px solid var(--line);padding-left:var(--s4);color:var(--ink-2)}
.post .prose ul.contains-task-list{list-style:none;padding-left:0}
.crumbs-b{font-size:.9rem;color:var(--ink-3)}
.crumbs-b a{color:inherit}
.guide-form{margin:var(--s6) 0;padding:var(--s5);border:1px solid var(--line);border-radius:var(--r-lg);background:var(--card)}
.guide-form label{display:block;font-weight:600;margin-top:var(--s3)}
.guide-form label span{font-weight:400;color:var(--ink-3)}
.guide-form input{width:100%;padding:12px;border:1px solid var(--line);border-radius:var(--r-sm);font:inherit;background:var(--bg);color:var(--ink)}
.guide-form input[aria-invalid=true]{border-color:var(--danger)}
.guide-form button{margin-top:var(--s4)}
.guide-consent{font-size:.88rem;color:var(--ink-3);margin-top:var(--s3)}
.post-list{list-style:none;padding:0;display:grid;gap:var(--s5)}
.post-list a{font-weight:600;font-size:1.15rem}
.post-list p{color:var(--ink-2);margin-top:var(--s2)}
.post-date{color:var(--ink-3);font-size:.92rem;margin:calc(-1 * var(--s3)) 0 var(--s5)}
.more-guides{margin-top:var(--s7);padding-top:var(--s5);border-top:1px solid var(--line)}
.more-guides ul{padding-left:1.2em}
.more-guides li{margin-top:var(--s2)}
@media print{.site-header,.site-footer,.no-print{display:none}}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
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
    const more = posts.filter((p) => p !== d).map((p) => `      <li><a href="/${n.folder}/blog/${p.slug}/">${esc(p.fm.h1 || p.fm.title)}</a></li>`).join("\n");
    const body = `    <h1>${esc(title)}</h1>\n    <p class="post-date">Updated <time datetime="${UPDATED}">${UPDATED_TEXT}</time></p>\n    <div class="prose">\n${fixLinks(marked.parse(md), n)}\n    </div>
    <nav class="more-guides no-print" aria-labelledby="more-h">\n      <h2 id="more-h">More ${esc(n.trade.toLowerCase())} guides</h2>\n      <ul>\n${more}\n      </ul>\n    </nav>`;
    const schema = { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", headline: title, description: d.fm.meta_description, mainEntityOfPage: url,
        author: { "@id": `${MAIN}/#business` }, publisher: { "@id": `${MAIN}/#business` },
        about: n.trade + " websites", inLanguage: "en-US", datePublished: UPDATED, dateModified: UPDATED,
        image: { "@type": "ImageObject", url: `${MAIN}/assets/og.png`, width: 1200, height: 630 } },
      { "@type": "Organization", "@id": `${MAIN}/#business`, name: "GroundWork-Web", url: `${MAIN}/`,
        logo: { "@type": "ImageObject", url: `${MAIN}/assets/icon.svg` } },
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

  const list = posts.map((d) => `      <li><a href="/${n.folder}/blog/${d.slug}/">${esc(d.fm.h1 || d.fm.title)}</a><p>${esc(d.fm.meta_description)}</p></li>`).join("\n");
  const ibody = `    <h1>${esc(n.blog)}</h1>
    <p class="lede">Plain, practical guides for ${esc(n.trade.toLowerCase())} owners on what a website needs to bring in work. Each one is useful whether or not you ever hire us.</p>
    <ul class="post-list">\n${list}\n    </ul>
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
