// node --test outreach/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../run.mjs";
import { cleanShopName, cleanFirstName, websiteKind } from "../lib/normalize.mjs";
import { inspectPage, checkSite } from "../lib/sitecheck.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { factsFor } from "../lib/lines.mjs";
import { qualify, loadPipeline, loadSuppression } from "../lib/qualify.mjs";
import { normalize as normalizeRow } from "../lib/normalize.mjs";
import { siteJson } from "../lib/mockup.mjs";
import { checkMockup } from "../lib/qa.mjs";
import { render } from "../../template/render.mjs";

const fx = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

const filler = "<p>" + "We are a family owned local business that takes pride in our work and treats every customer like a neighbor. ".repeat(4) + "</p>";
const sites = {
  "https://precisionspa-example.com/": `<html><body><h1>Precision Auto Spa</h1>${filler}<p>Interior detail $149. Full detail $249.</p><a href="/services">Services</a><a href="https://facebook.com/precision">Facebook</a></body></html>`,
  "https://precisionspa-example.com/services": `<html><body>${filler}<p>Ceramic from $799. Call us to schedule.</p></body></html>`,
  "https://ridgeline-example.com/": `<html><body>${filler}<p>Packages from $199</p><h2>Reviews</h2><a href="tel:7205552011">Call</a><a href="https://ridgeline.square.site/book">Book now</a></body></html>`,
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
  assert.ok(!by["fx-012"], "opted-out shop must never be approved");
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
  assert.match(by["fx-015"].personalization, /^I was looking at pressure washing companies in Jacksonville .*doesn't show a single price/);
  assert.equal(by["fx-015"].service, "house washing"); // name ("Soft Wash") beats the service list
  assert.equal(by["fx-015"].old_copyright, 2019);
  assert.match(by["fx-016"].personalization, /^I was looking at landscapers in Indianapolis .*request an estimate/);
  assert.equal(by["fx-016"].flaw_id, "no_quote");

  // No mockup host approved yet, so no links.
  assert.ok(approved.every(a => a.mockup_url === ""));

  // Mockup: real name and phone, noindex, labeled as a mockup, real review only, headline names service and town.
  const html = readFileSync(join(out, by["fx-001"].mockup_dir, "index.html"), "utf8");
  assert.match(html, /Bayside Mobile Detailing/);
  assert.match(html, /noindex/);
  assert.match(html, /Free mockup/);
  assert.match(html, /Made for Bayside Mobile Detailing/);
  assert.match(html, /What Bayside Mobile Detailing does/); // services came from the listing
  assert.match(html, /Sample packages and prices/);
  assert.match(html, /Sample questions and answers/);
  assert.match(html, /Mobile detailing in Tampa/);
  assert.match(html, /kids&#39; juice stains/);
  assert.match(html, /Reviews from Google/);
  assert.match(html, /Dana R\./); // reviewer name exactly as Google gives it
  assert.doesNotMatch(html, /Fictional business|Sample customer|Harbor Line/);
  const ext = readFileSync(join(out, by["fx-015"].mockup_dir, "index.html"), "utf8");
  assert.match(ext, /House washing in Jacksonville/);
  assert.match(ext, /What Coastal Soft Wash does/);
  assert.match(ext, /Sample packages and prices/); // labeled sample prices: our contrast with priceless sites
  assert.match(ext, /Sample before and after/);
  assert.match(ext, /Get my quote/);
  const land = readFileSync(join(out, by["fx-016"].mockup_dir, "index.html"), "utf8");
  assert.match(land, /Sample services/); // no services in the row, so the defaults are labeled

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

test("QA fails a mockup with an unlabeled sample section or a stray price", () => {
  const p = normalizeRow({ place_id: "q1", name: "Test Detail", phone: "8135550000", city: "Tampa", state: "FL", zip: "33602", rating: "4.8", review_count: "40", category: "Car detailing" });
  const niche = JSON.parse(readFileSync(join(fx, "../niches/auto-detailing.json"), "utf8"));
  const facts = factsFor(p, { sendDate: "2026-10-03", copy: { niche_plural: "detailers", flaws: {} }, niche });
  const site = siteJson(p, facts, { niche, palettes: [{}], id: "t", demoCtaHref: "#" });
  site.builtAt = "2026-10-03";
  assert.deepEqual(checkMockup(render(site), p, site), []);
  site.faqHeadline = "Questions, answered";
  assert.match(checkMockup(render(site), p, site).join(), /section "faq" uses sample content/);
  // No ZIP in the row: no ZIP anywhere, including the schema Google reads.
  const noZip = normalizeRow({ place_id: "q2", name: "Test Detail", phone: "8135550000", city: "Tampa", state: "FL", rating: "4.8", review_count: "40", category: "Car detailing" });
  const s2 = siteJson(noZip, facts, { niche, palettes: [{}], id: "t2", demoCtaHref: "#" });
  const h2 = render(s2);
  assert.doesNotMatch(h2, /postalCode|33602/);
  assert.deepEqual(checkMockup(h2, noZip, s2), []);
  assert.match(checkMockup(render({ ...s2, business: { ...s2.business, address: { city: "Tampa", region: "FL", postal: "32202" } } }), noZip, s2).join(), /schema postalCode "32202"/);
  site.faqHeadline = "Sample questions and answers";
  site.hero.sub = "Full details from $189.";
  assert.match(checkMockup(render(site), p, site).join(), /"\$189" outside a sample section/);
});

test("suppression: every opt-out status in the pipeline, plus bounces, beats any other data", () => {
  const map = loadPipeline([
    { shop: "A", city: "X", state: "TX", contact_email: "a@a-example.com", status: "do-not-contact" },
    { shop: "B", city: "X", state: "TX", contact_phone: "214-555-0101", status: "opted_out" },
    { shop: "Fresh", city: "X", state: "TX", contact_email: "f@f-example.com", status: "new" },
  ]);
  loadSuppression("bounce@c-example.com\n@d-example.com\n", map);
  const base = { place_id: "z", name: "Shop", email: "x@y-example.com", email_status: "valid", phone: "", city: "X", state: "TX", rating: "4.9", review_count: "50", category: "Car detailing", fetched_at: "2026-10-02" };
  const niche = { minReviews: 15, categoryPattern: "detail", label: "auto detailing" };
  const q = row => qualify(normalizeRow({ ...base, ...row }), { niche, today: "2026-10-03", suppress: map }).join();
  assert.match(q({ email: "a@a-example.com" }), /do-not-contact/);
  assert.match(q({ phone: "(214) 555-0101" }), /do-not-contact in sales pipeline \(opted_out\)/);
  assert.match(q({ name: "A", email: "other@z-example.com" }), /do-not-contact/); // same shop, new address
  assert.match(q({ email: "bounce@c-example.com" }), /suppression/);
  assert.match(q({ email: "anyone@d-example.com" }), /suppression/);
  assert.equal(q({ email: "f@f-example.com" }), "");
});

test("accepts the lead list builder's column names", () => {
  const p = normalizeRow({ company_name: "Shine Pros", reviews: "31", maps_url: "https://maps.google.com/?cid=9", rating: "4.7" });
  assert.deepEqual([p.shop, p.review_count, p.gbp_url], ["Shine Pros", 31, "https://maps.google.com/?cid=9"]);
});

test("renders mockups with any template folder", async () => {
  const tpl = mkdtempSync(join(tmpdir(), "gw-tpl-"));
  writeFileSync(join(tpl, "render.mjs"), `export const render = s => '<!doctype html><meta name="robots" content="noindex"><h1>' + s.business.name + '</h1><a href="tel:' + s.business.phone.replace(/\\D/g, "") + '">Call</a>';`);
  const out = mkdtempSync(join(tmpdir(), "gw-run-"));
  const { approved } = await run({ in: join(fx, "sample-leads.csv"), out, noPipeline: true, today: "2026-10-03", salt: "s", template: tpl });
  assert.ok(approved.length);
  assert.match(readFileSync(join(out, approved[0].mockup_dir, "index.html"), "utf8"), /^<!doctype html><meta name="robots"/);

  // A template that prints sample FAQs without a labeled section is caught.
  const tpl2 = mkdtempSync(join(tmpdir(), "gw-tpl-"));
  writeFileSync(join(tpl2, "render.mjs"), `export const render = s => '<!doctype html><meta name="robots" content="noindex"><h1>' + s.business.name + '</h1><a href="tel:' + s.business.phone.replace(/\\D/g, "") + '">Call</a><p>' + s.faq[0].a + '</p>';`);
  const out2 = mkdtempSync(join(tmpdir(), "gw-run-"));
  const r2 = await run({ in: join(fx, "sample-leads.csv"), out: out2, noPipeline: true, today: "2026-10-03", salt: "s", template: tpl2 });
  assert.equal(r2.approved.length, 0);
  assert.match(r2.rejected.find(x => x.place_id === "fx-001").reasons, /outside a labeled "faq" section/);
});

test("refuses to run without the sales pipeline", async () => {
  await assert.rejects(run({ in: join(fx, "sample-leads.csv"), out: mkdtempSync(join(tmpdir(), "gw-run-")), dry: true }), /--pipeline/);
});

test("refuses to write prospect data inside the repo", async () => {
  await assert.rejects(run({ in: join(fx, "sample-leads.csv"), out: join(fx, "../out-test"), dry: true, noPipeline: true }), /inside the public repo/);
});
