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
const seo = (html, rel) => {
  const live = "https://groundwork-web.com/" + rel.replace(/(^|\/)index\.html$/, "$1");
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, "");
  const tags = '<meta name="robots" content="noindex, nofollow">' + (/rel=["']canonical["']/i.test(html) ? "" : `<link rel="canonical" href="${live}">`);
  return html.replace(/<head([^>]*)>/i, `<head$1>${tags}`);
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
const agency = pages.filter(p => !p.path.startsWith("demos/")).sort((a, b) => a.path.localeCompare(b.path));
const demos = pages.filter(p => p.path.startsWith("demos/")).sort((a, b) => a.path.localeCompare(b.path));
const section = `
    <section id="pages" class="sec">
      <h2>Every page</h2>
      <p class="sec__lede">Every page of groundwork-web.com and every demo site in this repository, as they are on the main branch. Forms and tracking don't send anything here.</p>
      <div class="cols">
        <div><h3>groundwork-web.com (${agency.length})</h3><ul class="list">${agency.map(item).join("")}</ul></div>
        <div><h3>Demo sites (${demos.length})</h3><ul class="list">${demos.map(item).join("")}</ul></div>
      </div>
    </section>
  </main>`;
const hub = readFileSync(join(out, "index.html"), "utf8").replace("  </main>", section);
writeFileSync(join(out, "index.html"), hub);
console.log(`  built pages copy: ${agency.length} site pages, ${demos.length} demo pages -> _site/ (base ${base})`);
