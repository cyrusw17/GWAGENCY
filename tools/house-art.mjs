#!/usr/bin/env node
// Drawn house pictures for real estate demos. Demos can't use a real listing's photos, and image
// hosts are blocked from the build environment, so each demo gets front-elevation illustrations:
// a house style, its colors, a sky and a yard. Every demo labels them as illustrations; a client's
// site uses their own listing photos.
//   node tools/house-art.mjs <spec.json> <out-dir>
// spec.json: [{ "file": "a.svg", "style": "craftsman", "body": "#..", "trim": "#..", "roof": "#..",
//   "door": "#..", "sky": "day|dusk|morning|overcast", "seed": 3, "trees": "oak|pine|palm|none" }]
// Styles: craftsman, victorian, ranch, colonial, farmhouse, modern, cottage, townhome, raised.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const W = 1200, H = 800, GROUND = 610;
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)))); return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); };

const SKY = {
  day: ["#9CC9E8", "#E4F1F8", "#FFF6D8"], morning: ["#F3C9A8", "#F8E3CF", "#FFF4E2"],
  dusk: ["#3E4C78", "#C9778A", "#F4B57E"], overcast: ["#B9C3C9", "#DCE1E3", "#EEF0EF"],
};

function sky(t, r) {
  const [a, b, c] = SKY[t] || SKY.day;
  const sun = t === "dusk" ? `<circle cx="${200 + r() * 800}" cy="470" r="60" fill="#FFD9A0" opacity=".85"/>` : t === "overcast" ? "" : `<circle cx="${900 + r() * 200}" cy="${110 + r() * 60}" r="46" fill="#FFF8E6" opacity=".9"/>`;
  const clouds = Array.from({ length: 3 }, () => { const x = r() * W, y = 60 + r() * 180, s = .6 + r() * .8; return `<g opacity="${t === "dusk" ? .25 : .7}" fill="#fff" transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="0" rx="80" ry="22"/><ellipse cx="40" cy="-14" rx="50" ry="24"/><ellipse cx="-40" cy="-8" rx="40" ry="18"/></g>`; }).join("");
  return `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".65" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FA05A"/><stop offset="1" stop-color="#5E7F42"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sk)"/>${sun}${clouds}`;
}

function tree(kind, x, s, r) {
  const g = shade("#4E6B3A", (r() - .5) * .25);
  if (kind === "pine") return `<g transform="translate(${x} ${GROUND}) scale(${s})"><rect x="-8" y="-40" width="16" height="40" fill="#5B4632"/><path d="M0-330L-70-120h40L-95 -40h190L30-120h40z" fill="${shade(g, -.2)}"/></g>`;
  if (kind === "palm") return `<g transform="translate(${x} ${GROUND}) scale(${s})"><path d="M-6 0C-2-120 10-220 4-300" stroke="#7A6248" stroke-width="16" fill="none"/>${[-60, -25, 15, 50, 85, 140, 175].map(a => `<path d="M4-300q${Math.cos(a * Math.PI / 180) * 80} ${Math.sin(a * Math.PI / 180) * 40 - 30} ${Math.cos(a * Math.PI / 180) * 150} ${Math.sin(a * Math.PI / 180) * 90 + 20}" stroke="${g}" stroke-width="14" fill="none" stroke-linecap="round"/>`).join("")}</g>`;
  if (kind === "oak") return `<g transform="translate(${x} ${GROUND}) scale(${s})"><path d="M-14 0l6-150-60-60 10-8 56 50 10-80 14 2-6 90 60-40 8 10-66 50 4 136z" fill="#5B4632"/><g fill="${g}" opacity=".95"><ellipse cx="-90" cy="-220" rx="110" ry="60"/><ellipse cx="60" cy="-250" rx="130" ry="70"/><ellipse cx="-10" cy="-290" rx="110" ry="60"/><ellipse cx="140" cy="-200" rx="80" ry="45"/></g><g fill="#A9B4A0" opacity=".55">${Array.from({ length: 6 }, (_, i) => `<path d="M${-120 + i * 45} -200q4 40 -2 70" stroke="#A9B4A0" stroke-width="4" fill="none"/>`).join("")}</g></g>`;
  return `<g transform="translate(${x} ${GROUND}) scale(${s})"><rect x="-9" y="-90" width="18" height="90" fill="#5B4632"/><circle cx="0" cy="-150" r="80" fill="${g}"/><circle cx="-50" cy="-110" r="50" fill="${shade(g, -.1)}"/><circle cx="50" cy="-115" r="55" fill="${shade(g, .08)}"/></g>`;
}

