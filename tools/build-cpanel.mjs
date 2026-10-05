#!/usr/bin/env node
// Build the copy of public/ that goes live on the cPanel host (tools/cpanel/README.md).
//   node tools/build-cpanel.mjs   writes _cpanel/ (site/, .cpanel.yml, deploy.sh)
// Every page lives in its own folder on groundwork-web.com (no subdomains), so public/ ships
// as-is apart from the demos, which become the indexed /work/ portfolio (tools/build-work.mjs).
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWork } from "./build-work.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_cpanel");
const site = join(out, "site");
const MAIN = "https://groundwork-web.com";

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "public"), site, { recursive: true });
for (const f of ["deploy.sh", ".cpanel.yml"]) cpSync(join(root, "tools", "cpanel", f), join(out, f));
// Demos become the indexed /work/ portfolio on this host only (tools/build-work.mjs).
const { indexed } = buildWork({ root, site, MAIN, walk });

function walk(dir, ext, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, acc);
    else if (extname(p) === ext) acc.push(p);
  }
  return acc;
}

// .htaccess: the demos moved to /work/.
const htPath = join(site, ".htaccess");
let ht = readFileSync(htPath, "utf8");
const httpsRule = "    RewriteRule ^ https://groundwork-web.com%{REQUEST_URI} [L,R=301]";
if (!ht.includes(httpsRule)) throw new Error("public/.htaccess HTTPS block changed; update build-cpanel.mjs");
ht = ht.replace(httpsRule, `${httpsRule}
    RewriteRule ^demos(?:/(.*))?$ /work/$1 [L,R=301]`);
writeFileSync(htPath, ht);

console.log(`_cpanel/ built; /work/ indexes ${indexed.map((w) => w.slug).join(", ")}`);
