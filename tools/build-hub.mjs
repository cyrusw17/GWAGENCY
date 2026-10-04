#!/usr/bin/env node
// Build the work-log hub (hub/) and every linked demo into _site/ for GitHub Pages.
//   node tools/build-hub.mjs            build into _site/
//   node tools/build-hub.mjs --out dir  build somewhere else
// hub/data.json is the only file teammates edit: the demo slots (perTrade per trade).
// A slot with "client" is built from clients/<client>/site.json into demos/<slug>/.
// Exits non-zero when a demo fails its build checks or a slot is malformed.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
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

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const GRADES = ["A+", "A", "A-", "B", "C", "D", "F", "Inc."];
const STATUS = {
  concept: "Concept due",
  building: "Building",
  draft: "Earlier draft",
  review: "In review",
  graded: "Graded",
};
// Review states and grades are internal (they live in the internal report); the public page
// only says a finished demo is finished.
const pub = status => (status === "review" || status === "graded" ? "finished" : status);
STATUS.finished = "Finished";
const errors = [];

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets", "fonts"), { recursive: true });

// Demos: build each linked slot with the same checks a client site gets.
for (const niche of data.niches) {
  if (niche.slots.length !== data.perTrade) errors.push(`${niche.id}: needs exactly ${data.perTrade} slots (perTrade), has ${niche.slots.length}`);
  for (const slot of niche.slots) {
    if (!STATUS[slot.status]) errors.push(`${slot.business}: unknown status "${slot.status}"`);
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

const slotCard = (slot, i) => {
  const link = slot.client ? `<a class="slot__open" href="demos/${esc(slot.slug)}/">Open the demo<span class="sr-only"> of ${esc(slot.business)}</span></a>` : `<span class="slot__open slot__open--none">Not built yet</span>`;
  return `
        <li class="slot slot--${esc(pub(slot.status))}">
          <span class="slot__no">${i + 1}</span>
          <div class="slot__body">
            <h4 class="slot__name">${esc(slot.business)}</h4>
            ${slot.town ? `<p class="slot__town">${esc(slot.town)}</p>` : ""}
            <p class="slot__concept">${esc(slot.concept)}</p>
          </div>
          <div class="slot__foot">
            <span class="pill pill--${esc(pub(slot.status))}">${esc(STATUS[pub(slot.status)])}</span>
            ${link}
          </div>
        </li>`;
};

const demos = data.niches.map(n => `
      <section class="trade" aria-labelledby="trade-${esc(n.id)}">
        <header class="trade__head">
          <h3 id="trade-${esc(n.id)}">${esc(n.name)}</h3>
          <p>${n.slots.filter(s => s.client).length} of ${data.perTrade} finished</p>
        </header>
        <ol class="slots">${n.slots.map(slotCard).join("")}
        </ol>
        ${n.page ? `<p class="trade__links"><span>Selling page</span><a href="site/${esc(n.page)}">${esc(n.name)} websites<span class="sr-only">, the page that sells them</span></a>${(n.candidates || []).length ? `<span>Other versions</span>${n.candidates.map(c => `<a href="site/${esc(c.href)}">${esc(c.label)}</a>`).join("")}` : ""}</p>` : ""}
      </section>`).join("");

const total = data.niches.reduce((a, n) => a + n.slots.length, 0);
const updated = new Date(data.updated + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

let html = readFileSync(join(root, "hub", "index.html"), "utf8");
const fill = { DEMOS: demos, UPDATED: esc(updated), DEMO_TOTAL: String(total), PER_TRADE: String(data.perTrade), DEMO_NOTE: esc(data.demoNote || "") };
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in fill)) { errors.push(`hub/index.html: unknown placeholder ${m}`); return m; }
  return fill[k];
});

writeFileSync(join(out, "index.html"), html);
cpSync(join(root, "hub", "hub.css"), join(out, "assets", "hub.css"));
for (const f of ["oswald-600", "oswald-700", "source-sans-400", "source-sans-600"]) cpSync(join(root, "public", "assets", "fonts", `${f}.woff2`), join(out, "assets", "fonts", `${f}.woff2`));
// Internal work log: keep it and every demo out of search engines.
writeFileSync(join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
writeFileSync(join(out, ".nojekyll"), "");

if (errors.length) { errors.forEach(e => console.error(`  ERROR ${e}`)); process.exit(1); }
console.log(`  built hub (${total} demo slot${total === 1 ? "" : "s"}) -> ${out.replace(root + "/", "")}/`);
