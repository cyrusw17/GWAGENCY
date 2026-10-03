// node --test outreach/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../run.mjs";
import { cleanShopName, cleanFirstName, websiteKind } from "../lib/normalize.mjs";
import { inspectPage, checkSite } from "../lib/sitecheck.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { factsFor } from "../lib/lines.mjs";

const fx = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

const filler = "<p>" + "We are a family owned local business that takes pride in our work and treats every customer like a neighbor. ".repeat(4) + "</p>";
const sites = {
  "https://precisionspa-example.com/": `<html><body><h1>Precision Auto Spa</h1>${filler}<p>Interior detail $149. Full detail $249.</p><a href="/services">Services</a><a href="https://facebook.com/precision">Facebook</a></body></html>`,
  "https://precisionspa-example.com/services": `<html><body>${filler}<p>Ceramic from $799. Call us to schedule.</p></body></html>`,
  "https://ridgeline-example.com/": `<html><body>${filler}<p>Packages from $199</p><a href="https://ridgeline.square.site/book">Book now</a></body></html>`,
  // Exterior cleaning: quote form, reviews, tap-to-call, but only one real photo -> no_photos.
  "https://coastalsoftwash-example.com/": `<html><body>${filler}<img src="/logo.png"><img src="/img/house.jpg"><a href="tel:9045552015">Call</a><h2>Reviews</h2><form><input type="email" name="email"><button>Get a quote</button></form><footer>© 2019 Coastal</footer></body></html>`,
  // Landscaping: no form anywhere, contact page has only a phone -> no_quote.
  "https://greenline-example.com/": `<html><body>${filler}<p>Mowing, mulch, spring cleanup and patio installs.</p><a href="/contact">Contact</a></body></html>`,
  "https://greenline-example.com/contact": `<html><body>${filler}<p>Call us at 317-555-2016.</p></body></html>`,
  "https://js-only-example.com/": `<html><body><div id="root"></div><script src="/app.js"></script></body></html>`,
};
const fakeFetch = async url => {
  const html = sites[url];
  return { ok: !!html, status: html ? 200 : 404, url, text: async () => html || "" };
};

test("cleans names without inventing anything", () => {
  assert.equal(cleanShopName("BAYSIDE MOBILE DETAILING LLC"), "Bayside Mobile Detailing");
  assert.equal(cleanShopName("Gloss Theory Detail Studio | Ceramic Coating Orlando", "Orlando"), "Gloss Theory Detail Studio");
  assert.equal(cleanShopName("JD'S AUTO SPA"), "JD's Auto Spa");
  assert.equal(cleanShopName("A-1 Detail - Tampa", "Tampa"), "A-1 Detail");
  assert.equal(cleanFirstName("mike"), "Mike");
  assert.equal(cleanFirstName("info"), "");
  assert.equal(websiteKind("facebook.com/x"), "social");
  assert.equal(websiteKind("https://www.shop.com"), "site");
  assert.equal(websiteKind(""), "none");
});

test("site check: facebook links are not booking links, and flaws need evidence", async () => {
  assert.equal(inspectPage('<a href="https://facebook.com/x">fb</a>').booking, false);
  assert.equal(inspectPage('<a href="/book-now">Book</a>').booking, true);
  const r = await checkSite("precisionspa-example.com", { fetchImpl: fakeFetch });
  assert.deepEqual([r.status, r.flaw], ["checked", "no_booking"]);
  const ok = await checkSite("ridgeline-example.com", { fetchImpl: fakeFetch });
  assert.equal(ok.flaw, null);
  const down = await checkSite("gone-example.com", { fetchImpl: fakeFetch });
  assert.equal(down.status, "unverified");
  const js = await checkSite("js-only-example.com", { fetchImpl: fakeFetch });
  assert.match(js.detail, /JavaScript/);
  const ext = await checkSite("coastalsoftwash-example.com", { fetchImpl: fakeFetch, flawOrder: ["no_quote", "no_photos", "no_reviews"], year: 2026 });
  assert.deepEqual([ext.flaw, ext.oldCopyright], ["no_photos", 2019]);
});

