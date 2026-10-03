// Gate 2: the personalized first line. Built only from checked facts and the cold email
// specialist's approved wording (copy/first-lines.json). No model writes free text here, so a
// line can't state anything that isn't in the row.

import { createHash } from "node:crypto";
import { socialName } from "./normalize.mjs";

export const hash = s => createHash("sha256").update(String(s)).digest("hex");

function recentReview(dateStr, today) {
  if (!dateStr || Number.isNaN(Date.parse(dateStr))) return "";
  const days = Math.floor((Date.parse(today) - Date.parse(dateStr)) / 86400000);
  return days >= 0 && days <= 7 ? "this week" : "";
}

// The service the sequences call {service}: what someone would type into Google.
export function topService(p) {
  const hay = `${p.raw_name} ${p.category} ${p.services.join(" ")}`.toLowerCase();
  if (/ceramic|coating/.test(p.raw_name.toLowerCase())) return "ceramic coating";
  if (/mobile/.test(hay)) return "mobile detailing";
  if (/ceramic|coating/.test(hay)) return "ceramic coating";
  return "car detailing";
}

export function segmentOf(p) {
  return p.website_kind === "none" ? "no_site" : p.website_kind === "social" ? "social_only" : "has_site";
}

export function factsFor(p, { today, copy, site }) {
  return {
    shop: p.shop,
    first_name: p.first_name || "there",
    city: p.city,
    state: p.state,
    rating: p.rating == null ? "" : p.rating.toFixed(1),
    review_count: p.review_count == null ? "" : p.review_count.toLocaleString("en-US"),
    service: topService(p),
    recent_review: recentReview(p.latest_review_date, today),
    social_name: p.website_kind === "social" ? socialName(p.website) : "",
    flaw: site?.status === "checked" && site.flaw ? copy.flaws[site.flaw] : "",
    flaw_id: site?.status === "checked" ? site.flaw || "" : "",
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
