// Gate 3: the free mockup (the page we build before anyone pays; the paid private "preview"
// comes after the $99). Fills the developer's funnel template (template/render.mjs) with the
// shop's real public facts and clearly labeled sample content. Always noindex, never shows
// invented reviews or claims, and is never the shop's live site until they buy.

import { mkdirSync, writeFileSync, cpSync, readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, basename } from "node:path";
import { hash } from "./lines.mjs";

const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const fill = (s, f) => String(s).replace(/\{(\w+)\}/g, (m, k) => f[k] ?? m);

// Unguessable but stable folder name, so a shop's mockup link never changes between runs.
export function mockupId(p, salt) {
  return `${slugify(p.shop) || "shop"}-${hash(`${salt}:${p.place_id}`).slice(0, 10)}`;
}

function pickServices(p, niche) {
  const listed = p.services.map(s => s.toLowerCase());
  const matched = niche.services.filter(s => listed.some(l => new RegExp(s.key, "i").test(l)));
  const chosen = matched.length >= 3 ? matched : [...matched, ...niche.services.filter(s => niche.defaultServiceKeys.includes(s.key) && !matched.includes(s))];
  return chosen.slice(0, 6).map(({ name, desc }) => ({ name, desc }));
}

// Sections built from niche defaults rather than the shop's data. Each must carry a visible
// "Sample" label; QA fails the mockup if one doesn't (checkMockup in qa.mjs).
export const SAMPLE_LABEL = /\bsample\b/i;

export function siteJson(p, facts, { niche, palettes, id, demoCtaHref }) {
  const f = { shop: p.shop, city: p.city, phone: p.phone, service: facts.service, Service: cap(facts.service) };
  const mobile = /mobile/i.test(`${p.raw_name} ${p.category} ${p.services.join(" ")}`);
  const hero = (mobile && niche.hero.mobile) || niche.hero.default;
  const palette = palettes[parseInt(hash(p.place_id).slice(8, 16), 16) % palettes.length];
  // Only the shop's own Google reviews, newest first when dated, never edited.
  const realReviews = p.reviews.filter(r => (r.stars ?? 5) >= 4 && r.text.length <= 400)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);
  const reviewsUrl = p.gbp_url || undefined;
  // Services the listing names are real; otherwise the niche's list, labeled as a sample.
  const realServices = p.services.slice(0, 6).map(name => ({ name, desc: "" }));
  const sampleSections = ["pricing", "work", "faq"].concat(realServices.length ? [] : ["services"]);

  const site = {
    slug: id,
    demo: true,
    demoLabel: "Free mockup",
    demoNote: `Made for ${p.shop} by GroundWork. Not published. Sections marked "sample" get your real details.`,
    demoCta: { label: "Make it mine", href: demoCtaHref },
    niche: niche.label,
    credit: true,
    business: {
      name: p.shop,
      tagline: `${cap(facts.service)} · ${p.city}, ${p.state}`,
      schemaType: niche.schemaType,
      phone: p.phone,
      sms: p.phone,
      hoursText: p.hours_text || "",
      address: { city: p.city, region: p.state, postal: p.zip || undefined },
      social: p.website_kind === "social" ? [/^https?:/i.test(p.website) ? p.website : "https://" + p.website] : [],
    },
    theme: palette,
    seo: {
      title: `${p.shop} | ${cap(facts.service)} in ${p.city}, ${p.state}`,
      description: `${p.shop}: ${facts.service} in ${p.city}, ${p.state}. Rated ${facts.rating} from ${facts.review_count} Google reviews.`.slice(0, 158),
    },
    hero: {
      eyebrow: `${p.city}, ${p.state}`,
      headline: fill(hero.headline, f),
      headlineEm: fill(hero.headlineEm, f),
      sub: fill(hero.sub, f),
      cta: niche.heroCta,
      caption: niche.heroCaption && fill(niche.heroCaption, f),
    },
    trust: [`${facts.rating}★ on Google`, `${facts.review_count} Google reviews`, `Based in ${p.city}, ${p.state}`],
    servicesHeadline: realServices.length ? `What ${p.shop} does` : "Sample services. Your real list goes here.",
    services: realServices.length ? realServices : pickServices(p, niche),
    pricing: niche.packages ? { headline: "Sample packages and prices", sub: "Your site shows your real packages and starting prices." } : undefined,
    packages: niche.packages,
    // No stock "how it works" steps: the booking section says it in one line.
    work: { headline: "Your work goes here", sub: "Sample images. Your own before and after photos go here.", compare: { caption: "" }, gallery: [{}, {}, {}].map(() => ({ caption: "" })) },
    // The rating badge always shows (real data); review cards only when the list gave real review text.
    // Google's attribution terms: "Reviews from Google", the reviewer's name exactly as Google gives it,
    // a link to the listing, and the review text unedited (long reviews are skipped, never trimmed).
    reviews: { headline: "Reviews from Google", source: "Google", url: reviewsUrl, real: true, rating: facts.rating, count: facts.review_count, sampleNote: "",
      items: realReviews.map(r => ({ name: r.name, detail: r.date ? ` · ${r.date}` : "", text: r.text, stars: r.stars ?? 5 })) },
    areas: { headline: `Based in ${p.city}`, body: "Your full service area goes here.", cities: [p.city], mapAlt: `Sketch of ${p.city}. Your real service area goes here.` },
    booking: { cta: niche.cta, eyebrow: niche.packages ? "Book" : "Quote", headline: niche.booking.headline, body: `Tell us what you need and ${p.shop} will get back to you.` },
    lead: { endpoint: "", submit: niche.booking.submit, notesHint: niche.booking.notesHint },
    faqHeadline: "Sample questions and answers",
    faq: niche.faq.map(x => ({ q: fill(x.q, f), a: fill(x.a, f) })),
    final: niche.final,
  };
  Object.defineProperty(site, "sampleSections", { value: sampleSections, enumerable: false });
  return site;
}

