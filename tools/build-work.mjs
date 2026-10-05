// Turns the demos into the /work/ portfolio for the cPanel build (called by build-cpanel.mjs).
// GitHub Pages is untouched: its copies stay noindex at /site/demos/.
//   site/demos/<x>/ moves to site/work/<x>/ and every link to /demos/ points at /work/.
//   Graded demos (a hub/data.json slot or "more" entry with grade "A+") get a self canonical and
//   are listed on /work/. Every demo page is noindex, follow and stays out of the sitemap, so a
//   fictional business never shows up in a real town's search; /work/ itself stays indexed.
//   Business schema (LocalBusiness types, address, hours, reviews, FAQ) is replaced by one
//   CreativeWork page with a BreadcrumbList, made by GroundWork.
//   Every demo's notice bar says "Sample design for a fictional business", and each listed demo
//   ends with a short case study that links its trade's selling subdomain.
//   site/work/index.html lists the graded demos by trade.
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const BANNER = "Sample design for a fictional business";

export function buildWork({ root, site, MAIN, walk }) {
  const from = join(site, "demos");
  const to = join(site, "work");
  if (!existsSync(from)) return { indexed: [] };
  const oldIndex = readFileSync(join(from, "index.html"), "utf8");
  rmSync(join(from, "index.html"));
  renameSync(from, to);

  // Demos listed on the hub, keyed by folder name.
  const data = JSON.parse(readFileSync(join(root, "hub", "data.json"), "utf8"));
  const listed = new Map();
  for (const n of data.niches) {
    const trade = { name: n.name, sell: `${MAIN}/${n.page}` };
    for (const s of n.slots) if (s.slug) listed.set(s.slug, { trade, business: s.business, town: s.town, concept: s.concept, graded: s.grade === "A+" });
    for (const m of n.more || []) {
      const slug = m.href.replace(/\/$/, "").split("/").pop();
      const [, style, town] = /^(.+?),\s*(.+)$/.exec(m.label) || [, m.label, ""];
      listed.set(slug, { trade, town, concept: m.concept || `${/^[aeiou]/i.test(style) ? "an" : "a"} ${style.toLowerCase()} design`, graded: m.grade === "A+" });
    }
  }

  const indexed = [];
  for (const slug of readdirSync(to)) {
    const file = join(to, slug, "index.html");
    if (!existsSync(file)) continue;
    const d = listed.get(slug);
    const url = `${MAIN}/work/${slug}/`;
    let html = readFileSync(file, "utf8");
    const title = unesc((/<title>([^<]*)<\/title>/.exec(html) || [, slug])[1]);
    const business = d?.business || title.split(/\s+[|·]\s+/)[0];
    const index = !!d?.graded;
    if (index) indexed.push({ slug, url, business, ...d });

    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "");
    html = html.replace(/<link rel="canonical"[^>]*>\s*/g, "").replace(/<meta property="og:url"[^>]*>\s*/g, "");
    html = html.replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="noindex, follow">`);
    if (!/<meta name="robots"/.test(html)) html = html.replace("</title>", `</title>\n<meta name="robots" content="noindex, follow">`);
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": ["WebPage", "CreativeWork"], "@id": url, url, name: `${business}: ${BANNER.toLowerCase()}`,
          description: d ? `A sample ${d.trade.name.toLowerCase()} website by GroundWork-Web for a made-up business.` : "A sample website by GroundWork-Web for a made-up business.",
          genre: "Website design sample", isFamilyFriendly: true,
          creator: { "@type": "Organization", name: "GroundWork-Web", url: `${MAIN}/` },
          isPartOf: { "@type": "CollectionPage", "@id": `${MAIN}/work/`, name: "GroundWork-Web sample designs" } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${MAIN}/` },
          { "@type": "ListItem", position: 2, name: "Work", item: `${MAIN}/work/` },
          { "@type": "ListItem", position: 3, name: business, item: url } ] },
      ],
    };
    const head = `${index ? `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">\n` : ""}<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>\n</head>`;
    html = html.replace("</head>", head);

    if (html.includes("<b>GroundWork demo</b>")) html = html.replace("<b>GroundWork demo</b>", `<b>${BANNER}</b>`);
    else html = html.replace(/(<body[^>]*>\s*(?:<a class="skip"[^>]*>[^<]*<\/a>\s*)?)/, `$1<div role="note" style="background:#1c1917;color:#fafaf9;font:600 14px/1.4 system-ui,sans-serif;padding:8px 16px;text-align:center">${BANNER}. Names, reviews, prices and photos are samples.</div>\n`);

    html = html.replace("</body>", `${caseStudy(d, business, MAIN)}\n</body>`);
    writeFileSync(file, html);
  }

  writeFileSync(join(to, "index.html"), workIndex(oldIndex, indexed, data, MAIN));

  // Old addresses: links and the sitemap move to /work/; .htaccess 301s the rest
  // (build-cpanel.mjs). site/demos/ keeps only a redirect, so the deploy clears the old folder.
  for (const file of walk(site, ".html")) {
    const html = readFileSync(file, "utf8");
    const next = html.replaceAll(`${MAIN}/demos/`, `${MAIN}/work/`).replace(/((?:href|src|action)="|["'])\/demos\//g, "$1/work/");
    if (next !== html) writeFileSync(file, next);
  }
  mkdirSync(from);
  writeFileSync(join(from, ".htaccess"), "RedirectMatch 301 ^/demos/(.*)$ /work/$1\n");

  const sitemap = join(site, "sitemap.xml");
  writeFileSync(sitemap, readFileSync(sitemap, "utf8").replaceAll(`${MAIN}/demos/`, `${MAIN}/work/`));
  return { indexed };
}

const CASE_CSS = `.gw-case{background:#f5f5f4;color:#1c1917;border-top:1px solid #d6d3d1;padding:40px 16px;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
.gw-case>div{max-width:680px;margin:0 auto}
.gw-case h2{font:700 1.375rem/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0 0 12px;color:#1c1917}
.gw-case p{margin:0 0 12px}
.gw-case nav{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:16px}
.gw-case a{color:#1c1917;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.gw-case a:focus-visible{outline:2px solid #1c1917;outline-offset:3px}`;

function caseStudy(d, business, MAIN) {
  const trade = d?.trade;
  const what = d ? `<p>The business on this page, ${esc(business)}${d.town ? ` in ${esc(d.town)}` : ""}, is made up. GroundWork-Web designed this site to show what a website for ${esc(trade.name.toLowerCase())} can do. ${esc(d.concept.charAt(0).toUpperCase() + d.concept.slice(1).replace(/\.$/, ""))}.</p>` : "";
  return `<aside class="gw-case" aria-label="About this sample design"><style>${CASE_CSS}</style><div>
<h2>About this sample design</h2>
${what}<p>Nothing here is a real company. The names, reviews, prices, listings and photos are samples. A real build uses the owner's own name, photos, prices and service area, and the owner approves the preview before paying for the build.</p>
<nav aria-label="More from GroundWork-Web">${trade ? `<a href="${trade.sell}">Websites for ${esc(trade.name.toLowerCase())}</a>` : ""}<a href="${MAIN}/work/">All sample designs</a></nav>
</div></aside>`;
}

function workIndex(shell, indexed, data, MAIN) {
  const groups = data.niches.map((n) => ({ n, items: indexed.filter((w) => w.trade.name === n.name) })).filter((g) => g.items.length);
  const main = `<main id="main">
<section class="page-hero">
  <div class="wrap">
    <ol class="crumbs" aria-label="Breadcrumb"><li><a href="/">Home</a></li><li aria-hidden="true">/</li><li aria-current="page">Work</li></ol>
    <span class="eyebrow">Sample designs for fictional businesses</span>
    <h1>Website designs for local trades.</h1>
    <p class="lead">Each one is a working site for a made-up business, built the way we'd build yours. Open any of them, then see what we build for your trade.</p>
  </div>
</section>
${groups.map(({ n, items }) => `
<section class="tight-top" aria-labelledby="work-${n.id}">
  <div class="wrap">
    <div class="sec-head"><h2 id="work-${n.id}">${esc(n.name)}</h2><p class="lead"><a class="link" href="${items[0].trade.sell}">How we build websites for ${esc(n.name.toLowerCase())}</a></p></div>
    <div class="card-grid">${items.map((w) => `
      <div class="card"><h3><a class="link" href="/work/${w.slug}/">${esc(w.business)}</a></h3><p>${w.town ? `${esc(w.town)}. ` : ""}${esc(w.concept.charAt(0).toUpperCase() + w.concept.slice(1).replace(/\.$/, ""))}.</p></div>`).join("")}
    </div>
  </div>
</section>`).join("")}
</main>`;
  const desc = "Sample website designs by GroundWork-Web for made-up local businesses: auto detailers, exterior cleaners, lawn care, commercial cleaners and real estate agents.";
  // Preload the body font too, so the swap doesn't shift the trade sections (CLS).
  const fonts = ["hanken-grotesk-latin-400-normal", "hanken-grotesk-latin-600-normal"].map((f) => `<link rel="preload" href="/assets/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join("\n");
  return shell
    .replace(/(<link rel="preload" href="\/assets\/fonts\/bricolage-grotesque-latin-800-normal\.woff2"[^>]*>)/, `$1\n${fonts}`)
    .replace(/<main id="main">[\s\S]*<\/main>/, main)
    .replace(/<title>[^<]*<\/title>/, "<title>Website Design Samples for Local Trades | GroundWork-Web</title>")
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, `$1${desc}"`)
    .replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*"/g, "$1Website Design Samples for Local Trades\"")
    .replace(/<meta name="robots"[^>]*>/, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "")
    .replaceAll(`${MAIN}/demos/`, `${MAIN}/work/`);
}
