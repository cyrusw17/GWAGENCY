#!/usr/bin/env node
// Prospect -> checked facts -> personalized first line -> free mockup site, with a QA gate
// at every step and a cost report. Prospect data stays outside this public repo: --out must
// point somewhere else (the team uses /mnt/project-files/personalization/runs/<date>/).
//
//   node outreach/run.mjs --in leads.csv --out /path/outside/repo
//        [--pipeline /mnt/project-files/sales/pipeline.csv] [--suppress suppress.txt]
//        [--check-sites] [--niche auto-detailing] [--today 2026-10-03] [--send-date 2026-10-06]
//        [--mockup-base https://mockup.example.com/] [--list-cost 0.004] [--sample 20]
//
// Env: MOCKUP_SALT (makes mockup links unguessable; required unless --dry), PSI_API_KEY (optional, slow-site check).

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseProspects, toCsv } from "./lib/csv.mjs";
import { normalize } from "./lib/normalize.mjs";
import { qualify, loadSuppression, loadPipeline, DEFAULT_RULES } from "./lib/qualify.mjs";
import { checkSite } from "./lib/sitecheck.mjs";
import { factsFor, firstLine, segmentOf, hash } from "./lib/lines.mjs";
import { siteJson, writeMockup, mockupId } from "./lib/mockup.mjs";
import { checkLine, checkShop, checkMockup } from "./lib/qa.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function args(argv) {
  const o = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) o.flags.add(a.slice(2));
    else { o[a.slice(2)] = next; i++; }
  }
  return o;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

