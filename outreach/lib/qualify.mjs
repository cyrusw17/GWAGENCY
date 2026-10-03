// Gate 1: is this a prospect we should email at all? Every "no" carries a reason so the
// lead list builder can see what it is paying for and dropping.

// minReviews and categoryPattern come from the niche file (niches/<niche>.json).
export const DEFAULT_RULES = {
  minRating: 4.5,
  maxDataAgeDays: 14,
  acceptEmailStatus: ["valid"], // catch_all bounces too often on new domains; team lead: drop until domains are warm
  chains: ["ziebart", "tint world", "maaco", "mister car wash", "tommy's express", "quick quack", "zips car wash", "take 5", "jiffy lube", "valvoline", "autobell", "delta sonic", "waxie",
    "window genie", "men in kilts", "shack shine", "fish window", "window gang", "pressure pros", "sunshine window",
    "trugreen", "brightview", "lawn doctor", "weed man", "the grounds guys", "u.s. lawns", "naturalawn", "spring-green", "yellowstone landscape", "davey tree", "bartlett tree", "monster tree"],
};

const shopKey = (name, city, state) => "shop:" + `${name} ${city || ""} ${state || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const daysBetween = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

export function qualify(p, { rules = DEFAULT_RULES, niche, today, seen, suppress }) {
  const r = [];
  if (!niche) return [`unknown niche "${p.niche}"`];
  if (!p.place_id) r.push("missing place_id");
  if (!p.shop) r.push("missing shop name");
  if (!p.email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(p.email)) r.push("missing or malformed email");
  else if (!rules.acceptEmailStatus.includes(p.email_status)) r.push(`email not verified (${p.email_status})`);
  if (!p.city || !p.state) r.push("missing city or state");
  if (p.rating == null || p.review_count == null) r.push("missing rating or review count");
  else {
    if (p.review_count < niche.minReviews) r.push(`only ${p.review_count} reviews (min ${niche.minReviews})`);
    if (p.rating < rules.minRating) r.push(`rating ${p.rating} (min ${rules.minRating})`);
    if (p.rating > 5 || p.review_count > 20000) r.push("rating or review count out of range");
  }
  if (!p.fetched_at || Number.isNaN(Date.parse(p.fetched_at))) r.push("missing fetched_at date");
  else if (daysBetween(p.fetched_at, today) > rules.maxDataAgeDays) r.push(`data is ${daysBetween(p.fetched_at, today)} days old (max ${rules.maxDataAgeDays})`);
  if (!new RegExp(niche.categoryPattern, "i").test(`${p.category} ${p.raw_name}`)) r.push(`not ${niche.label} (category "${p.category}")`);
  const lower = p.raw_name.toLowerCase();
  if (rules.chains.some(c => lower.includes(c))) r.push("chain or franchise");

  const domain = p.email.split("@")[1] || "";
  const phoneDigits = p.phone.replace(/\D/g, "");
  const keys = [p.place_id && "place:" + p.place_id.toLowerCase(), p.email && "email:" + p.email, phoneDigits && "phone:" + phoneDigits].filter(Boolean);
  const shopKeys = [p.shop, p.raw_name].map(n => shopKey(n, p.city, p.state));
  const hit = suppress && [...keys, ...shopKeys, "domain:" + domain].map(k => suppress.get(k)).find(Boolean);
  if (hit) r.push(hit);
  if (seen) {
    if (keys.some(k => seen.has(k))) r.push("duplicate of an earlier row");
    keys.forEach(k => seen.add(k));
  }
  return r;
}

// Suppression comes from two places, merged into one map of key -> reason:
// - a plain list (one email, @domain.com, place_id or phone per line), e.g. bounces and complaints;
// - the sales pipeline (/mnt/project-files/sales/pipeline.csv): every do-not-contact row, and every
//   shop already in a sequence or further along, so nobody gets a second cold sequence.
const keyOf = line => line.startsWith("@") ? "domain:" + line.slice(1)
  : line.includes("@") ? "email:" + line
  : /^[\d\s()+.-]{10,}$/.test(line) ? "phone:" + line.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  : "place:" + line;

export function loadSuppression(text = "", map = new Map()) {
  for (const line of text.split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith("#"))) map.set(keyOf(line), "on suppression list");
  return map;
}

export function loadPipeline(rows, map = new Map()) {
  for (const row of rows) {
    const status = String(row.status || "").trim().toLowerCase();
    if (!status || status === "new") continue;
    const reason = status === "do-not-contact" ? "do-not-contact in sales pipeline" : `already in sales pipeline (${status})`;
    const email = String(row.contact_email || "").trim().toLowerCase();
    const phone = String(row.contact_phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (email) map.set("email:" + email, reason);
    if (phone.length === 10) map.set("phone:" + phone, reason);
    if (row.shop) map.set(shopKey(row.shop, row.city, row.state), reason);
  }
  return map;
}
