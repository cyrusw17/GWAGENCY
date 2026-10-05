#!/usr/bin/env node
// Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) which pages changed, so they
// crawl them within days instead of waiting to find them. Bing's index also feeds ChatGPT search,
// Copilot, DuckDuckGo and Yahoo. Google does not use IndexNow; it reads the sitemap in Search Console.
// Run after a cPanel deploy, once the key file below is live at https://groundwork-web.com/<key>.txt.
//   node tools/indexnow.mjs            every URL in the live sitemap
//   node tools/indexnow.mjs /pricing/  only the paths given
const HOST = "groundwork-web.com";
const KEY = "da51d7770a81d4eb8da0828ad46e3113"; // public/<KEY>.txt holds the same string

const keyUrl = `https://${HOST}/${KEY}.txt`;
const live = await fetch(keyUrl).then((r) => (r.ok ? r.text() : ""));
if (live.trim() !== KEY) throw new Error(`${keyUrl} is not live yet; deploy first`);

let urls = process.argv.slice(2).map((p) => `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`);
if (!urls.length) {
  const xml = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList: urls }),
});
// 200 = accepted, 202 = accepted and the key is still being checked; anything else is an error.
console.log(`IndexNow: ${res.status} for ${urls.length} URLs`);
if (res.status >= 300) process.exit(1);