const win = (x, y, w, h, o, sh = true) => `<g>${sh ? `<rect x="${x - w * .32}" y="${y}" width="${w * .26}" height="${h}" fill="${o.shutter || shade(o.trim, -.55)}"/><rect x="${x + w + w * .06}" y="${y}" width="${w * .26}" height="${h}" fill="${o.shutter || shade(o.trim, -.55)}"/>` : ""}<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="${o.trim}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.glass}"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${o.trim}" stroke-width="5"/><rect x="${x - 10}" y="${y + h + 4}" width="${w + 20}" height="8" fill="${o.trim}"/></g>`;
const door = (x, y, w, h, o) => `<g><rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 8}" fill="${o.trim}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.door}"/><rect x="${x + w * .2}" y="${y + h * .12}" width="${w * .6}" height="${h * .25}" fill="${o.glass}" opacity=".8"/><circle cx="${x + w * .8}" cy="${y + h * .58}" r="5" fill="#E8C76A"/></g>`;
const bush = (x, w, c) => `<g fill="${c}"><ellipse cx="${x}" cy="${GROUND - 18}" rx="${w * .5}" ry="34"/><ellipse cx="${x + w * .4}" cy="${GROUND - 12}" rx="${w * .35}" ry="26" fill="${shade(c, .1)}"/><ellipse cx="${x - w * .4}" cy="${GROUND - 10}" rx="${w * .3}" ry="22" fill="${shade(c, -.1)}"/></g>`;
const steps = (x, w, n, c) => Array.from({ length: n }, (_, i) => `<rect x="${x - i * 8}" y="${GROUND - (n - i) * 14}" width="${w + i * 16}" height="14" fill="${shade(c, -i * .04)}"/>`).join("");

