#!/usr/bin/env node
// Build one client site from clients/<slug>/site.json into dist/<slug>/.
//   node tools/build.mjs clients/<slug>            build one site
//   node tools/build.mjs --all                     build every folder in clients/
//   node tools/build.mjs clients/<slug> --out public/demos/<slug>
// Exits non-zero when a check fails, so a site with fake or missing basics never ships.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, robots, sitemap, llms, digits, headline } from "../template/render.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const outArg = outFlag >= 0 ? args[outFlag + 1] : null;

function check(s) {
  const errs = [], warns = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(s.slug && /^[a-z0-9-]+$/.test(s.slug), "slug: lowercase letters, numbers and dashes");
  need(s.business?.name, "business.name is required");
  need(s.business?.phone || s.business?.sms, "business.phone or business.sms is required (the sticky bar needs it)");
  need(s.hero?.sub, "hero.sub (the outcome line under the headline) is required");
  need(s.hero?.headline || (s.business?.service && s.business?.area), "business.service and business.area are required (they build the H1: \"{service} in {area}\")");
  const town = s.business?.area || s.business?.address?.city;
  need(town && headline(s).toLowerCase().includes(String(town).toLowerCase()), `the H1 must name the town ("${town}"): "${headline(s)}"`);
  (s.reviews?.items || []).forEach((r, i) => { if (r.date) need(!isNaN(Date.parse(r.date)), `reviews.items[${i}].date must be YYYY-MM-DD`); });
  need(s.seo?.title && s.seo?.description, "seo.title and seo.description are required");
  const isHttps = u => { try { return new URL(u).protocol === "https:"; } catch { return false; } };
  if (s.seo?.canonical) need(isHttps(s.seo.canonical), "seo.canonical must be a full URL starting with https://");
  (s.business?.social || []).forEach(u => need(isHttps(u), `business.social "${u}" must be a full URL starting with https://`));
  if (s.seo?.description && s.seo.description.length > 160) warns.push(`seo.description is ${s.seo.description.length} chars; Google shows about 155`);
  if (s.booking?.embedUrl) need(isHttps(s.booking.embedUrl), "booking.embedUrl must be https");
  if (s.areas?.mapEmbed) need(isHttps(s.areas.mapEmbed), "areas.mapEmbed must be https");

  if (!s.demo) {
    // Real client sites: FTC review rule and our own no-go list.
  const fake = n => digits(n).slice(-7, -4) === "555"; // 555 exchange = fictional number
  need(!fake(s.business?.phone), "business.phone is a 555 placeholder");
  need(!fake(s.business?.sms), "business.sms is a 555 placeholder");
    need(s.seo?.canonical, "seo.canonical (the live URL) is required for a real site");
    if (s.reviews?.items?.length) {
      need(s.reviews.url, "reviews.url is required: link to where these real reviews live (Google profile)");
      need(s.reviews.items.every(r => r.verified === true), "every review needs \"verified\": true after you copy it from the real source");
    }
    need(s.lead?.endpoint || s.booking?.embedUrl || s.tracking === "groundwork", "real sites need lead.endpoint or booking.embedUrl; without one the form falls back to SMS only");
    if (!s.hero?.image) warns.push("hero.image missing: real job photos convert far better than the placeholder");
    if ((s.reviews?.items || []).some(r => !r.date)) warns.push("reviews without a date: add date so the newest show first");
    if (s.work && !(s.work.gallery || []).some(g => g.image)) warns.push("work.gallery has no real photos yet");
    if (!s.areas?.mapEmbed) warns.push("areas.mapEmbed missing (Google Maps embed of the business)");
  }
  return { errs, warns };
}

function build(dir) {
  const srcDir = resolve(root, dir);
  const s = JSON.parse(readFileSync(join(srcDir, "site.json"), "utf8"));
  const { errs, warns } = check(s);
  warns.forEach(w => console.warn(`  warn  ${s.slug}: ${w}`));
  if (errs.length) { errs.forEach(e => console.error(`  ERROR ${s.slug || dir}: ${e}`)); return false; }

  s.builtAt = s.builtAt || new Date().toISOString().slice(0, 10);
  // The hero photo is the largest paint on phones; keep it small (about 200 KB).
  const heroFile = s.hero?.image && !/^(https?:)?\/\//.test(s.hero.image) ? join(srcDir, s.hero.image) : null;
  if (heroFile && existsSync(heroFile) && statSync(heroFile).size > 200 * 1024) {
    const msg = `hero image is ${Math.round(statSync(heroFile).size / 1024)} KB; export it as WebP under 200 KB`;
    if (s.demo) console.warn(`  warn  ${s.slug}: ${msg}`); else { console.error(`  ERROR ${s.slug}: ${msg}`); return false; }
  }
  const out = resolve(root, outArg || join("dist", s.slug));
  mkdirSync(out, { recursive: true });
  // CSS is inlined: one page per site, so a separate file only adds a render-blocking round trip.
  writeFileSync(join(out, "index.html"), render(s, { css: readFileSync(join(root, "template", "funnel.css"), "utf8") }));
  const md = llms(s);
  writeFileSync(join(out, "index.md"), md); // Markdown copy of the page's facts for AI agents
  cpSync(join(root, "template", "funnel.js"), join(out, "funnel.js"));
  if (existsSync(join(srcDir, "img"))) cpSync(join(srcDir, "img"), join(out, "img"), { recursive: true });
  // A demo inside our own site must not overwrite groundwork-web.com's robots.txt/sitemap.
  if (!outArg || !s.demo) {
    writeFileSync(join(out, "robots.txt"), robots(s));
    writeFileSync(join(out, "llms.txt"), md);
    const sm = sitemap(s); if (sm) writeFileSync(join(out, "sitemap.xml"), sm);
  }
  console.log(`  built ${s.slug}${s.demo ? " (demo)" : ""} -> ${out.replace(root + "/", "")}/`);
  return true;
}

let dirs;
if (args.includes("--all")) {
  const base = join(root, "clients");
  dirs = readdirSync(base).filter(d => statSync(join(base, d)).isDirectory() && existsSync(join(base, d, "site.json"))).map(d => join("clients", d));
} else {
  dirs = args.filter((a, i) => !a.startsWith("--") && !(outFlag >= 0 && i === outFlag + 1));
}
if (outArg && dirs.length > 1) { console.error("--out builds one site; leave it off to build several into dist/<slug>/"); process.exit(2); }
if (!dirs.length) { console.error("usage: node tools/build.mjs clients/<slug> [--out dir] | --all"); process.exit(2); }
const ok = dirs.map(build).every(Boolean);
process.exit(ok ? 0 : 1);
