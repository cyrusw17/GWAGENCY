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

const fx = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

const sites = {
  "https://precisionspa-example.com/": `<html><body><h1>Precision Auto Spa</h1><p>Interior detail $149. Full detail $249.</p><a href="/services">Services</a><a href="https://facebook.com/precision">Facebook</a></body></html>`,
  "https://precisionspa-example.com/services": `<html><body><p>Ceramic from $799. Call us to schedule.</p></body></html>`,
  "https://ridgeline-example.com/": `<html><body><p>Packages from $199</p><a href="https://ridgeline.square.site/book">Book now</a></body></html>`,
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
});

test("end to end on the fixture list", async () => {
  const out = mkdtempSync(join(tmpdir(), "gw-run-"));
  const { approved, rejected, cost } = await run({
    in: join(fx, "sample-leads.csv"), out, suppress: join(fx, "suppress.txt"), today: "2026-10-03",
    checkSites: true, fetchImpl: fakeFetch, salt: "test-salt",
  });
  const by = Object.fromEntries(approved.map(a => [a.place_id, a]));
  const why = Object.fromEntries(rejected.map(r => [r.place_id, r.reasons]));

  assert.deepEqual(Object.keys(by).sort(), ["fx-001", "fx-002", "fx-003", "fx-013"]);
  assert.match(why["fx-004"], /email not verified \(catch_all\)/);
  assert.match(why["fx-005"], /not a detailer/);
  assert.match(why["fx-006"], /chain/);
  assert.match(why["fx-007"], /rating 4.4/);
  assert.match(why["fx-008"], /only 9 reviews/);
  assert.match(why["fx-009"], /days old/);
  assert.match(why["fx-010"], /duplicate/);
  assert.match(why["fx-011"], /no flaw/);
  assert.match(why["fx-012"], /suppression/);
  assert.match(why["fx-014"], /no valid phone/);

  assert.equal(by["fx-001"].company_name, "Bayside Mobile Detailing");
  assert.match(by["fx-001"].personalization, /Bayside Mobile Detailing/);
  assert.match(by["fx-001"].personalization, /63|4\.9/);
  assert.equal(by["fx-002"].segment, "social_only");
  assert.match(by["fx-002"].personalization, /Facebook page/);
  assert.equal(by["fx-002"].first_name, "there");
  assert.equal(by["fx-003"].segment, "has_site");
  assert.match(by["fx-003"].personalization, /no way to book/);
  assert.match(by["fx-013"].personalization, /to an Instagram page/); // "360" in the name is not a stray number

  // Preview: real name and phone, noindex, labeled as a preview, real review only.
  const html = readFileSync(join(out, by["fx-001"].preview_dir, "index.html"), "utf8");
  assert.match(html, /Bayside Mobile Detailing/);
  assert.match(html, /noindex/);
  assert.match(html, /Preview for Bayside Mobile Detailing/);
  assert.match(html, /kids&#39; juice stains/);
  assert.doesNotMatch(html, /Fictional business|Sample customer|Harbor Line/);
  assert.match(by["fx-001"].preview_url, /^https:\/\/preview\.groundwork-web\.com\/bayside-mobile-detailing-[0-9a-f]{10}\/$/);

  assert.equal(cost.rows_in, 14);
  assert.equal(cost.list_usd, 0.084);
  assert.equal(cost.per_approved_usd, 0.021);
  assert.ok(existsSync(join(out, "report.md")) && existsSync(join(out, "review.html")));
  assert.equal(parseCsv(readFileSync(join(out, "approved.csv"), "utf8")).length, 4);
});

test("refuses to write prospect data inside the repo", async () => {
  await assert.rejects(run({ in: join(fx, "sample-leads.csv"), out: join(fx, "../out-test"), dry: true }), /inside the public repo/);
});
