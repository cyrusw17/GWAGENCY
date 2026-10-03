// Checks a prospect's existing website for the flaws the has-site sequences may name. A flaw is
// only reported when we actually looked and didn't find the thing: any fetch error, or a page
// whose content only appears after JavaScript runs, returns "unverified", and QA drops it.
//
// Flaws: no_booking, no_prices, no_quote, no_photos, no_reviews, no_tap_to_call, no_services,
// slow_mobile (needs a PageSpeed key). Each niche picks which ones it uses and in what order.

const BOOKING_WIDGETS = /(square\.site|squareup\.com\/appointments|book\.squareup|booksy\.com|calendly\.com|acuityscheduling|setmore\.com|vagaro\.com|urable\.com|mobile-tech\.app|mobiletechrx|housecallpro|getjobber|jobber\.com|schedulicity|simplybook|appointy|fresha\.com|glossgenius|orderly|youcanbook\.me|google\.com\/calendar\/appointments|calendar\.app\.google|tidycal|zcal|bookeo|checkfront|servicetitan|detailbook|detail\.bot|markate|workiz|servicem8|yardbook|lawnpro|responsibid|quotes\.)/i;
const REVIEW_WIDGETS = /(elfsight|trustindex|embedsocial|birdeye|podium|reviewsonmywebsite|grade\.us|nicejob|broadly|shapo|widget\.trustpilot|featurable|sociablekit|google-reviews|wpreviewslider|wp-google-reviews|ti-widget)/i;
const BOOK_WORDS = /\b(book( now| online| an? appointment| your)?|schedule( now| online| (an? )?appointment)?|request (a |an )?(quote|appointment|time|estimate)|get (a |your )?(free )?(quote|estimate)|reserve)\b/i;
// "$149", "$ 99.00", or "starting at 149" / "from 99" without the dollar sign.
const PRICE = /\$\s?\d{2,5}(?:\.\d{2})?\b|\b(?:starting at|starts at|from|only)\s+\$?\d{2,5}\b/i;
const MORE_PAGES = /(price|pricing|service|package|menu|rates|book|detail|quote|estimate|contact|gallery|photo|portfolio|our-work|review|testimonial)/i;
const MIN_TEXT = 300; // less visible text than this usually means the page is built by JavaScript

export const visibleText = html => String(html)
  .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#36;|&dollar;/g, "$")
  .replace(/\s+/g, " ");