export async function run(opts) {
  const t0 = Date.now();
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const out = resolve(opts.out);
  const rel = relative(repoRoot, out);
  if (!rel.startsWith("..") && !opts.allowInRepo) throw new Error(`--out ${out} is inside the public repo; write prospect data outside it`);
  const sendDate = opts.sendDate || today;
  const salt = opts.salt || "";
  if (!salt && !opts.dry) throw new Error("set MOCKUP_SALT so mockup links can't be guessed (or pass --dry for a test run)");
  const allCopy = JSON.parse(readFileSync(join(here, "copy/first-lines.json"), "utf8"));
  const palettes = JSON.parse(readFileSync(join(here, "niches/_palettes.json"), "utf8")).palettes;
  const niches = {};
  const nicheOf = slug => {
    if (!(slug in niches)) {
      const file = join(here, `niches/${slug}.json`);
      niches[slug] = /^[a-z0-9-]+$/.test(slug) && existsSync(file) && allCopy.niches[slug] ? JSON.parse(readFileSync(file, "utf8")) : null;
    }
    return niches[slug];
  };
  // No mockup host is approved yet: until one is, mockup_url stays empty and copy must not link to it.
  const mockupBase = opts.mockupBase ? opts.mockupBase.replace(/\/?$/, "/") : "";
  const rules = { ...DEFAULT_RULES, ...(opts.rules || {}) };

  const raw = parseProspects(readFileSync(opts.in, "utf8"));
  if (!opts.pipeline && !opts.noPipeline) throw new Error("pass --pipeline <sales/pipeline.csv> so do-not-contact and already-contacted shops are dropped");
  const suppress = new Map();
  if (opts.pipeline) loadPipeline(parseProspects(readFileSync(opts.pipeline, "utf8")), suppress);
  if (opts.suppress) loadSuppression(readFileSync(opts.suppress, "utf8"), suppress);
  const seen = new Set();
  const listCost = raw.reduce((sum, r) => sum + (Number(r.cost_per_row_usd) || Number(opts.listCost) || 0), 0);

  // Gate 1: qualify (sync, cheap) before spending any time on site checks or mockups.
  const rows = raw.map(r => normalize(r, opts.niche)).map(p => ({ p, niche: nicheOf(p.niche) }))
    .map(x => ({ ...x, reasons: qualify(x.p, { rules, niche: x.niche, today, seen, suppress }) }));
  rows.forEach(x => x.reasons.push(...(x.reasons.length ? [] : checkShop(x.p))));

  // Site checks only for has-site prospects that passed gate 1.
  let siteChecks = 0;
  await pool(rows, 6, async x => {
    if (x.reasons.length) return;
    if (!allCopy.niches[x.p.niche].segments[segmentOf(x.p)]) { x.reasons.push(`${segmentOf(x.p)} shops aren't emailed in ${x.niche.label} (call list)`); return; }
    if (segmentOf(x.p) !== "has_site") return;
    if (!opts.checkSites) { x.reasons.push("has a website but --check-sites was off, so no flaw is verified"); return; }
    siteChecks++;
    x.site = await checkSite(x.p.website, { fetchImpl: opts.fetchImpl, psiKey: opts.psiKey, flawOrder: x.niche.flawOrder, serviceWords: x.niche.serviceWords, year: Number(today.slice(0, 4)) });
    if (x.site.status !== "checked") x.reasons.push(`site check failed: ${x.site.detail}`);
    else if (!x.site.flaw) x.reasons.push(`site has no flaw we can name (${x.site.detail})`);
  });

  if (existsSync(join(out, "mockups"))) rmSync(join(out, "mockups"), { recursive: true });
  mkdirSync(join(out, "mockups"), { recursive: true });
  const approved = [], rejected = [];
  let mockupBytes = 0;
  for (const x of rows) {
    const { p, niche } = x;
    let line = "", variant = "", id = "", facts;
    if (!x.reasons.length) {
      const copy = allCopy.niches[p.niche];
      facts = factsFor(p, { sendDate, copy, niche, site: x.site });
      ({ line, variant } = firstLine(p, facts, copy));
      x.reasons.push(...checkLine(line, p, facts, allCopy.banned));
    }
    if (!x.reasons.length) {
      id = mockupId(p, salt || "dry-run");
      const site = siteJson(p, facts, { niche, palettes, id, demoCtaHref: `https://groundwork-web.com/start/?mockup=${id}` });
      const html = writeMockup(site, join(out, "mockups", id), join(repoRoot, "template"), today);
      mockupBytes += html.length;
      x.reasons.push(...checkMockup(html, p, site));
      if (x.reasons.length) rmSync(join(out, "mockups", id), { recursive: true });
    }
    if (x.reasons.length) {
      rejected.push({ place_id: p.place_id, niche: p.niche, name: p.raw_name, email: p.email, city: p.city, state: p.state, reasons: x.reasons.join("; ") });
      continue;
    }
    // Column names match the sequences' variables ({flaw} in the detailer sequence, {flaw_line} in the others).
    approved.push({
      email: p.email, first_name: facts.first_name, company_name: p.shop, personalization: line,
      niche: p.niche, niche_plural: facts.niche_plural, city: p.city, state: p.state, rating: facts.rating, review_count: facts.review_count,
      service: facts.service, flaw: facts.flaw_line, flaw_line: facts.flaw_line, flaw_id: facts.flaw_id, old_copyright: facts.old_copyright,
      mockup_url: mockupBase ? mockupBase + id + "/" : "", segment: segmentOf(p), line_variant: variant, send_date: sendDate,
      phone: p.phone, website: p.website, place_id: p.place_id, site_check: x.site?.detail || "", mockup_dir: `mockups/${id}/`,
    });
  }

  const ms = Date.now() - t0;
  const cost = {
    rows_in: raw.length, approved: approved.length, rejected: rejected.length,
    list_usd: +listCost.toFixed(4), site_checks: siteChecks, site_check_usd: 0, llm_usd: 0, mockup_hosting_usd: 0,
    total_usd: +listCost.toFixed(4),
    per_row_usd: raw.length ? +(listCost / raw.length).toFixed(5) : 0,
    per_approved_usd: approved.length ? +(listCost / approved.length).toFixed(5) : null,
    seconds: +(ms / 1000).toFixed(2), ms_per_row: raw.length ? Math.round(ms / raw.length) : 0,
    avg_mockup_kb: approved.length ? +(mockupBytes / approved.length / 1024).toFixed(1) : 0,
  };

  writeFileSync(join(out, "approved.csv"), toCsv(approved));
  writeFileSync(join(out, "rejected.csv"), toCsv(rejected, ["place_id", "niche", "name", "email", "city", "state", "reasons"]));
  writeFileSync(join(out, "run.json"), JSON.stringify({ today, sendDate, mockupBase, cost, rules }, null, 2));
  const sample = pickSample(approved, Number(opts.sample) || 20);
  writeFileSync(join(out, "report.md"), report({ today, sendDate, mockupBase, cost, approved, rejected, sample }));
  writeFileSync(join(out, "review.html"), reviewPage(sample, today));
  return { approved, rejected, cost };
}

// A stable random sample for a person to read before anything is loaded into the sending tool.
function pickSample(rows, n) {
  const k = Math.max(n, Math.ceil(rows.length * 0.1));
  return [...rows].sort((a, b) => hash(a.place_id).localeCompare(hash(b.place_id))).slice(0, k);
}