function house(o) {
  const r = rnd(o.seed || 7);
  o = { trim: "#F4F1EA", roof: "#4A4D52", door: "#7A2E2A", body: "#C9B79A", glass: "#33495C", ...o };
  const bodyD = shade(o.body, -.12), roofD = shade(o.roof, -.18);
  let g = "";
  const cx = 600;
  switch (o.style) {
    case "ranch": {
      const x = 230, w = 740, h = 170, y = GROUND - h;
      g += `<polygon points="${x - 50},${y} ${x + w + 50},${y} ${x + w - 60},${y - 110} ${x + 60},${y - 110}" fill="${o.roof}"/><rect x="${x - 50}" y="${y - 4}" width="${w + 100}" height="12" fill="${roofD}"/>`;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.body}"/>`;
      g += `<rect x="${x + 470}" y="${y + 40}" width="230" height="130" fill="${o.trim}"/>${Array.from({ length: 4 }, (_, i) => `<rect x="${x + 478}" y="${y + 50 + i * 30}" width="214" height="24" fill="${shade(o.trim, -.06)}"/>`).join("")}`;
      g += win(x + 60, y + 50, 110, 70, o) + win(x + 220, y + 50, 70, 70, o) + door(x + 350, y + 40, 70, 130, o);
      g += bush(x + 120, 160, "#577A41") + bush(x + 280, 90, "#4F7039");
      break;
    }
    case "modern": {
      const x = 250, y = GROUND - 330;
      g += `<rect x="${x}" y="${y + 140}" width="720" height="190" fill="${o.body}"/><rect x="${x + 260}" y="${y}" width="460" height="150" fill="${shade(o.body, .25)}"/><rect x="${x + 240}" y="${y - 14}" width="500" height="16" fill="${o.roof}"/><rect x="${x - 20}" y="${y + 126}" width="300" height="16" fill="${o.roof}"/>`;
      g += `<rect x="${x + 290}" y="${y + 30}" width="400" height="90" fill="${o.glass}"/>${[1, 2, 3].map(i => `<rect x="${x + 290 + i * 100 - 3}" y="${y + 30}" width="6" height="90" fill="${o.trim}"/>`).join("")}`;
      g += `<rect x="${x + 40}" y="${y + 180}" width="200" height="150" fill="${o.glass}"/><rect x="${x + 400}" y="${y + 180}" width="70" height="150" fill="${o.door}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${x + 520 + i * 22}" y="${y + 160}" width="12" height="170" fill="${shade(o.trim, -.3)}"/>`).join("")}`;
      g += `<rect x="${x + 520}" y="${GROUND - 6}" width="200" height="6" fill="#999"/>` + bush(x + 30, 110, "#6E8A55");
      break;
    }
    case "townhome": {
      const cols = [o.body, o.body2 || shade(o.body, .2), o.body3 || shade(o.body, -.15)];
      cols.forEach((c, i) => {
        const x = 190 + i * 280, y = GROUND - 380;
        g += `<rect x="${x}" y="${y}" width="270" height="380" fill="${c}"/><rect x="${x - 6}" y="${y - 20}" width="282" height="24" fill="${o.trim}"/><rect x="${x - 6}" y="${y - 30}" width="282" height="12" fill="${o.roof}"/>`;
        g += win(x + 40, y + 40, 70, 100, o, false) + win(x + 160, y + 40, 70, 100, o, false) + win(x + 40, y + 190, 70, 100, o, false);
        g += door(x + 165, y + 230, 66, 120, o) + steps(x + 160, 76, 2, "#B7AFA3");
      });
      break;
    }
    default: {
      // Two-story (or story-and-a-half) gable forms with variations.
      const two = !["cottage", "craftsman"].includes(o.style), raised = o.style === "raised";
      const x = 330, w = 540, base = raised ? 110 : 0, h = two ? 330 : 200, y = GROUND - h - base;
      if (raised) g += `<rect x="${x + 10}" y="${GROUND - base}" width="${w - 20}" height="${base}" fill="${shade("#C8BBA5", -.1)}"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${x + 30 + i * 90}" y="${GROUND - base + 20}" width="50" height="${base - 20}" fill="${shade("#C8BBA5", -.3)}"/>`).join("")}`;
      const pitch = o.style === "victorian" ? 230 : o.style === "farmhouse" ? 200 : o.style === "colonial" ? 120 : 150;
      if (o.style === "colonial" || raised) g += `<polygon points="${x - 30},${y} ${x + w + 30},${y} ${x + w - 80},${y - pitch} ${x + 80},${y - pitch}" fill="${o.roof}"/>`;
      else g += `<polygon points="${x - 30},${y} ${x + w + 30},${y} ${x + w / 2},${y - pitch}" fill="${o.roof}"/><polygon points="${x + 20},${y} ${x + w - 20},${y} ${x + w / 2},${y - pitch + 34}" fill="${bodyD}"/>`;
      if (o.style === "victorian") g += `<rect x="${x + w - 150}" y="${y - 120}" width="130" height="${h + 120}" fill="${shade(o.body, .08)}"/><polygon points="${x + w - 170},${y - 120} ${x + w},${y - 120} ${x + w - 85},${y - 260}" fill="${roofD}"/>` + win(x + w - 120, y - 70, 70, 100, o, false);
      if (o.chimney !== false) g += `<rect x="${x + 90}" y="${y - pitch * .7}" width="46" height="${pitch * .7}" fill="${o.chimneyColor || "#8E4B3A"}"/>`;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.body}"/>`;
      if (o.style === "farmhouse") g += Array.from({ length: Math.floor(w / 26) }, (_, i) => `<rect x="${x + 10 + i * 26}" y="${y}" width="3" height="${h}" fill="${bodyD}" opacity=".5"/>`).join("");
      else g += Array.from({ length: Math.floor(h / 18) }, (_, i) => `<rect x="${x}" y="${y + 9 + i * 18}" width="${w}" height="2" fill="${bodyD}" opacity=".35"/>`).join("");
      if (o.style === "craftsman" || o.style === "cottage") {
        g += `<polygon points="${x + w / 2 - 110},${y + 40} ${x + w / 2 + 110},${y + 40} ${x + w / 2},${y - 50}" fill="${roofD}"/>` + win(x + w / 2 - 50, y - 18, 100, 50, o, false);
      }
      const top = two ? y + 50 : null, low = y + (two ? 190 : 60);
      if (two) [x + 60, x + w / 2 - 35, x + w - 130].forEach(wx => g += win(wx, top, 70, 100, o, o.style !== "victorian"));
      g += win(x + 60, low, 80, 100, o, o.style === "colonial") + win(x + w - 140, low, 80, 100, o, o.style === "colonial");
      g += door(x + w / 2 - 36, GROUND - base - 140, 72, 140, o);
      const porch = ["craftsman", "farmhouse", "victorian", "raised", "cottage"].includes(o.style);
      if (porch) {
        const py = GROUND - base - 170, cols = o.style === "craftsman" ? [x + 20, x + w - 60] : [x + 10, x + 140, x + w - 160, x + w - 40];
        g += `<rect x="${x - 20}" y="${py - 20}" width="${w + 40}" height="22" fill="${roofD}"/>`;
        cols.forEach(c => g += o.style === "craftsman" ? `<path d="M${c} ${GROUND - base}h40l-8-${170 - 30}h-24z" fill="${o.trim}"/><rect x="${c - 6}" y="${GROUND - base - 60}" width="52" height="60" fill="#8B6E58"/>` : `<rect x="${c}" y="${py}" width="16" height="${170}" fill="${o.trim}"/>`);
        g += `<rect x="${x - 10}" y="${GROUND - base - 54}" width="${w / 2 - 50}" height="6" fill="${o.trim}"/><rect x="${x + w / 2 + 60}" y="${GROUND - base - 54}" width="${w / 2 - 50}" height="6" fill="${o.trim}"/>`;
        g += Array.from({ length: 16 }, (_, i) => { const bx = i < 8 ? x - 4 + i * ((w / 2 - 60) / 8) : x + w / 2 + 64 + (i - 8) * ((w / 2 - 60) / 8); return `<rect x="${bx}" y="${GROUND - base - 50}" width="4" height="50" fill="${o.trim}"/>`; }).join("");
      }
      g += raised ? `<rect x="${x + w / 2 - 50}" y="${GROUND - base}" width="100" height="${base}" fill="${shade("#B9AD97", .05)}"/>` + steps(x + w / 2 - 50, 100, 7, "#B9AD97") : steps(x + w / 2 - 44, 88, 2, "#B7AFA3");
      g += bush(x + 30, 130, "#577A41") + bush(x + w - 30, 140, "#4F7039");
    }
  }
  const t = o.trees || "round";
  const trees = t === "none" ? "" : tree(t, 110 + r() * 40, .9 + r() * .3, r) + tree(t, 1090 - r() * 40, .8 + r() * .3, r);
  const walk = o.style === "townhome" ? "" : `<polygon points="${cx - 40},${GROUND} ${cx + 40},${GROUND} ${cx + 90},${H} ${cx - 90},${H}" fill="#D6CCBA"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${sky(o.sky, r)}${trees}<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#gr)"/>${walk}${g}<rect y="${GROUND - 2}" width="${W}" height="4" fill="#4C6B36" opacity=".4"/></svg>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [spec, out] = process.argv.slice(2);
  if (!spec || !out) { console.error("usage: node tools/house-art.mjs <spec.json> <out-dir>"); process.exit(2); }
  mkdirSync(out, { recursive: true });
  for (const s of JSON.parse(readFileSync(spec, "utf8"))) { writeFileSync(join(out, s.file), house(s)); console.log("  drew", s.file); }
}
export { house };