const hasForm = html => [...html.matchAll(/<form[\s\S]*?<\/form>/gi)]
  .some(m => /(type=["']?(tel|email)|name=["']?[^"'\s>]*(phone|email|tel)[^"'\s>]*)/i.test(m[0]));

// A link to a booking page ("/book", "?schedule"), but not facebook.com, which also contains "book".
const bookingLink = html => [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
  .some(m => !/facebook|fb\.com|ebook|bookmark/i.test(m[1]) && /(^|[\/?#=_-])(book|booking|schedule|appointments?)([\/?#=_.-]|$)/i.test(m[1]));

// Real photos, not logos, icons or tracking pixels. Lazy-loaders put the URL in data-src.
function photos(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = (tag.match(/\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1] || "";
    if (!src || /^data:|\.svg(\?|$)|logo|icon|favicon|pixel|sprite|badge|avatar|spacer/i.test(src + " " + tag)) continue;
    const w = Number((tag.match(/\bwidth=["']?(\d+)/i) || [])[1] || 0);
    if (w && w < 120) continue;
    urls.add(src.split("?")[0]);
  }
  for (const m of html.matchAll(/background-image:\s*url\(["']?([^"')]+\.(?:jpe?g|png|webp)[^"')]*)/gi)) urls.add(m[1].split("?")[0]);
  return urls;
}

export function inspectPage(html, serviceWords = []) {
  const text = visibleText(html);
  const lower = text.toLowerCase();
  const year = (text.match(/(?:©|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i) || [])[1];
  return {
    textLength: text.length,
    prices: PRICE.test(text),
    booking: BOOKING_WIDGETS.test(html) || (hasForm(html) && BOOK_WORDS.test(text)) || bookingLink(html),
    quote: hasForm(html) || BOOKING_WIDGETS.test(html),
    tel: /href=["']\s*tel:/i.test(html),
    reviews: REVIEW_WIDGETS.test(html) || /\b(reviews?|testimonials?)\b/i.test(text) || /★{3,}/.test(text),
    photos: photos(html),
    services: new Set(serviceWords.filter(w => lower.includes(w.toLowerCase()))),
    copyrightYear: year ? Number(year) : null,
  };
}

function internalLinks(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname === base.hostname && u.href.split("#")[0] !== base.href && (MORE_PAGES.test(u.pathname) || MORE_PAGES.test(visibleText(m[2])))) out.add(u.href.split("#")[0]);
    } catch { /* ignore bad href */ }
  }
  return [...out].slice(0, 4);
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

const ABSENT = {
  no_booking: f => !f.booking,
  no_prices: f => !f.prices,
  no_quote: f => !f.quote && !f.booking,
  no_photos: f => f.photos.size < 3,
  no_reviews: f => !f.reviews,
  no_tap_to_call: f => !f.tel,
  no_services: f => f.services.size < 2,
};
const DETAIL = {
  no_booking: "no booking widget, booking form or booking link",
  no_prices: "no prices or \"starting at\" figures",
  no_quote: "no quote form or booking tool",
  no_photos: "fewer than 3 photos",
  no_reviews: "no reviews section, widget or testimonials",
  no_tap_to_call: "no tap-to-call (tel:) link",
  no_services: "fewer than 2 of the niche's services named",
};

// Returns { status: "checked" | "unverified", flaw, detail, oldCopyright }
export async function checkSite(website, { fetchImpl = globalThis.fetch, timeoutMs = 10000, psiKey = "", flawOrder = ["no_booking", "no_prices", "slow_mobile"], serviceWords = [], year = new Date().getFullYear() } = {}) {
  let start;
  try { start = new URL(/^https?:\/\//i.test(website) ? website : "https://" + website); }
  catch { return { status: "unverified", flaw: null, detail: "bad URL" }; }
  let home;
  try { home = await get(fetchImpl, start.href, timeoutMs); }
  catch (e) { return { status: "unverified", flaw: null, detail: `could not load site (${e.message})` }; }

  const f = inspectPage(home.html, serviceWords);
  if (f.textLength < MIN_TEXT) return { status: "unverified", flaw: null, detail: "homepage content loads by JavaScript; can't check it without a browser" };
  const pages = [home.url];
  // What's missing on the homepage is often on a services, gallery or contact page; read those before claiming a flaw.
  for (const link of internalLinks(home.html, new URL(home.url))) {
    if (!flawOrder.some(k => ABSENT[k]?.(f))) break;
    try {
      const page = inspectPage((await get(fetchImpl, link, timeoutMs)).html, serviceWords);
      for (const k of ["prices", "booking", "quote", "tel", "reviews"]) f[k] ||= page[k];
      page.photos.forEach(p => f.photos.add(p)); page.services.forEach(s => f.services.add(s));
      pages.push(link);
    } catch { return { status: "unverified", flaw: null, detail: `could not load ${link}` }; }
  }
  const oldCopyright = f.copyrightYear && f.copyrightYear < year - 1 ? f.copyrightYear : null;
  const on = `on ${pages.length} page(s)`;

  for (const k of flawOrder) {
    if (k === "slow_mobile") {
      if (!psiKey) continue;
      try {
        const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&key=${encodeURIComponent(psiKey)}&url=${encodeURIComponent(home.url)}`;
        const score = Math.round(((await (await fetchImpl(api)).json())?.lighthouseResult?.categories?.performance?.score ?? NaN) * 100);
        if (score < 50) return { status: "checked", flaw: k, detail: `PageSpeed mobile score ${score}`, oldCopyright };
      } catch { /* speed unknown: never claim it */ }
      continue;
    }
    if (ABSENT[k](f)) return { status: "checked", flaw: k, detail: `${DETAIL[k]} ${on}`, oldCopyright };
  }
  return { status: "checked", flaw: null, detail: `no flaw found ${on}`, oldCopyright };
}