// A template is a folder with render.mjs (export render(site, { css })) plus optional funnel.css
// and funnel.js, like template/. New designs plug in with --template <dir>, per niche or per run.
// A design folder (clients/<demo>/ with site.json and design.css, built on template/) works too:
// the mockup takes its look (theme, fonts, hero layout, section order, hidden labels, design.css)
// and none of its content, since that demo's story, prices and route are another shop's facts.
export async function loadTemplate(dir) {
  const design = !existsSync(join(dir, "render.mjs")) && existsSync(join(dir, "site.json"));
  const base = design ? join(dir, "../../template") : dir;
  const { render } = await import(pathToFileURL(join(base, "render.mjs")).href);
  if (typeof render !== "function") throw new Error(`${base}/render.mjs doesn't export render()`);
  const read = f => existsSync(f) ? readFileSync(f, "utf8") : "";
  const css = read(join(base, "funnel.css"));
  const assets = ["funnel.js"].filter(f => existsSync(join(base, f))).map(f => join(base, f));
  if (!design) return { dir, render, css, assets };
  const d = JSON.parse(readFileSync(join(dir, "site.json"), "utf8"));
  const look = {
    theme: d.theme,
    // hero "type": no photo slot, since an empty box reads as a template (the owner's photos come later).
    layout: d.layout && { ...d.layout, hero: "type", order: (d.layout.order || []).filter(id => ["services", "pricing", "how", "work", "reviews", "areas", "book", "faq"].includes(id)) },
    eyebrows: Object.fromEntries(Object.entries(d.eyebrows || {}).filter(([, v]) => v === "")), // keep hidden labels only; wording is the demo's own
  };
  if (existsSync(join(dir, "fonts"))) assets.push(join(dir, "fonts"));
  return { dir, render, css, design: read(join(dir, "design.css")), look, assets };
}

// A hand-drawn map with one pin on the shop's city, in the design's own map style. Nothing else
// on it: the real route and towns come from the owner.
const xml = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const cityMap = city => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" class="route-map">
  <defs><filter id="rm-hand" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs>
  <g filter="url(#rm-hand)" fill="none" stroke-linecap="round"><path class="rm-1604" d="M300 40C430 42 548 112 552 214C556 318 440 384 300 386C160 388 46 320 48 212C50 110 170 38 300 40Z"/></g>
  <g class="rm-labels"><circle cx="300" cy="212" r="9" class="rm-dot"/><text x="300" y="256" text-anchor="middle" class="rm-town rm-home">${xml(city)}</text>
  <text x="300" y="300" text-anchor="middle" class="rm-note">Your route goes here</text></g>
</svg>`;

export function writeMockup(site, outDir, tpl, today) {
  site.builtAt = today;
  if (tpl.look) Object.assign(site, tpl.look);
  mkdirSync(outDir, { recursive: true });
  // CSS inlined like tools/build.mjs does, so the first screen paints without a second request.
  const html = tpl.render(site, { css: tpl.css, design: tpl.design || "", mapSvg: tpl.look ? cityMap(site.areas.cities[0]) : "" });
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
  for (const f of tpl.assets) cpSync(f, join(outDir, basename(f)), { recursive: true });
  return html;
}
