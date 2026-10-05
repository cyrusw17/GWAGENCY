#!/usr/bin/env node
// Search-demand step of the seo-analysis skill (.claude/skills/seo-analysis), without the InfraNodus MCP:
// expands each niche's seed queries through Google Suggest (seed, seed + a-z, question prefixes) and
// ranks the suggestions. A term scores higher the more expansions return it and the nearer the top it sits.
//   node tools/seo-terms.mjs [outDir]      (default outDir: out/seo-terms)
// No dependencies, Node 18+. Needs outbound access to suggestqueries.google.com.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const NICHES = {
  agency: ["website design for small business", "web design for local business", "website for service business", "small business website cost", "local seo for small business"],
  "auto-detailing": ["car detailing website", "auto detailing website", "detailing business website", "how to get more detailing customers", "mobile detailing marketing"],
  "exterior-cleaning": ["pressure washing website", "pressure washing business website", "soft washing website", "how to get pressure washing customers", "pressure washing marketing"],
  landscaping: ["lawn care website", "landscaping website", "lawn care business website", "how to get lawn care customers", "lawn care marketing"],
  "commercial-cleaning": ["commercial cleaning website", "janitorial website", "cleaning company website", "how to get commercial cleaning contracts", "commercial cleaning marketing"],
  "real-estate-agents": ["real estate agent website", "realtor website", "real estate website for agents", "how to get real estate leads", "real estate agent bio"],
};
const PREFIXES = ["how to", "what", "best", "do i need", "cost of", "why"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function suggest(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q=${encodeURIComponent(q)}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return (await res.json())[1] || [];
    } catch {}
    await sleep(1000 * (i + 1));
  }
  return [];
}

const outDir = process.argv[2] || "out/seo-terms";
mkdirSync(outDir, { recursive: true });
const all = {};
for (const [niche, seeds] of Object.entries(NICHES)) {
  const queries = seeds.flatMap((s) => [s, ...[..."abcdefghijklmnopqrstuvwxyz"].map((c) => `${s} ${c}`), ...PREFIXES.map((p) => `${p} ${s}`)]);
  const score = new Map();
  for (const q of queries) {
    (await suggest(q)).forEach((t, i) => score.set(t, (score.get(t) || 0) + (10 - Math.min(i, 9))));
    await sleep(120);
  }
  const ranked = [...score].sort((a, b) => b[1] - a[1]).map(([term, s]) => ({ term, score: s }));
  all[niche] = ranked;
  console.log(`${niche}: ${queries.length} queries, ${ranked.length} terms`);
}
writeFileSync(join(outDir, "suggest-terms.json"), JSON.stringify(all, null, 1));
writeFileSync(join(outDir, "suggest-terms.md"), Object.entries(all).map(([n, r]) =>
  `## ${n}\n\n| Term | Score |\n|---|---|\n${r.slice(0, 80).map((x) => `| ${x.term} | ${x.score} |`).join("\n")}\n`).join("\n"));
