// Checks a prospect's existing website for the three flaws the has-site sequence may name:
// no prices, no way to book, slow on mobile. A flaw is only reported when we actually saw it:
// any fetch error or doubt returns "unverified", and the QA gate drops unverified claims.

const BOOKING_WIDGETS = /(square\.site|squareup\.com\/appointments|book\.squareup|booksy\.com|calendly\.com|acuityscheduling|setmore\.com|vagaro\.com|urable\.com|mobile-tech\.app|mobiletechrx|housecallpro|getjobber|jobber\.com|schedulicity|simplybook|appointy|fresha\.com|glossgenius|book\.getorderly|orderly|youcanbook\.me|google\.com\/calendar\/appointments|calendar\.app\.google|tidycal|zcal|bookeo|checkfront|servicetitan|detailbook|detail\.bot)/i;
const BOOK_WORDS = /\b(book( now| online| an? appointment| your)?|schedule( now| online| (an? )?appointment)?|request (a |an )?(quote|appointment|time)|get (a )?quote|reserve)\b/i;
const PRICE = /\$\s?\d{2,5}(?:\.\d{2})?\b/;
const MORE_PAGES = /(price|pricing|service|package|menu|rates|book|detail)/i;

export const visibleText = html => String(html)
  .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$")
  .replace(/\s+/g, " ");

function hasForm(html) {
  return /<form[\s\S]*?<\/form>/i.test(html) && /(type=["']?(tel|email|date)|name=["']?(phone|email|date|vehicle|service))/i.test(html);
}

// A link to a booking page ("/book", "?schedule"), but not facebook.com, which also contains "book".
const bookingLink = html => [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
  .some(m => !/facebook|fb\.com|ebook|bookmark/i.test(m[1]) && /(^|[\/?#=_-])(book|booking|schedule|appointments?)([\/?#=_.-]|$)/i.test(m[1]));

export function inspectPage(html) {
  const text = visibleText(html);
  return {
    prices: PRICE.test(text),
    booking: BOOKING_WIDGETS.test(html) || (hasForm(html) && BOOK_WORDS.test(text)) || bookingLink(html),
  };
}

function internalLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname === base.hostname && (MORE_PAGES.test(u.pathname) || MORE_PAGES.test(visibleText(m[2])))) out.add(u.href.split("#")[0]);
    } catch { /* ignore bad href */ }
  }
  return [...out].slice(0, 3);
}

async function get(fetchImpl, url, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; GroundWorkSiteCheck/1.0; +https://groundwork-web.com)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { html: await res.text(), url: res.url || url };
  } finally { clearTimeout(t); }
}

// Returns { status: "checked" | "unverified", flaw: "no_booking" | "no_prices" | "slow_mobile" | null, detail }
export async function checkSite(website, { fetchImpl = globalThis.fetch, timeoutMs = 10000, psiKey = "" } = {}) {
  let start;
  try {
    start = new URL(/^https?:\/\//i.test(website) ? website : "https://" + website);
  } catch { return { status: "unverified", flaw: null, detail: "bad URL" }; }
  let home;
  try { home = await get(fetchImpl, start.href, timeoutMs); }
  catch (e) { return { status: "unverified", flaw: null, detail: `could not load site (${e.message})` }; }

  const found = inspectPage(home.html);
  const pages = [home.url];
  // A homepage without prices or booking often links to a services or booking page; read those before claiming a flaw.
  if (!found.prices || !found.booking) {
    for (const link of internalLinks(home.html, new URL(home.url))) {
      try {
        const page = await get(fetchImpl, link, timeoutMs);
        const f = inspectPage(page.html);
        found.prices ||= f.prices; found.booking ||= f.booking;
        pages.push(link);
      } catch { return { status: "unverified", flaw: null, detail: `could not load ${link}` }; }
      if (found.prices && found.booking) break;
    }
  }
  if (!found.booking) return { status: "checked", flaw: "no_booking", detail: `no booking widget, booking form or booking link on ${pages.length} page(s)` };
  if (!found.prices) return { status: "checked", flaw: "no_prices", detail: `no $ prices on ${pages.length} page(s)` };

  if (psiKey) {
    try {
      const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&key=${encodeURIComponent(psiKey)}&url=${encodeURIComponent(home.url)}`;
      const res = await fetchImpl(api);
      const score = Math.round(((await res.json())?.lighthouseResult?.categories?.performance?.score ?? NaN) * 100);
      if (score < 50) return { status: "checked", flaw: "slow_mobile", detail: `PageSpeed mobile score ${score}` };
      if (Number.isFinite(score)) return { status: "checked", flaw: null, detail: `prices, booking and PageSpeed ${score} all fine` };
    } catch { /* fall through: speed unknown */ }
  }
  return { status: "checked", flaw: null, detail: "site shows prices and booking" };
}