test("end to end on the fixture list", async () => {
  const out = mkdtempSync(join(tmpdir(), "gw-run-"));
  const { approved, rejected, cost } = await run({
    in: join(fx, "sample-leads.csv"), out, pipeline: join(fx, "pipeline.csv"), suppress: join(fx, "suppress.txt"), today: "2026-10-03",
    checkSites: true, fetchImpl: fakeFetch, salt: "test-salt",
  });
  const by = Object.fromEntries(approved.map(a => [a.place_id, a]));
  const why = Object.fromEntries(rejected.map(r => [r.place_id, r.reasons]));

  assert.deepEqual(Object.keys(by).sort(), ["fx-001", "fx-002", "fx-003", "fx-013", "fx-015", "fx-016"]);
  assert.match(why["fx-004"], /email not verified \(catch_all\)/);
  assert.match(why["fx-005"], /not auto detailing/);
  assert.match(why["fx-006"], /chain/);
  assert.match(why["fx-007"], /rating 4.4/);
  assert.match(why["fx-008"], /only 9 reviews/);
  assert.match(why["fx-009"], /days old/);
  assert.match(why["fx-010"], /duplicate/);
  assert.match(why["fx-011"], /no flaw/);
  assert.match(why["fx-012"], /do-not-contact in sales pipeline/);
  assert.match(why["fx-014"], /no valid phone/);
  assert.match(why["fx-017"], /no_site shops aren't emailed in exterior cleaning/);
  assert.match(why["fx-018"], /already in sales pipeline \(contacted\)/);

  assert.equal(by["fx-001"].company_name, "Bayside Mobile Detailing");
  assert.match(by["fx-001"].personalization, /Bayside Mobile Detailing/);
  assert.equal(by["fx-002"].segment, "social_only");
  assert.match(by["fx-002"].personalization, /to a Facebook page/);
  assert.equal(by["fx-002"].first_name, "there");
  assert.equal(by["fx-003"].segment, "has_site");
  assert.match(by["fx-003"].personalization, /^I was looking at detailers in Austin .*no way to book/);
  assert.match(by["fx-013"].personalization, /to an Instagram page/); // "360" in the name is not a stray number
  assert.match(by["fx-015"].personalization, /^I was looking at pressure washing companies in Jacksonville .*before-and-after photos/);
  assert.equal(by["fx-015"].service, "roof soft washing");
  assert.equal(by["fx-015"].old_copyright, 2019);
  assert.match(by["fx-016"].personalization, /^I was looking at landscapers in Indianapolis .*request an estimate/);
  assert.equal(by["fx-016"].flaw_id, "no_quote");

  // No mockup host approved yet, so no links.
  assert.ok(approved.every(a => a.mockup_url === ""));

  // Mockup: real name and phone, noindex, labeled as a mockup, real review only, headline names service and town.
  const html = readFileSync(join(out, by["fx-001"].mockup_dir, "index.html"), "utf8");
  assert.match(html, /Bayside Mobile Detailing/);
  assert.match(html, /noindex/);
  assert.match(html, /Mockup for Bayside Mobile Detailing/);
  assert.match(html, /Mobile detailing in Tampa/);
  assert.match(html, /kids&#39; juice stains/);
  assert.doesNotMatch(html, /Fictional business|Sample customer|Harbor Line/);
  const ext = readFileSync(join(out, by["fx-015"].mockup_dir, "index.html"), "utf8");
  assert.match(ext, /Roof soft washing in Jacksonville/);
  assert.match(ext, /Get my quote/);

  assert.equal(cost.rows_in, 18);
  assert.equal(cost.per_approved_usd, 0.018);
  assert.ok(existsSync(join(out, "report.md")) && existsSync(join(out, "review.html")));
  assert.equal(parseCsv(readFileSync(join(out, "approved.csv"), "utf8")).length, 6);
});

test("mockup links only when a host is set", async () => {
  const out = mkdtempSync(join(tmpdir(), "gw-run-"));
  const { approved } = await run({ in: join(fx, "sample-leads.csv"), out, noPipeline: true, today: "2026-10-03", salt: "s", mockupBase: "https://mockup.example.com" });
  assert.ok(approved.length && approved.every(a => /^https:\/\/mockup\.example\.com\/[a-z0-9-]+-[0-9a-f]{10}\/$/.test(a.mockup_url)));
});

test("new-review line only when true on the send date", () => {
  const niche = { serviceRules: [], serviceDefault: "car detailing" };
  const copy = { niche_plural: "detailers", flaws: {} };
  const p = { shop: "X", city: "Y", rating: 4.9, review_count: 20, raw_name: "X", category: "", services: [], website_kind: "none", latest_review_date: "2026-09-30", fetched_at: "2026-10-02" };
  assert.equal(factsFor(p, { sendDate: "2026-10-03", copy, niche }).recent_review, "this week");
  assert.equal(factsFor(p, { sendDate: "2026-10-12", copy, niche }).recent_review, ""); // review too old by send day
  assert.equal(factsFor({ ...p, latest_review_date: "2026-10-05" }, { sendDate: "2026-10-06", copy, niche }).recent_review, ""); // data 4 days stale
});

test("refuses to run without the sales pipeline", async () => {
  await assert.rejects(run({ in: join(fx, "sample-leads.csv"), out: mkdtempSync(join(tmpdir(), "gw-run-")), dry: true }), /--pipeline/);
});

test("refuses to write prospect data inside the repo", async () => {
  await assert.rejects(run({ in: join(fx, "sample-leads.csv"), out: join(fx, "../out-test"), dry: true, noPipeline: true }), /inside the public repo/);
});
