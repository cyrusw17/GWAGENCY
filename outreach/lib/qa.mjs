// Gate 4: last check on what would actually go out. Anything odd is rejected, not "fixed",
// because a wrong fact in a cold email costs more than one fewer prospect.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function checkLine(line, p, facts, banned) {
  const r = [];
  if (!line) return ["no first-line variant fits this prospect's facts"];
  if (/[{}]/.test(line)) r.push("first line has an unfilled variable");
  if (line.length > 240) r.push(`first line is ${line.length} chars (max 240)`);
  if (!line.includes(p.shop)) r.push("first line doesn't name the shop");
  for (const w of banned) {
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
  if (!p.phone) r.push("no valid phone number (mockup needs tap-to-call)");
  if (p.shop.length > 40) r.push(`shop name is ${p.shop.length} chars after cleanup; check it by hand`);
  if (/[|@#]|https?:|\.com\b/i.test(p.shop)) r.push("shop name still has odd characters after cleanup");
  if (p.shop.replace(/[^A-Za-z]/g, "").length < 3) r.push("shop name too short to trust");
  return r;
}

const textOf = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

// Every visible fact on a mockup must come from the shop's row or sit in a section labeled "sample".
// Sections built from niche defaults must carry the label; everywhere else, every number and price
// must be one of the shop's own facts.
export function checkMockup(html, p, site) {
  const r = [];
  if (!html.includes(esc(p.shop))) r.push("mockup doesn't show the shop name");
  if (!html.includes('<meta name="robots" content="noindex">')) r.push("mockup is missing noindex");
  if (!html.includes(`tel:${p.phone.replace(/\D/g, "")}`)) r.push("mockup is missing the shop's tap-to-call");
  if (/Harbor Line|555-01\d\d|Fictional business|Sample customer|\{\w+\}/.test(textOf(html))) r.push("mockup has leftover template text");
  if (site.reviews?.items?.some(i => !p.reviews.some(rv => rv.text === i.text && rv.name === i.name))) r.push("mockup shows a review that isn't, word for word, from the shop's Google profile");
  if (html.length > 200000) r.push(`mockup HTML is ${Math.round(html.length / 1024)} KB`);

  let rest = html.replace(/<div class="f-demo"[\s\S]*?<\/div><\/div>/, " ");
  for (const id of site.sampleSections || []) {
    const sec = html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`));
    if (!sec) continue;
    if (!/\bsample\b/i.test(textOf(sec[0]))) r.push(`mockup section "${id}" uses sample content without a "Sample" label`);
    rest = rest.replace(sec[0], " ");
  }
  // Sample content must not survive outside a labeled section, whatever template drew it.
  const leftover = textOf(rest.replace(/<form[\s\S]*?<\/form>/gi, " ")); // the form's service picker may list sample names
  // Full sentences, not names: a name like "Ceramic coating" can also be the shop's real service elsewhere on the page.
  const samples = {
    services: (site.services || []).map(x => x.desc), pricing: (site.packages || []).flatMap(x => x.features || []),
    how: (site.steps || []).map(x => x.body), faq: (site.faq || []).map(x => x.a),
  };
  for (const id of site.sampleSections || []) {
    const hit = (samples[id] || []).find(t => t && leftover.includes(t));
    if (hit) r.push(`mockup shows sample "${hit}" outside a labeled "${id}" section (templates must wrap it in <section id="${id}">)`);
  }
  // Structured data is a claim too (Google reads it): every value must match the row, or be absent.
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let ld; try { ld = JSON.parse(m[1]); } catch { r.push("mockup has invalid JSON-LD"); continue; }
    const a = ld.address || {};
    const want = { telephone: [ld.telephone, p.phone], postalCode: [a.postalCode, p.zip], addressLocality: [a.addressLocality, p.city], addressRegion: [a.addressRegion, p.state] };
    const same = (k, a, b) => k === "telephone" ? String(a).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "") === String(b).replace(/\D/g, "") : String(a) === String(b);
    for (const [k, [got, row]] of Object.entries(want)) if (got != null && got !== "" && !same(k, got, row)) r.push(`mockup schema ${k} "${got}" isn't the row's value`);
    if (ld.name && ld["@type"] !== "WebPage" && ld["@type"] !== "FAQPage" && ld.name !== p.shop) r.push(`mockup schema name "${ld.name}" isn't the shop`);
    if (ld.aggregateRating || ld.review) r.push("mockup schema has rating or review markup (not allowed on a mockup)");
  }
  // Allowed numbers: the shop's own facts, plus the copyright year.
  const allowed = new Set([p.rating?.toFixed(1), String(p.review_count), p.review_count?.toLocaleString("en-US"), p.zip, String(new Date(site.builtAt || Date.now()).getFullYear()), "5"].filter(Boolean));
  const NUM = /\$\s?\d[\d,.]*|\d[\d,.:]*\d|\d/g;
  const own = [p.shop, p.city, p.hours_text, ...p.reviews.map(x => `${x.text} ${x.date}`)].join(" ");
  for (const m of own.match(NUM) || []) allowed.add(m.replace(/[.,:]$/, ""));
  // The form's step counter ("Step 1 of 2") is interface, not a claim.
  const text = textOf(rest.replace(/<form[\s\S]*?<\/form>/gi, " ")).split(p.phone).join(" ");
  for (const m of text.match(NUM) || []) {
    const n = m.replace(/[.,:]$/, "");
    if (!allowed.has(n)) { r.push(`mockup shows "${n}" outside a sample section, and it isn't one of the shop's facts`); break; }
  }
  return r;
}
