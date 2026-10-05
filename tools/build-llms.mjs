#!/usr/bin/env node
// Writes public/llms.txt (the llmstxt.org format): what GroundWork-Web does, the offer, and a link plus
// one-line summary for every indexable selling page, blog post and guide, read from each page's
// <title> and meta description. Run after tools/build-blog.mjs or after editing a page title.
//   node tools/build-llms.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pub = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "public");
const MAIN = "https://groundwork-web.com";
const TRADES = ["auto-detailing", "exterior-cleaning", "landscaping", "commercial-cleaning", "real-estate"];
const OTHER = ["pricing", "before-you-pay", "site-check", "guides/get-found-on-google", "privacy"];
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function line(path) {
  const t = readFileSync(join(pub, path, "index.html"), "utf8");
  if (/name="robots" content="[^"]*noindex/.test(t)) return null;
  const title = t.match(/<title>([^<]*?)(?: \| GroundWork-Web)?<\/title>/)[1];
  const desc = t.match(/name="description" content="([^"]*)"/)[1];
  return `- [${unesc(title)}](${MAIN}/${path}/): ${unesc(desc)}`;
}
const posts = TRADES.flatMap((p) => existsSync(join(pub, p, "blog"))
  ? readdirSync(join(pub, p, "blog"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `${p}/blog/${d.name}`).sort()
  : []);

const out = `# GroundWork-Web

> GroundWork-Web designs, builds and hosts websites for local service businesses in the United States: auto detailers, pressure washing and soft washing companies, lawn care and landscaping crews, commercial cleaning and janitorial companies, and real estate agents. Based in Deer Park, Texas. Contact: groundworkweb@proton.me.

How it works: the owner pays $99 to start, we build the whole site and send a private preview, and the owner pays the rest only after approving it. The $99 is refunded if they pass on the preview. The founding price for the first 25 clients is $399 all in. Hosting is $99 a month. The owner owns the domain. Sample designs on this site are for fictional businesses and are labeled as samples.

## Website design by trade

${TRADES.map(line).filter(Boolean).join("\n")}

## Guides

${posts.map(line).filter(Boolean).join("\n")}

## Other pages

${OTHER.map(line).filter(Boolean).join("\n")}
`;
writeFileSync(join(pub, "llms.txt"), out);
console.log(`llms.txt: ${out.split("\n").filter((l) => l.startsWith("- [")).length} links`);
