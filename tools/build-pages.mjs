#!/usr/bin/env node
// Build the browsable GitHub Pages copy: the status page plus every page of groundwork-web.com
// (public/) and every demo, with a directory of links on the status page.
//   node tools/build-pages.mjs [--base /GWAGENCY]   writes _site/
// public/ uses root links ("/pricing/"); on a project Pages site everything lives under /<repo>/,
// so those links are rewritten to /<repo>/site/... . PHP, .htaccess, robots and sitemap are left out.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseFlag = process.argv.indexOf("--base");
const base = (baseFlag >= 0 ? process.argv[baseFlag + 1] : "/GWAGENCY").replace(/\/$/, "");
const out = join(root, "_site");
const prefix = `${base}/site/`;

execFileSync(process.execPath, [join(root, "tools", "build-hub.mjs")], { cwd: root, stdio: "inherit" });

const SKIP = new Set(["api", ".htaccess", "robots.txt", "sitemap.xml"]);
const TEXT = new Set([".html", ".css", ".js", ".xml", ".webmanifest", ".json", ".svg"]);
const rewrite = s => s
  .replace(/((?:href|src|action|poster|content)=["'])\/(?!\/)/g, `$1${prefix}`)
  .replace(/(url\(\s*["']?)\/(?!\/)/g, `$1${prefix}`)
  .replace(/(srcset=["'][^"']*)/g, m => m.replace(/(^|,\s*|=["'])\/(?!\/)/g, `$1${prefix}`));

// This copy must never compete with groundwork-web.com in search: noindex every page and point
// its canonical at the live URL (pages that already name one keep theirs).
// A thin bar at the top of every page in this copy, so a visitor can always get back to the hub.
const bar = `<nav aria-label="Preview copy" style="all:initial;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;padding:4px 16px;background:#141412;color:#F6F3EC;font:600 14px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;position:relative;z-index:2147483647"><a href="${base}/" style="font:600 13px/1.4 system-ui,sans-serif;text-decoration:underline;color:#F0B53A;padding:6px 0">&larr; All pages</a><a href="${base}/#demos" style="font:600 13px/1.4 system-ui,sans-serif;text-decoration:underline;color:#F6F3EC;padding:6px 0">Demos</a><a href="${base}/#selling" style="font:600 13px/1.4 system-ui,sans-serif;text-decoration:underline;color:#F6F3EC;padding:6px 0">Sales pages</a><a href="${prefix}" style="font:600 13px/1.4 system-ui,sans-serif;text-decoration:underline;color:#F6F3EC;padding:6px 0">Agency site</a></nav>`;
// Keep each page's skip link as the first tab stop: put the bar after it when the body opens with one.
const withBar = html => html.replace(/<body([^>]*)>(\s*<a\b[^>]*href=["']#[^"']*["'][^>]*>[\s\S]*?<\/a>)?/i, (m, attrs, skip = "") => `<body${attrs}>${skip}${bar}`);
const seo = (html, rel) => {
  const live = "https://groundwork-web.com/" + rel.replace(/(^|\/)index\.html$/, "$1");
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, "");
  const tags = '<meta name="robots" content="noindex, nofollow">' + (/rel=["']canonical["']/i.test(html) ? "" : `<link rel="canonical" href="${live}">`);
  return withBar(html.replace(/<head([^>]*)>/i, `<head$1>${tags}`));
};
const pages = [];
function copy(src, dst) {
  for (const name of readdirSync(src)) {
    if (SKIP.has(name) && src === join(root, "public")) continue;
    if (name.endsWith(".php") || name === ".DS_Store") continue;
    const from = join(src, name), to = join(dst, name);
    if (statSync(from).isDirectory()) { mkdirSync(to, { recursive: true }); copy(from, to); continue; }
    if (TEXT.has(extname(name))) {
      const text = readFileSync(from, "utf8");
      writeFileSync(to, name.endsWith(".html") ? seo(rewrite(text), relative(join(root, "public"), from)) : rewrite(text));
      if (name === "index.html") pages.push({ path: relative(join(root, "public"), src), title: (text.match(/<title>([^<]*)<\/title>/) || [, ""])[1] });
    } else copyFileSync(from, to);
  }
}
mkdirSync(join(out, "site"), { recursive: true });
copy(join(root, "public"), join(out, "site"));

const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const item = p => `<li><a href="site/${p.path ? p.path + "/" : ""}">${esc(decode(p.title).split(/\s[|·]\s/)[0] || p.path || "Home")}</a> <span class="slot__town">/${esc(p.path)}${p.path ? "/" : ""}</span></li>`;
const hubData = JSON.parse(readFileSync(join(root, "hub", "data.json"), "utf8"));
const current = new Set(hubData.niches.flatMap(n => n.slots.map(s => s.slug)));
const agency = pages.filter(p => !p.path.startsWith("demos/")).sort((a, b) => a.path.localeCompare(b.path));
const demos = pages.filter(p => p.path.startsWith("demos/") && p.path !== "demos").sort((a, b) => a.path.localeCompare(b.path));
// Group the agency pages by what a visitor is looking for; anything new lands in "Other pages".
const GROUPS = [
  ["Selling pages, one per trade", p => /^(auto-detailing|exterior-cleaning|landscaping|commercial-cleaning)$/.test(p)],
  ["Auto detailing, other versions", p => /^auto-detailing\/[ab]$/.test(p)],
  ["Free tools and guides", p => /^(site-check|audit|guides\/.*)$/.test(p)],
  ["Offer, prices and checkout", p => /^(offer|pricing|before-you-pay|start|thanks)$/.test(p)],
  ["Company", p => /^(|privacy|demos)$/.test(p)],
];
const grouped = GROUPS.map(([name, test]) => [name, agency.filter(p => test(p.path))]);
const rest = agency.filter(p => !GROUPS.some(([, test]) => test(p.path)));
if (rest.length) grouped.push(["Other pages", rest]);
const group = ([name, list]) => list.length ? `<div class="group"><h3>${esc(name)} (${list.length})</h3><ul class="list">${list.map(item).join("")}</ul></div>` : "";
const now = demos.filter(p => current.has(p.path.slice(6))), older = demos.filter(p => !current.has(p.path.slice(6)));
const sellingList = hubData.niches.filter(n => n.page).map(n => `<li><a href="site/${esc(n.page)}">${esc(n.name)} websites</a> <span class="slot__town">/${esc(n.page)}</span></li>`).join("")
  + `<li><a href="site/site-check/">Free website check, any trade</a> <span class="slot__town">/site-check/</span></li>`;
const section = `
    <section id="selling" class="sec">
      <h2>Selling pages</h2>
      <p class="sec__lede">The pages cold email sends each trade to. Each one links its demo site and starts the $99 build.</p>
      <ul class="list">${sellingList}</ul>
    </section>

    <section id="pages" class="sec">
      <h2>Every page</h2>
      <p class="sec__lede">Every page of groundwork-web.com and every demo site in this repository, as they are on the main branch. Forms and tracking don't send anything here.</p>
      <div class="cols">
        <div class="group-col">${grouped.map(group).join("")}</div>
        <div class="group-col"><div class="group"><h3>Current demo sites (${now.length})</h3><ul class="list">${now.map(item).join("")}</ul></div>
          ${older.length ? `<details class="older"><summary>Earlier demo drafts (${older.length})</summary><ul class="list">${older.map(item).join("")}</ul></details>` : ""}</div>
      </div>
    </section>
  </main>`;
for (const slug of readdirSync(join(out, "demos"))) {
  const f = join(out, "demos", slug, "index.html");
  try { writeFileSync(f, withBar(readFileSync(f, "utf8"))); } catch {}
}
const hub = readFileSync(join(out, "index.html"), "utf8").replace("  </main>", section);
writeFileSync(join(out, "index.html"), hub);
console.log(`  built pages copy: ${agency.length} site pages, ${demos.length} demo pages -> _site/ (base ${base})`);
