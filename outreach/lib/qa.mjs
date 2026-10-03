// Gate 4: last check on what would actually go out. Anything odd is rejected, not "fixed",
// because a wrong fact in a cold email costs more than one fewer prospect.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function checkLine(line, p, facts, copy) {
  const r = [];
  if (!line) return ["no first-line variant fits this prospect's facts"];
  if (/[{}]/.test(line)) r.push("first line has an unfilled variable");
  if (line.length > 240) r.push(`first line is ${line.length} chars (max 240)`);
  if (!line.includes(p.shop)) r.push("first line doesn't name the shop");
  for (const w of copy.banned) {
    const re = /^\w+$/.test(w) ? new RegExp(`\\b${w}\\b`) : new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (re.test(line)) r.push(`first line uses banned word "${w}"`);
  }
  // Every number in the line must be one of the shop's facts.
  const allowed = new Set([facts.rating, facts.review_count].filter(Boolean));
  const rest = line.split(p.shop).join(" ").split(p.city).join(" ");
  for (const n of rest.match(/\d[\d,.]*\d|\d/g) || []) if (!allowed.has(n.replace(/[.,]$/, ""))) r.push(`first line has a number (${n}) that isn't a checked fact`);
  return r;
}

export function checkShop(p) {
  const r = [];
  if (!p.phone) r.push("no valid phone number (preview needs tap-to-call)");
  if (p.shop.length > 40) r.push(`shop name is ${p.shop.length} chars after cleanup; check it by hand`);
  if (/[|@#]|https?:|\.com\b/i.test(p.shop)) r.push("shop name still has odd characters after cleanup");
  if (p.shop.replace(/[^A-Za-z]/g, "").length < 3) r.push("shop name too short to trust");
  return r;
}

export function checkPreview(html, p, site) {
  const r = [];
  if (!html.includes(esc(p.shop))) r.push("preview doesn't show the shop name");
  if (!html.includes('<meta name="robots" content="noindex">')) r.push("preview is missing noindex");
  if (!html.includes(p.phone.replace(/\D/g, ""))) r.push("preview is missing the shop's phone");
  if (/Harbor Line|555-01\d\d|Fictional business|Sample customer|\{\w+\}/.test(html)) r.push("preview has leftover template text");
  if (site.reviews?.items?.some(i => !p.reviews.some(rv => rv.text === i.text))) r.push("preview shows a review that isn't from the shop's profile");
  if (html.length > 150000) r.push(`preview HTML is ${Math.round(html.length / 1024)} KB`);
  return r;
}
