#!/usr/bin/env node
// Build the browsable GitHub Pages copy: the hub (tools/build-hub.mjs) plus every page of
// groundwork-web.com (public/) and every demo, each with a bar back to the hub.
//   node tools/build-pages.mjs [--base /GWAGENCY]   writes _site/
// public/ uses root links ("/pricing/"); on a project Pages site everything lives under /<repo>/,
// so those links are rewritten to /<repo>/site/... . PHP, .htaccess, robots and sitemap are left out.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
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
// A thin bar at the top of every page in this copy: back to the hub, the page's trade, and the
// previous and next page in that trade (from _site/nav.json, written by build-hub.mjs).
const nav = JSON.parse(readFileSync(join(out, "nav.json"), "utf8"));
const place = new Map(); // hub-relative folder ("site/x/" or "demos/slug/") -> { trade, i }
for (const t of nav) t.pages.forEach((p, i) => place.set(p.href, { t, i }));
const A = "display:inline-flex;align-items:center;justify-content:center;min-height:36px;min-width:36px;font:600 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;text-decoration:none;color:";
const link = (href, html, label = "", color = "#F6F3EC", extra = "") => `<a href="${base}/${href}"${label ? ` aria-label="${label}"` : ""} style="${A}${color};${extra}">${html}</a>`;
const clean = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const icon = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">${d}</svg>`;
const off = `<span aria-hidden="true" style="${A}#5D5B55">`;
// One line at any width: back, the trade and position (shortened with an ellipsis if needed), prev, next, search.
const barFor = key => {
  const at = place.get(key);
  const parts = [link("", "&larr; All", "All GroundWork sites", "#F0B53A", "padding-right:4px")];
  if (at) {
    const { t, i } = at, prev = t.pages[i - 1], next = t.pages[i + 1];
    parts.push(link(`#trade-${t.id}`, `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${clean(t.short)}</span><span style="color:#ABA79C;margin-left:6px;white-space:nowrap">${i + 1}/${t.pages.length}</span>`, `${clean(t.name)}, page ${i + 1} of ${t.pages.length}`, "#F6F3EC", "min-width:0;flex:0 1 auto;justify-content:flex-start;text-decoration:underline;text-underline-offset:3px"));
    parts.push(`<span style="margin-left:auto;display:inline-flex">` +
      (prev ? link(prev.href, icon('<path d="M15 18l-6-6 6-6"/>'), `Previous: ${clean(prev.title)}`) : off + icon('<path d="M15 18l-6-6 6-6"/>') + "</span>") +
      (next ? link(next.href, icon('<path d="M9 18l6-6-6-6"/>'), `Next: ${clean(next.title)}`) : off + icon('<path d="M9 18l6-6-6-6"/>') + "</span>") +
      link("#search", icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), "Search all sites") + "</span>");
  } else parts.push(`<span style="margin-left:auto">${link("#search", icon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'), "Search all sites")}</span>`);
  return `<nav aria-label="All GroundWork sites" style="all:initial;box-sizing:border-box;display:flex;flex-wrap:nowrap;gap:6px;align-items:center;width:100%;padding:0 8px 0 12px;background:#141412;color:#F6F3EC;font:600 13px/1 system-ui,sans-serif;position:relative;z-index:2147483647">${parts.join("")}</nav>`;
};
// This copy is a preview: tracking and form posts to /api/ have nowhere to go on Pages, so answer them
// locally instead of filling the console with failed requests.
const quiet = `<script>(function(){var api=function(u){return /[/]api[/]/.test(String(u&&u.url||u))},n=navigator,f=window.fetch;if(n.sendBeacon){var b=n.sendBeacon.bind(n);n.sendBeacon=function(u,d){return api(u)||b(u,d)}}if(f)window.fetch=function(u,o){return api(u)?Promise.resolve(new Response("{}",{status:200,headers:{"Content-Type":"application/json"}})):f.apply(this,arguments)}})()</script>`;
// Keep each page's skip link as the first tab stop: put the bar after it when the body opens with one.
const withBar = (html, key) => html.replace(/<body([^>]*)>(\s*<a\b[^>]*href=["']#[^"']*["'][^>]*>[\s\S]*?<\/a>)?/i, (m, attrs, skip = "") => `<body${attrs}>${skip}${barFor(key)}`);
const seo = (html, rel) => {
  const live = "https://groundwork-web.com/" + rel.replace(/(^|\/)index\.html$/, "$1");
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, "");
  const tags = quiet + '<meta name="robots" content="noindex, nofollow">' + (/rel=["']canonical["']/i.test(html) ? "" : `<link rel="canonical" href="${live}">`);
  return withBar(html.replace(/<head([^>]*)>/i, `<head$1>${tags}`), "site/" + rel.replace(/(^|\/)index\.html$/, "$1"));
};
function copy(src, dst) {
  for (const name of readdirSync(src)) {
    if (SKIP.has(name) && src === join(root, "public")) continue;
    if (name.endsWith(".php") || name === ".DS_Store") continue;
    const from = join(src, name), to = join(dst, name);
    if (statSync(from).isDirectory()) { mkdirSync(to, { recursive: true }); copy(from, to); continue; }
    if (TEXT.has(extname(name))) {
      const text = readFileSync(from, "utf8");
      writeFileSync(to, name.endsWith(".html") ? seo(rewrite(text), relative(join(root, "public"), from)) : rewrite(text));
    } else copyFileSync(from, to);
  }
}
mkdirSync(join(out, "site"), { recursive: true });
copy(join(root, "public"), join(out, "site"));

for (const slug of readdirSync(join(out, "demos"))) {
  const f = join(out, "demos", slug, "index.html");
  try { writeFileSync(f, withBar(readFileSync(f, "utf8"), `demos/${slug}/`)); } catch {}
}
rmSync(join(out, "nav.json"));
console.log(`  built pages copy -> _site/ (base ${base})`);
