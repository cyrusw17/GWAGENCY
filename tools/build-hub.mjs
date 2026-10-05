#!/usr/bin/env node
// Build the hub (hub/) and every linked demo into _site/ for GitHub Pages.
//   node tools/build-hub.mjs            build into _site/
//   node tools/build-hub.mjs --out dir  build somewhere else
// hub/data.json is the only file teammates edit: one entry per trade with its demo slots (perTrade),
// its selling page ("page"), other versions of that page ("candidates") and extra demos ("more",
// with "featured": true on the ones to show beside the main demo).
// A slot with "client" is built from clients/<client>/site.json into demos/<slug>/.
// The hub lists every page by trade: each trade's selling page and demos side by side, then the rest
// of groundwork-web.com (public/) and any older demo drafts. It also writes nav.json, which
// tools/build-pages.mjs uses for the back bar (prev and next within a trade) on every page.
// Exits non-zero when a demo fails its build checks or a slot is malformed.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFlag = process.argv.indexOf("--out");
const out = resolve(root, outFlag >= 0 ? process.argv[outFlag + 1] || "" : "_site");
// The output folder is wiped first, so only allow a fresh folder: _site/ or dist/... in the repo, or anywhere outside it.
const up = relative(out, root); // "" or no leading ".." means out is the repo or a folder above it
const inRepo = (out + "/").startsWith(root + "/") || !up.startsWith("..");
if (inRepo && !/^(_site|dist\/.+)$/.test(relative(root, out))) {
  console.error(`--out must be _site, a folder under dist/, or a folder outside the repo (got "${out}")`);
  process.exit(2);
}
const data = JSON.parse(readFileSync(join(root, "hub", "data.json"), "utf8"));
const pub = join(root, "public");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const decode = s => String(s ?? "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const GRADES = ["A+", "A", "A-", "B", "C", "D", "F", "Inc."];
// Review states and grades are internal (they live in the internal report); the public page only
// says a finished demo is finished.
const STATUS = ["concept", "building", "draft", "review", "graded"];
const errors = [];

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets", "fonts"), { recursive: true });

// Demos: build each linked slot with the same checks a client site gets.
for (const niche of data.niches) {
  if (niche.slots.length !== data.perTrade) errors.push(`${niche.id}: needs exactly ${data.perTrade} slots (perTrade), has ${niche.slots.length}`);
  for (const slot of niche.slots) {
    if (!STATUS.includes(slot.status)) errors.push(`${slot.business}: unknown status "${slot.status}"`);
    if (slot.grade && !GRADES.includes(slot.grade)) errors.push(`${slot.business}: unknown grade "${slot.grade}"`);
    if (!slot.client) continue;
    if (!/^[a-z0-9-]+$/.test(slot.slug || "")) { errors.push(`${slot.business}: slug must be lowercase letters, numbers and dashes`); continue; }
    if (!existsSync(join(root, "clients", slot.client, "site.json"))) { errors.push(`${slot.business}: clients/${slot.client}/site.json not found`); continue; }
    const site = JSON.parse(readFileSync(join(root, "clients", slot.client, "site.json"), "utf8"));
    if (site.demo !== true) { errors.push(`${slot.business}: clients/${slot.client} is not marked "demo": true; only demos go on the public hub`); continue; }
    try {
      execFileSync(process.execPath, [join(root, "tools", "build.mjs"), join("clients", slot.client), "--out", join(out, "demos", slot.slug)], { cwd: root, stdio: "inherit" });
    } catch { errors.push(`${slot.business}: build failed`); }
  }
}

// Every page of groundwork-web.com, keyed by its folder ("" is the home page). Redirect stubs are skipped.
const pages = new Map();
(function scan(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "api") continue;
    if (statSync(p).isDirectory()) { scan(p); continue; }
    if (name !== "index.html") continue;
    const html = readFileSync(p, "utf8");
    if (/http-equiv=["']refresh/i.test(html)) continue;
    const meta = re => { const m = html.match(re) || []; return decode(m[1] ?? m[2] ?? "").trim(); };
    pages.set(relative(pub, dir), {
      title: meta(/<title>([^<]*)<\/title>/i).split(/\s[|·]\s/)[0],
      desc: meta(/<meta\s+name=["']description["']\s+content=(?:"([^"]*)"|'([^']*)')/i),
    });
  }
})(pub);
// An href from the hub ("site/x/" or "x/" for public pages, "demos/slug/" for hub-built demos) to its public/ folder.
const folder = href => href.replace(/^site\//, "").replace(/\/$/, "");
const page = href => pages.get(folder(href)) || {};
// Card summaries stop before the first sentence that quotes a price, so none ends mid-price.
const clip = (s, n = 150) => {
  const sentences = s.match(/[^.!?]+[.!?]*\s*/g) || [];
  const k = sentences.findIndex(x => x.includes("$"));
  if (k > 0) s = sentences.slice(0, k).join("").trim();
  return s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s;
};

// Cards: one per page. kind is the small label above the title.
const card = (c, trade) => `
          <li class="card card--${esc(c.type)}" data-trade="${esc(trade)}" data-q="${esc([c.kind, c.title, c.meta, c.desc, trade].join(" ").toLowerCase())}">
            <a class="card__link" href="${esc(c.href)}">
              <span class="card__kind">${esc(c.kind)}</span>
              <b class="card__title">${esc(c.title)}</b>
              ${c.meta ? `<span class="card__meta">${esc(c.meta)}</span>` : ""}
              ${c.desc ? `<span class="card__desc">${esc(clip(c.desc))}</span>` : ""}
            </a>
          </li>`;
const sitePath = href => "/" + folder(href) + (folder(href) ? "/" : "");

const used = new Set(); // public folders already shown under a trade
const nav = []; // trades in order, each with its pages in order, for the back bar
const sections = [];
for (const n of data.niches) {
  const cards = [];
  if (n.page) {
    used.add(folder(n.page));
    cards.push({ type: "sell", kind: "Selling page", href: `site/${n.page}`, title: `${n.name} websites`, meta: sitePath(n.page), desc: page(n.page).desc });
  }
  for (const s of n.slots) {
    if (!s.client) continue;
    cards.push({ type: "demo", kind: "Demo site", href: `demos/${s.slug}/`, title: s.business, meta: s.town, desc: s.concept });
  }
  // Extra demos: "featured": true ones sit with the main demo, the rest follow as "More demos".
  const more = [...(n.more || [])].sort((a, b) => !!b.featured - !!a.featured);
  for (const m of more) {
    used.add(folder(m.href));
    const p = page(m.href);
    cards.push({ type: m.featured ? "demo" : "more", kind: m.featured ? "Demo site" : "More demos", href: m.href, title: p.title || m.label, meta: m.label, desc: p.desc });
  }
  for (const c of n.candidates || []) {
    used.add(folder(c.href));
    const [, v, name] = /^(\w+),\s*(.+)$/.exec(c.label) || [, "", c.label];
    cards.push({ type: "alt", kind: `Selling page${v ? `, version ${v}` : ", other version"}`, href: `site/${c.href}`, title: name, meta: sitePath(c.href), desc: page(c.href).desc });
  }
  for (const s of n.slots) if (s.client) used.add(`demos/${s.slug}`);
  nav.push({ id: n.id, name: n.name, short: n.short || n.name.split(" and ")[0], pages: cards.map(c => ({ href: c.href, title: c.title })) });
  const demoCount = cards.filter(c => c.type === "demo" || c.type === "more").length;
  sections.push(`
      <section class="trade" id="trade-${esc(n.id)}" data-trade="${esc(n.id)}" aria-labelledby="h-${esc(n.id)}">
        <header class="trade__head">
          <h2 id="h-${esc(n.id)}">${esc(n.name)}</h2>
          <p>${n.page ? "1 selling page, " : ""}${demoCount} demo site${demoCount === 1 ? "" : "s"}</p>
        </header>
        <ul class="cards">${cards.map(c => card(c, n.id)).join("")}
        </ul>
      </section>`);
}

// The rest of groundwork-web.com, grouped by what a visitor is after. Anything new lands in "Other page".
const GROUPS = [
  ["Free tool", p => /^(site-check|audit)$/.test(p)],
  ["Guide", p => /^guides\//.test(p)],
  ["Offer and checkout", p => /^(offer|pricing|before-you-pay|start|thanks)$/.test(p)],
  ["Agency site", p => /^(|privacy|demos)$/.test(p)],
];
// Pages whose own title doesn't say what they are out of context.
const TITLES = { "": "groundwork-web.com home page", thanks: "Thank-you page (after checkout)" };
const draftSlugs = [];
const agency = [];
for (const [path, p] of [...pages].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (used.has(path)) continue;
  if (/^demos\/[^/]+$/.test(path)) { draftSlugs.push([path, p]); continue; }
  const g = GROUPS.find(([, test]) => test(path));
  agency.push({ type: "page", kind: g ? g[0] : "Other page", href: `site/${path}${path ? "/" : ""}`, title: TITLES[path] || p.title || path, meta: sitePath(path), desc: p.desc });
}
const order = k => { const i = GROUPS.findIndex(([name]) => name === k); return i < 0 ? 99 : i; };
agency.sort((a, b) => order(a.kind) - order(b.kind) || (a.meta === "/" ? -1 : b.meta === "/" ? 1 : a.meta.localeCompare(b.meta)));
nav.push({ id: "agency", name: "Agency site", short: "Agency", pages: agency.map(c => ({ href: c.href, title: c.title })) });
sections.push(`
      <section class="trade" id="trade-agency" data-trade="agency" aria-labelledby="h-agency">
        <header class="trade__head">
          <h2 id="h-agency">The agency site</h2>
          <p>${agency.length} pages of groundwork-web.com</p>
        </header>
        <ul class="cards">${agency.map(c => card(c, "agency")).join("")}
        </ul>
      </section>`);

const drafts = draftSlugs.map(([path, p]) => ({ type: "draft", kind: "Earlier draft", href: `site/${path}/`, title: p.title, meta: sitePath(path), desc: p.desc }));
if (drafts.length) {
  nav.push({ id: "drafts", name: "Earlier drafts", short: "Drafts", pages: drafts.map(c => ({ href: c.href, title: c.title })) });
  sections.push(`
      <section class="trade" id="trade-drafts" data-trade="drafts" aria-labelledby="h-drafts">
        <details class="older">
          <summary><h2 id="h-drafts">Earlier demo drafts</h2> <span>${drafts.length} demos made before the current ones</span></summary>
          <ul class="cards">${drafts.map(c => card(c, "drafts")).join("")}
          </ul>
        </details>
      </section>`);
}

const chips = nav.map(t => `<a class="chip" href="#trade-${esc(t.id)}" data-filter="${esc(t.id)}">${esc(t.name)} <span>${t.pages.length}</span></a>`).join("");
const count = nav.reduce((a, t) => a + t.pages.length, 0);
const demoTotal = nav.filter(t => t.id !== "agency" && t.id !== "drafts").reduce((a, t) => a + t.pages.length, 0);
// The build date, so the header always says when this copy was made.
const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

let html = readFileSync(join(root, "hub", "index.html"), "utf8");
const fill = { CATALOG: sections.join(""), CHIPS: chips, UPDATED: esc(updated), PAGE_TOTAL: String(count), TRADE_TOTAL: String(data.niches.length), TRADE_PAGES: String(demoTotal) };
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in fill)) { errors.push(`hub/index.html: unknown placeholder ${m}`); return m; }
  return fill[k];
});

writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "nav.json"), JSON.stringify(nav));
cpSync(join(root, "hub", "hub.css"), join(out, "assets", "hub.css"));
for (const f of ["oswald-600", "oswald-700", "source-sans-400", "source-sans-600"]) cpSync(join(root, "public", "assets", "fonts", `${f}.woff2`), join(out, "assets", "fonts", `${f}.woff2`));
// Keep the hub and every demo out of search engines.
writeFileSync(join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
writeFileSync(join(out, ".nojekyll"), "");

if (errors.length) { errors.forEach(e => console.error(`  ERROR ${e}`)); process.exit(1); }
console.log(`  built hub (${data.niches.length} trades, ${count} pages listed) -> ${out.replace(root + "/", "")}/`);
