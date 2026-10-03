// Gate 2: the personalized first line. Built only from checked facts and the cold email
// specialist's approved wording (copy/first-lines.json). No model writes free text here, so a
// line can't state anything that isn't in the row or our own site check.

import { createHash } from "node:crypto";
import { socialName } from "./normalize.mjs";

export const hash = s => createHash("sha256").update(String(s)).digest("hex");
const days = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

// "New review this week" must be true on the day the email goes out, and the data must be
// fresh enough to know: the review is at most 7 days before the send date and the row was
// fetched at most 2 days before it.
function recentReview(p, sendDate) {
  if (!p.latest_review_date || !p.fetched_at || Number.isNaN(Date.parse(p.latest_review_date))) return "";
  const age = days(p.latest_review_date, sendDate);
  return age >= 0 && age <= 7 && days(p.fetched_at, sendDate) <= 2 ? "this week" : "";
}

// The service the sequences call {service}: what someone would type into Google.
// The shop's own name and category win over its service list ("Bayside Mobile Detailing" that
// also lists ceramic coating is a mobile detailer).
export function topService(p, niche) {
  for (const hay of [`${p.raw_name} ${p.category}`, p.services.join(" ")]) {
    const rule = (niche.serviceRules || []).find(([re]) => new RegExp(re, "i").test(hay));
    if (rule) return rule[1];
  }
  return niche.serviceDefault;
}

export function segmentOf(p) {
  return p.website_kind === "none" ? "no_site" : p.website_kind === "social" ? "social_only" : "has_site";
}

export function factsFor(p, { sendDate, copy, niche, site }) {
  const flawLine = site?.status === "checked" && site.flaw ? copy.flaws[site.flaw] || "" : "";
  return {
    shop: p.shop,
    first_name: p.first_name || "there",
    city: p.city,
    state: p.state,
    niche: p.niche,
    niche_plural: copy.niche_plural,
    rating: p.rating == null ? "" : p.rating.toFixed(1),
    review_count: p.review_count == null ? "" : p.review_count.toLocaleString("en-US"),
    service: topService(p, niche),
    recent_review: recentReview(p, sendDate),
    social_name: p.website_kind === "social" ? socialName(p.website) : "",
    flaw_line: flawLine,
    flaw_id: flawLine ? site.flaw : "",
    old_copyright: site?.oldCopyright || "",
  };
}

const fill = (tpl, facts) => tpl.replace(/\{(\w+)\}/g, (m, k) => (facts[k] !== undefined && facts[k] !== "" ? facts[k] : m));

// Picks among the variants whose facts all exist, spread evenly by place_id so A/B arms stay stable across runs.
export function firstLine(p, facts, copy) {
  const variants = (copy.segments[segmentOf(p)] || []).filter(v => v.requires.every(k => facts[k]));
  if (!variants.length) return { line: "", variant: "" };
  const v = variants[parseInt(hash(p.place_id).slice(0, 8), 16) % variants.length];
  return { line: fill(v.line, facts), variant: v.id };
}
