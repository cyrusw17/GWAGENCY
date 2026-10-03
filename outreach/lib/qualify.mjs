// Gate 1: is this a prospect we should email at all? Every "no" carries a reason so the
// lead list builder can see what it is paying for and dropping.

export const DEFAULT_RULES = {
  minReviews: 15,
  minRating: 4.5,
  maxDataAgeDays: 14,
  acceptEmailStatus: ["valid"], // catch_all bounces too often on new domains; add it once domains are warm
  categoryPattern: "detail|ceramic|coating|paint correction|paint protection|auto spa|car care",
  chains: ["ziebart", "tint world", "maaco", "mister car wash", "tommy's express", "quick quack", "zips car wash", "take 5", "jiffy lube", "valvoline", "autobell", "delta sonic", "waxie"],
};

const daysBetween = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

export function qualify(p, { rules = DEFAULT_RULES, today, seen, suppress }) {
  const r = [];
  if (!p.place_id) r.push("missing place_id");
  if (!p.shop) r.push("missing shop name");
  if (!p.email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(p.email)) r.push("missing or malformed email");
  else if (!rules.acceptEmailStatus.includes(p.email_status)) r.push(`email not verified (${p.email_status})`);
  if (!p.city || !p.state) r.push("missing city or state");
  if (p.rating == null || p.review_count == null) r.push("missing rating or review count");
  else {
    if (p.review_count < rules.minReviews) r.push(`only ${p.review_count} reviews (min ${rules.minReviews})`);
    if (p.rating < rules.minRating) r.push(`rating ${p.rating} (min ${rules.minRating})`);
    if (p.rating > 5 || p.review_count > 20000) r.push("rating or review count out of range");
  }
  if (!p.fetched_at || Number.isNaN(Date.parse(p.fetched_at))) r.push("missing fetched_at date");
  else if (daysBetween(p.fetched_at, today) > rules.maxDataAgeDays) r.push(`data is ${daysBetween(p.fetched_at, today)} days old (max ${rules.maxDataAgeDays})`);
  if (!new RegExp(rules.categoryPattern, "i").test(`${p.category} ${p.raw_name}`)) r.push(`not a detailer (category "${p.category}")`);
  const lower = p.raw_name.toLowerCase();
  if (rules.chains.some(c => lower.includes(c))) r.push("chain or franchise");

  const domain = p.email.split("@")[1] || "";
  const phoneDigits = p.phone.replace(/\D/g, "");
  const keys = [p.place_id && "place:" + p.place_id.toLowerCase(), p.email && "email:" + p.email, phoneDigits && "phone:" + phoneDigits].filter(Boolean);
  if (suppress && (keys.some(k => suppress.has(k)) || suppress.has("domain:" + domain))) r.push("on suppression list");
  if (seen) {
    if (keys.some(k => seen.has(k))) r.push("duplicate of an earlier row");
    keys.forEach(k => seen.add(k));
  }
  return r;
}

// Suppression file: one entry per line, any of: an email, @domain.com, a place_id, or a phone number.
export function loadSuppression(text = "") {
  const set = new Set();
  for (const line of text.split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith("#"))) {
    if (line.startsWith("@")) set.add("domain:" + line.slice(1));
    else if (line.includes("@")) set.add("email:" + line);
    else if (/^[\d\s()+.-]{10,}$/.test(line)) set.add("phone:" + line.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""));
    else set.add("place:" + line);
  }
  return set;
}
