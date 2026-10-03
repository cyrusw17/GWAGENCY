// Gate 3: the free preview site. Fills the developer's funnel template (template/render.mjs)
// with the shop's real public facts and clearly labeled sample content. Always a private,
// noindex demo: it is never published as the shop's site until they buy.

import { mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join } from "node:path";
import { render } from "../../template/render.mjs";
import { hash } from "./lines.mjs";

const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const fill = (s, f) => String(s).replace(/\{(\w+)\}/g, (m, k) => f[k] ?? m);

// Unguessable but stable folder name, so a shop's preview link never changes between runs.
export function previewId(p, salt) {
  return `${slugify(p.shop) || "shop"}-${hash(`${salt}:${p.place_id}`).slice(0, 10)}`;
}

function pickServices(p, niche) {
  const listed = p.services.map(s => s.toLowerCase());
  const matched = niche.services.filter(s => listed.some(l => new RegExp(s.key, "i").test(l)));
  const chosen = matched.length >= 3 ? matched : [...matched, ...niche.services.filter(s => niche.defaultServiceKeys.includes(s.key) && !matched.includes(s))];
  return chosen.slice(0, 6).map(({ name, desc }) => ({ name, desc }));
}

export function siteJson(p, facts, { niche, id, demoCtaHref }) {
  const f = { shop: p.shop, city: p.city, phone: p.phone };
  const mobile = /mobile/i.test(`${p.raw_name} ${p.category} ${p.services.join(" ")}`);
  const hero = niche.hero[mobile ? "mobile" : "shop"];
  const palette = niche.palettes[parseInt(hash(p.place_id).slice(8, 16), 16) % niche.palettes.length];
  const realReviews = p.reviews.filter(r => (r.stars ?? 5) >= 4 && r.text.length <= 400).slice(0, 3);
  const reviewsUrl = p.gbp_url || undefined;

  return {
    slug: id,
    demo: true,
    demoLabel: `Preview for ${p.shop}`,
    demoNote: "Made by GroundWork. Not published. Photos and prices are samples until you send yours.",
    demoCta: { label: "Make it mine", href: demoCtaHref },
    niche: "auto detailing",
    credit: true,
    business: {
      name: p.shop,
      tagline: `${mobile ? "Mobile detailing" : "Auto detailing"} · ${p.city}, ${p.state}`,
      schemaType: niche.schemaType,
      phone: p.phone,
      sms: p.phone,
      hoursText: p.hours_text || "",
      address: { city: p.city, region: p.state, postal: p.zip || undefined },
      social: p.website_kind === "social" ? [/^https?:/i.test(p.website) ? p.website : "https://" + p.website] : [],
    },
    theme: palette,
    seo: {
      title: `${p.shop} | ${mobile ? "Mobile Detailing" : "Auto Detailing"} in ${p.city}, ${p.state}`,
      description: `${p.shop}: ${facts.service} in ${p.city}, ${p.state}. Rated ${facts.rating} from ${facts.review_count} Google reviews. See prices and book online.`.slice(0, 158),
    },
    hero: {
      eyebrow: `${p.city}, ${p.state}`,
      headline: fill(hero.headline, f),
      headlineEm: fill(hero.headlineEm, f),
      sub: fill(hero.sub, f),
      cta: "See prices and book",
      proof: [{ value: `${facts.rating}★`, label: `${facts.review_count} Google reviews`, href: reviewsUrl }],
    },
    trust: ["Prices shown up front", "Book from your phone", `${facts.rating}★ on Google`],
    servicesHeadline: `What ${p.shop} does`,
    services: pickServices(p, niche),
    pricing: niche.pricing,
    packages: niche.packages,
    stepsHeadline: "Booked in under a minute",
    steps: niche.steps,
    work: { headline: `Recent jobs around ${p.city}`, sub: "Your own before and after photos go here.", compare: { caption: "" }, gallery: [{}, {}, {}].map(() => ({ caption: "" })) },
    reviews: realReviews.length
      ? { headline: "What customers say", source: "Google", url: reviewsUrl, rating: facts.rating, count: facts.review_count, sampleNote: "Real reviews from your Google profile.", items: realReviews.map(r => ({ name: r.name.split(" ")[0], text: r.text, stars: r.stars ?? 5 })) }
      : undefined,
    areas: { headline: `Serving ${p.city} and nearby`, body: "Your full service area goes here.", cities: [p.city] },
    booking: { cta: "Book now", eyebrow: "Book", headline: "Get your price and a time", body: `Tell us what you need and ${p.shop} will text you to confirm.` },
    lead: { endpoint: "", submit: "Text me a time", notesHint: "Vehicle, condition, best days" },
    faq: niche.faq.map(x => ({ q: fill(x.q, f), a: fill(x.a, f) })),
    final: { headline: "Your car, clean, this week.", sub: "Pick a package and we'll text you a time." },
  };
}

export function writePreview(site, outDir, templateDir, today) {
  site.builtAt = today;
  mkdirSync(outDir, { recursive: true });
  const html = render(site);
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
  for (const f of ["funnel.css", "funnel.js"]) cpSync(join(templateDir, f), join(outDir, f));
  return html;
}
