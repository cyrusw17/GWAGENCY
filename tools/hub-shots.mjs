#!/usr/bin/env node
// Screenshots for the showcase pages: one 1280x800 view of each demo listed in hub/data.json,
// saved as hub/shots/<slug>.jpg (640x400). Run locally after `node tools/build-pages.mjs`;
// needs Playwright (not used in CI). Re-run when a demo's first screen changes.
//   node tools/hub-shots.mjs [slug ...]   only those demos
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "_site");
if (!existsSync(join(site, "index.html"))) { console.error("Run node tools/build-pages.mjs first."); process.exit(2); }
const data = JSON.parse(readFileSync(join(root, "hub", "data.json"), "utf8"));
const only = process.argv.slice(2);
const targets = data.niches.flatMap(n => [
  ...n.slots.filter(s => s.client).map(s => `demos/${s.slug}/`),
  ...(n.more || []).map(m => m.href),
]).map(href => ({ href, slug: href.replace(/\/$/, "").split("/").pop() })).filter(t => !only.length || only.includes(t.slug));

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/GWAGENCY/, "");
  let f = join(site, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(site) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;

mkdirSync(join(root, "hub", "shots"), { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5, colorScheme: "light", reducedMotion: "reduce" });
for (const t of targets) {
  await page.goto(`http://localhost:${port}/GWAGENCY/${t.href}`, { waitUntil: "networkidle" });
  // Leave out the preview bar so the shot shows the site itself.
  await page.evaluate(() => document.querySelector('nav[aria-label="All GroundWork sites"]')?.remove());
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(root, "hub", "shots", `${t.slug}.jpg`), type: "jpeg", quality: 72 });
  console.log(`  shot ${t.slug}`);
}
await browser.close();
server.close();
