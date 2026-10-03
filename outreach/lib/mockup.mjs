// Gate 3: the free mockup (the page we build before anyone pays; the paid private "preview"
// comes after the $99). Fills the developer's funnel template (template/render.mjs) with the
// shop's real public facts and clearly labeled sample content. Always noindex, never shows
// invented reviews or claims, and is never the shop's live site until they buy.

import { mkdirSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "../../template/render.mjs";
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

export function siteJson(p, facts, { niche, palettes, id, demoCtaHref }) {
  const f = { shop: p.shop, city: p.city, phone: p.phone, service: facts.service, Service: cap(facts.service) };
  const mobile = /mobile/i.test(`${p.raw_name} ${p.category} ${p.services.join(" ")}`);
  const hero = (mobile && niche.hero.mobile) || niche.hero.default;
  const palette = palettes[parseInt(hash(p.place_id).slice(8, 16), 16) % palettes.length];
  // Only the shop's own Google reviews, newest first when dated, never edited.
  const realReviews = p.reviews.filter(r => (r.stars ?? 5) >= 4 && r.text.length <= 400)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);
  const reviewsUrl = p.gbp_url || undefined;
  const title = `${p.shop} | ${cap(facts.service)} in ${p.city}, ${p.state}`;

  return {
    slug: id,
    demo: true,
    demoLabel: `Mockup for ${p.shop}`,
    demoNote: "Made by GroundWork. Not published. Photos and prices are samples until you send yours.",
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
      title,
      description: `${p.shop}: ${facts.service} in ${p.city}, ${p.state}. Rated ${facts.rating} from ${facts.review_count} Google reviews.`.slice(0, 158),
    },
    hero: {
      eyebrow: `${p.city}, ${p.state}`,
      headline: fill(hero.headline, f),
      headlineEm: fill(hero.headlineEm, f),
      sub: fill(hero.sub, f),
      cta: niche.heroCta,
      proof: [{ value: `${facts.rating}★`, label: `${facts.review_count} Google reviews`, href: reviewsUrl }],
    },
    trust: [niche.packages ? "Prices shown up front" : "Fast quotes", "Request from your phone", `${facts.rating}★ on Google`],
    servicesHeadline: `What ${p.shop} does`,
    services: pickServices(p, niche),
    pricing: niche.pricing,
    packages: niche.packages,
    stepsHeadline: niche.packages ? "Booked in under a minute" : "How it works",
    steps: niche.steps,
    work: { headline: fill(niche.workHeadline, f), sub: "Your own before and after photos go here.", compare: { caption: "" }, gallery: [{}, {}, {}].map(() => ({ caption: "" })) },
    reviews: realReviews.length
      ? { headline: "What customers say", source: "Google", url: reviewsUrl, rating: facts.rating, count: facts.review_count, sampleNote: "Real reviews from your Google profile.", items: realReviews.map(r => ({ name: r.name.split(" ")[0], detail: r.date ? ` · ${r.date}` : "", text: r.text, stars: r.stars ?? 5 })) }
      : undefined,
    areas: { headline: `Serving ${p.city} and nearby`, body: "Your full service area goes here.", cities: [p.city] },
    booking: { cta: niche.cta, eyebrow: niche.packages ? "Book" : "Quote", headline: niche.booking.headline, body: `Tell us what you need and ${p.shop} will get back to you.` },
    lead: { endpoint: "", submit: niche.booking.submit, notesHint: niche.booking.notesHint },
    faq: niche.faq.map(x => ({ q: fill(x.q, f), a: fill(x.a, f) })),
    final: niche.final,
  };
}

export function writeMockup(site, outDir, templateDir, today) {
  site.builtAt = today;
  mkdirSync(outDir, { recursive: true });
  // CSS inlined like tools/build.mjs does, so the first screen paints without a second request.
  const html = render(site, { css: readFileSync(join(templateDir, "funnel.css"), "utf8") });
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
  cpSync(join(templateDir, "funnel.js"), join(outDir, "funnel.js"));
  return html;
}
