// Turns a raw lead-list row into clean, typed facts. Nothing here invents data:
// a value we can't read cleanly comes back empty and the qualifier decides what to do.

const SUFFIX = /[,\s]+(llc|l\.l\.c\.?|inc\.?|incorporated|co\.?|corp\.?|ltd\.?|pllc)\.?$/i;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linktr\.ee|yelp\.com|tiktok\.com|x\.com|twitter\.com|nextdoor\.com|g\.page|business\.site)$/i;
const STUFFING = /\b(detail(ing)?|ceramic|coating|mobile|car wash|auto|paint|correction|ppf|tint|near me|best|cheap|interior|exterior)\b/i;
const ROLE_NAMES = /^(info|contact|sales|admin|office|hello|support|team|booking|bookings|service|owner|manager|the|mr|mrs|ms)$/i;

// Title-cases one ALL CAPS word, keeping vowel-less acronyms like "JD" or "TLC" (and "JD'S" -> "JD's").
const titleWord = w => {
  const [, base, poss = ""] = w.match(/^(.*?)(['’]S)?$/);
  const fixed = base.length <= 3 && /^[A-Z]+$/.test(base) && !/[AEIOUY]/.test(base)
    ? base
    : base.toLowerCase().replace(/(^|[-'’])\p{L}/gu, m => m.toUpperCase());
  return fixed + poss.toLowerCase();
};

// "SHINE PROS MOBILE DETAILING | Ceramic Coating Tampa" -> "Shine Pros Mobile Detailing"
export function cleanShopName(raw = "", city = "") {
  let name = String(raw).replace(/\s+/g, " ").trim();
  // Keyword stuffing after a separator: keep the head when the tail is keywords or the city.
  const parts = name.split(/\s+[|•·–—-]\s+/);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(" ");
    if (STUFFING.test(tail) || (city && tail.toLowerCase().includes(city.toLowerCase()))) name = parts[0];
  }
  name = name.replace(SUFFIX, "").trim();
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters && letters === letters.toUpperCase() && letters.length > 3) name = name.split(" ").map(titleWord).join(" ");
  return name;
}

export function cleanFirstName(raw = "") {
  const w = String(raw).trim().split(/\s+/)[0] || "";
  if (!/^\p{L}[\p{L}'’-]{1,19}$/u.test(w) || ROLE_NAMES.test(w)) return "";
  return w[0].toUpperCase() + w.slice(1).toLowerCase();
}

export function websiteKind(url = "") {
  const u = String(url).trim();
  if (!u) return "none";
  try {
    const host = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "");
    return SOCIAL.test(host) ? "social" : "site";
  } catch { return "none"; }
}

export function socialName(url = "") {
  return /instagram/i.test(url) ? "an Instagram page" : /yelp/i.test(url) ? "a Yelp page" : /linktr/i.test(url) ? "a Linktree" : /tiktok/i.test(url) ? "a TikTok page" : "a Facebook page";
}

export function formatPhone(raw = "") {
  const d = String(raw).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : "";
}

const num = v => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return String(v ?? "").trim() === "" || Number.isNaN(n) ? null : n; };

export function normalize(row, defaultNiche = "auto-detailing") {
  const city = String(row.city || "").trim().replace(/\s+/g, " ");
  const reviews = [1, 2, 3].map(i => ({ name: (row[`review_${i}_author`] || "").trim(), text: (row[`review_${i}_text`] || "").trim(), stars: num(row[`review_${i}_stars`]), date: (row[`review_${i}_date`] || "").trim() }))
    .filter(r => r.name && r.text);
  return {
    niche: String(row.niche || defaultNiche).trim().toLowerCase(),
    place_id: String(row.place_id || "").trim(),
    raw_name: String(row.name || "").trim(),
    shop: cleanShopName(row.name, city),
    first_name: cleanFirstName(row.first_name),
    email: String(row.email || "").trim().toLowerCase(),
    email_status: String(row.email_status || "unknown").trim().toLowerCase(),
    phone: formatPhone(row.phone),
    website: String(row.website || "").trim(),
    website_kind: websiteKind(row.website),
    gbp_url: String(row.gbp_url || "").trim(),
    category: String(row.category || "").trim(),
    city: city ? cleanShopName(city) : "",
    state: String(row.state || "").trim().toUpperCase(),
    zip: String(row.zip || "").trim(),
    rating: num(row.rating),
    review_count: num(row.review_count),
    latest_review_date: String(row.latest_review_date || "").trim(),
    hours_text: String(row.hours_text || "").trim(),
    services: String(row.services || "").split("|").map(s => s.trim()).filter(Boolean),
    reviews,
    source: String(row.source || "").trim(),
    fetched_at: String(row.fetched_at || "").trim(),
    cost_per_row_usd: num(row.cost_per_row_usd),
  };
}
