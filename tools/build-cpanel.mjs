#!/usr/bin/env node
// Build the copy of public/ that goes live on the cPanel host (tools/cpanel/README.md).
//   node tools/build-cpanel.mjs   writes _cpanel/ (site/, .cpanel.yml, deploy.sh)
// Each niche selling page gets its own subdomain (SUBDOMAINS below). The subdomains share
// public_html, and .htaccess maps detailing.groundwork-web.com/x to /auto-detailing/x, so only
// links and canonicals change here: inside a niche page, its own folder becomes "/" and every
// other page link points at the main host. Everywhere else, links to a niche folder point at
// its subdomain.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWork } from "./build-work.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_cpanel");
const site = join(out, "site");
const MAIN = "https://groundwork-web.com";
export const SUBDOMAINS = {
  detailing: "auto-detailing",
  exterior: "exterior-cleaning",
  landscaping: "landscaping",
  commercial: "commercial-cleaning",
  realestate: "real-estate",
};
// Paths a subdomain serves from the shared web root instead of sending to the main host.
const SHARED = ["assets", "api", "kit"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "public"), site, { recursive: true });
for (const f of ["deploy.sh", ".cpanel.yml"]) cpSync(join(root, "tools", "cpanel", f), join(out, f));
// Demos become the indexed /work/ portfolio on this host only (tools/build-work.mjs).
const { indexed } = buildWork({ root, site, MAIN, SUBDOMAINS, walk });

const live = Object.entries(SUBDOMAINS).filter(([, dir]) => existsSync(join(site, dir, "index.html")));
const subUrl = (sub) => `https://${sub}.groundwork-web.com`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function walk(dir, ext, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, acc);
    else if (extname(p) === ext) acc.push(p);
  }
  return acc;
}

function owner(file) {
  const rel = file.slice(site.length + 1);
  return live.find(([, dir]) => rel.startsWith(dir + "/"));
}

for (const file of walk(site, ".html")) {
  let html = readFileSync(file, "utf8");
  const own = owner(file);
  // Absolute URLs to a niche folder (canonical, og:url, schema) -> its subdomain.
  for (const [sub, dir] of live) html = html.replaceAll(`${MAIN}/${dir}/`, `${subUrl(sub)}/`);
  html = html.replace(/(href|action)="\/([^"]*)"/g, (m, attr, path) => {
    if (own) {
      const [, dir] = own;
      if (path === dir || path.startsWith(dir + "/")) return `${attr}="/${path.slice(dir.length + 1)}"`;
      if (SHARED.some((s) => path.startsWith(s + "/"))) return m;
    }
    for (const [sub, dir] of live) {
      if (path === dir || path.startsWith(dir + "/")) return `${attr}="${subUrl(sub)}/${path.slice(dir.length + 1)}"`;
    }
    return own ? `${attr}="${MAIN}/${path}"` : m;
  });
  writeFileSync(file, html);
}

const sitemap = join(site, "sitemap.xml");
let xml = readFileSync(sitemap, "utf8");
for (const [sub, dir] of live) xml = xml.replaceAll(`${MAIN}/${dir}/`, `${subUrl(sub)}/`);
writeFileSync(sitemap, xml);

// .htaccess: keep the host on the HTTPS redirect, then one block per subdomain.
const htPath = join(site, ".htaccess");
let ht = readFileSync(htPath, "utf8");
const httpsOld = `    RewriteCond %{HTTPS} !=on [OR]
    RewriteCond %{HTTP:X-Forwarded-Proto} =http [OR]
    RewriteCond %{HTTP_HOST} ^www\\. [NC]
    RewriteRule ^ https://groundwork-web.com%{REQUEST_URI} [L,R=301]`;
if (!ht.includes(httpsOld)) throw new Error("public/.htaccess HTTPS block changed; update build-cpanel.mjs");
const blocks = live.map(([sub, dir]) => {
  const host = `^${esc(sub)}\\.groundwork-web\\.com$`;
  return `
    # ${sub}.groundwork-web.com serves /${dir}/
    RewriteCond %{HTTP_HOST} ^groundwork-web\\.com$ [NC]
    RewriteRule ^${esc(dir)}(?:/(.*))?$ ${subUrl(sub)}/$1 [L,R=301]
    RewriteCond %{HTTP_HOST} ${host} [NC]
    RewriteCond %{THE_REQUEST} \\s/+${esc(dir)}(?:/(\\S*))?\\s
    RewriteRule ^ /%1 [L,R=301]
    RewriteCond %{HTTP_HOST} ${host} [NC]
    RewriteRule ^(?:${[...SHARED, esc(dir)].join("|")})/|^(?:robots\\.txt|sitemap\\.xml|favicon\\.ico|404\\.html)$ - [L]
    RewriteCond %{HTTP_HOST} ${host} [NC]
    RewriteCond %{DOCUMENT_ROOT}/${dir}/$1 -f [OR]
    RewriteCond %{DOCUMENT_ROOT}/${dir}/$1 -d
    RewriteRule ^(.*)$ ${dir}/$1 [L]
    RewriteCond %{HTTP_HOST} ${host} [NC]
    RewriteCond %{ENV:REDIRECT_STATUS} ^$
    RewriteRule ^(.*)$ ${MAIN}/$1 [L,R=301]`;
}).join("\n");
ht = ht.replace(httpsOld, `    RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]
    RewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]
    RewriteCond %{HTTPS} !=on [OR]
    RewriteCond %{HTTP:X-Forwarded-Proto} =http
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    # The demos moved to /work/ on the main host.
    RewriteRule ^demos(?:/(.*))?$ ${MAIN}/work/$1 [L,R=301]
${blocks}`);
writeFileSync(htPath, ht);

writeFileSync(join(out, "subdomains.txt"), live.map(([sub]) => sub).join("\n") + "\n");
console.log(`_cpanel/ built: ${live.map(([s, d]) => `${s} -> /${d}/`).join(", ")}; /work/ indexes ${indexed.map((w) => w.slug).join(", ")}`);