function countBy(list, f) {
  const m = new Map();
  for (const x of list) for (const k of [].concat(f(x))) m.set(k, (m.get(k) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function report({ today, sendDate, mockupBase, cost, approved, rejected, sample }) {
  const reasons = countBy(rejected, r => r.reasons.split("; ").map(s => s.replace(/\d[\d,.]*/g, "N").replace(/\(.*\)/, "(...)")));
  return `# Personalization run ${today}

${cost.rows_in} prospects in, **${cost.approved} approved**, ${cost.rejected} rejected. Nothing has been sent or published.
First lines are checked for send date ${sendDate}; if the batch goes out later, re-run with --send-date.
${mockupBase ? `Mockup links point to ${mockupBase}.` : "No mockup host is set, so mockup_url is empty: copy must not link to mockups yet."}

## Cost
| Item | USD |
|---|---|
| Lead list (incl. verification, from the list builder) | ${cost.list_usd} |
| Site checks (${cost.site_checks}, own fetch${cost.site_checks ? "" : ", none run"}) | 0 |
| First lines (templates, no model calls) | 0 |
| Mockup hosting (static files, avg ${cost.avg_mockup_kb} KB each; host not chosen yet) | 0 |
| **Total** | **${cost.total_usd}** |
| Per prospect in | ${cost.per_row_usd} |
| Per approved prospect | ${cost.per_approved_usd ?? "n/a"} |

Run time ${cost.seconds}s (${cost.ms_per_row} ms per prospect).

## Approved by niche, segment and line variant
${countBy(approved, a => `${a.niche} / ${a.segment} / ${a.line_variant}`).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- none"}

## Why prospects were rejected
${reasons.map(([k, v]) => `- ${k}: ${v}`).join("\n") || "- none"}

## Spot check before loading (${sample.length} of ${approved.length})
Open review.html, read each line against the shop's Google listing, and open its mockup. One wrong fact means the whole batch waits until the cause is fixed.

${sample.map(a => `- **${a.company_name}** (${a.city}, ${a.state}), ${a.segment}: ${a.personalization}`).join("\n")}
`;
}

function reviewPage(sample, today) {
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Spot check ${today}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:16px;max-width:980px;background:#fff;color:#111}td,th{border-bottom:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}table{border-collapse:collapse;width:100%}small{color:#555}</style></head><body>
<h1>Spot check ${today}</h1><p>Check each line against the Google listing, then open the mockup. Mark anything wrong in the run notes.</p>
<table><tr><th>Shop</th><th>First line</th><th>Mockup</th></tr>
${sample.map(a => `<tr><td><b>${e(a.company_name)}</b><br><small>${e(a.city)}, ${e(a.state)} · ${e(a.rating)}★ · ${e(a.review_count)} reviews · ${e(a.segment)}</small><br><small><a href="https://www.google.com/maps/place/?q=place_id:${e(a.place_id)}">Google listing</a></small></td><td>Hi ${e(a.first_name)},<br><br>${e(a.personalization)}${a.site_check ? `<br><small>Site check: ${e(a.site_check)}</small>` : ""}</td><td><a href="${e(a.mockup_dir)}index.html">open</a></td></tr>`).join("\n")}
</table></body></html>\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args(process.argv.slice(2));
  if (!a.in || !a.out) { console.error("usage: node outreach/run.mjs --in leads.csv --out <dir outside repo> --pipeline sales/pipeline.csv | --no-pipeline [--suppress file] [--check-sites] [--niche slug] [--today YYYY-MM-DD] [--send-date YYYY-MM-DD] [--mockup-base URL] [--list-cost N] [--dry]"); process.exit(2); }
  run({
    in: a.in, out: a.out, suppress: a.suppress, pipeline: a.pipeline, noPipeline: a.flags.has("no-pipeline"), today: a.today, sendDate: a["send-date"], mockupBase: a["mockup-base"], listCost: a["list-cost"], sample: a.sample, niche: a.niche,
    checkSites: a.flags.has("check-sites"), dry: a.flags.has("dry"), salt: process.env.MOCKUP_SALT, psiKey: process.env.PSI_API_KEY,
  }).then(({ cost }) => {
    console.log(`${cost.rows_in} in, ${cost.approved} approved, ${cost.rejected} rejected. $${cost.total_usd} total, $${cost.per_approved_usd ?? "n/a"} per approved prospect. Report: ${join(resolve(a.out), "report.md")}`);
  }).catch(e => { console.error(e.message); process.exit(1); });
}
