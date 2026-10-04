/* porch layout behavior: the 3D house you turn and wash (Zdog), the live strip and sky on Mount Pleasant
   time, the pressure dial, and the spotlight on cards. funnel.js keeps tracking and the quote form.
   All of it is decoration on a page that already works without it. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body, paused = still;
  var pauseBtn = document.querySelector("[data-pause]");
  var onPause = [];
  if (pauseBtn) {
    if (still) { pauseBtn.setAttribute("aria-pressed", "true"); body.classList.add("paused"); }
    pauseBtn.addEventListener("click", function () {
      paused = pauseBtn.getAttribute("aria-pressed") !== "true";
      pauseBtn.setAttribute("aria-pressed", String(paused)); body.classList.toggle("paused", paused);
      onPause.forEach(function (f) { f(paused); });
    });
  }

  function hex(c) { c = c.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return "#" + x.map(function (v, i) { return ("0" + Math.round(v + (y[i] - v) * t).toString(16)).slice(-2); }).join(""); }

  /* ---------- the house ---------- */
  var cv = document.querySelector("[data-house]");
  if (cv && window.Zdog) (function () {
    var Z = window.Zdog, TAU = Z.TAU, washes = [];
    var clean = "#F6F2EA", cleanShade = "#E2DCCF", grime = "#9DA584", grimeShade = "#7F8A6A";
    var roofClean = "#6F7A80", roofDirty = "#2C302B", haint = "#8FD3CF", trim = "#FFFDF8", shutter = "#2E4A3A", pile = "#5B4A3A";
    // The slow turn is for big screens; on a phone the house waits for a finger, which keeps the page quick.
    var wide = matchMedia("(min-width: 900px)").matches, dragged = false;
    var spinning = !paused && wide, visible = true, looping = false, turned = 0;
    // Size from the column, not the canvas: Zdog pins the canvas width in pixels, so it would never shrink back.
    var fit = function () { return Math.min(cv.parentNode.getBoundingClientRect().width, 520); };
    var box = { width: fit() }; box.height = box.width * 440 / 520;
    var illo = new Z.Illustration({ element: cv, zoom: box.width / 270, rotate: { x: -0.24, y: -0.6 }, dragRotate: true,
      onDragStart: function () { spinning = false; dragged = true; }, onDragMove: function () { draw(); } });
    illo.setSize(Math.round(box.width), Math.round(box.height));
    addEventListener("resize", function () { var w = fit(); if (!w) return; illo.setSize(Math.round(w), Math.round(w * 440 / 520)); illo.zoom = w / 270; draw(); });
    var house = new Z.Anchor({ addTo: illo, translate: { y: 6 } });
    // washable: a shape that goes from dirty to clean as the slider moves
    function wash(shape, dirty, cleanC) { washes.push({ s: shape, d: dirty, c: cleanC }); shape.color = dirty; return shape; }
    function wall(o, dirty, cleanC) { return wash(new Z.Rect(Object.assign({ addTo: house, stroke: 2, fill: true }, o)), dirty, cleanC); }

    // pilings: the house sits up on them, the way it does near the marsh
    [[-66, 38], [0, 38], [66, 38], [-66, -38], [0, -38], [66, -38], [-66, 72], [66, 72]].forEach(function (p) {
      new Z.Box({ addTo: house, width: 7, height: 34, depth: 7, translate: { x: p[0], y: 44, z: p[1] }, color: pile, stroke: false });
    });
    // walls (front and back are long; the left one is the shaded north wall that grows mildew)
    wall({ width: 150, height: 58, translate: { z: 45 } }, mix(grime, clean, .35), clean);
    wall({ width: 150, height: 58, translate: { z: -45 } }, grimeShade, cleanShade);
    wall({ width: 90, height: 58, translate: { x: -75 }, rotate: { y: TAU / 4 } }, grimeShade, cleanShade);
    wall({ width: 90, height: 58, translate: { x: 75 }, rotate: { y: TAU / 4 } }, mix(grime, clean, .5), clean);
    // gable ends
    [-75, 75].forEach(function (x) {
      wash(new Z.Shape({ addTo: house, path: [{ x: x, y: -29, z: -45 }, { x: x, y: -66, z: 0 }, { x: x, y: -29, z: 45 }], stroke: 2, fill: true }), x < 0 ? grimeShade : grime, x < 0 ? cleanShade : clean);
    });
    // floor under the house
    new Z.Rect({ addTo: house, width: 150, height: 90, translate: { y: 29 }, rotate: { x: TAU / 4 }, stroke: 2, fill: true, color: "#4A3E33" });
    // main roof: two slopes, with algae streaks that wash off
    [1, -1].forEach(function (side) {
      wash(new Z.Shape({ addTo: house, path: [{ x: -82, y: -68, z: 0 }, { x: 82, y: -68, z: 0 }, { x: 82, y: -26, z: 52 * side }, { x: -82, y: -26, z: 52 * side }], stroke: 3, fill: true }), roofDirty, roofClean);
      [-62, -44, -20, 6, 34, 52, 66].forEach(function (x, i) {
        wash(new Z.Shape({ addTo: house, path: [{ x: x, y: -62 + (i % 3) * 4, z: (7 + (i % 3) * 4) * side }, { x: x + 2, y: -29, z: 49 * side }], stroke: 2 + (i % 2) }), "#1B1E1A", roofClean);
      });
    });
    // porch across the front: deck, posts, rail, the haint blue ceiling, a low roof
    new Z.Box({ addTo: house, width: 150, height: 4, depth: 30, translate: { y: 29, z: 61 }, color: "#B9A88E", stroke: false });
    [-72, -24, 24, 72].forEach(function (x) { new Z.Box({ addTo: house, width: 4, height: 56, depth: 4, translate: { x: x, y: 0, z: 74 }, color: trim, stroke: false }); });
    new Z.Shape({ addTo: house, path: [{ x: -74, y: 14, z: 75 }, { x: -12, y: 14, z: 75 }], stroke: 2.5, color: trim });
    new Z.Shape({ addTo: house, path: [{ x: 12, y: 14, z: 75 }, { x: 74, y: 14, z: 75 }], stroke: 2.5, color: trim });
    new Z.Rect({ addTo: house, width: 150, height: 31, translate: { y: -27, z: 61 }, rotate: { x: TAU / 4 }, stroke: 1, fill: true, color: haint });
    wash(new Z.Shape({ addTo: house, path: [{ x: -80, y: -36, z: 44 }, { x: 80, y: -36, z: 44 }, { x: 80, y: -26, z: 80 }, { x: -80, y: -26, z: 80 }], stroke: 2, fill: true }), roofDirty, roofClean);
    // steps down from the porch
    [0, 1, 2].forEach(function (i) { new Z.Box({ addTo: house, width: 22, height: 4, depth: 7, translate: { y: 35 + i * 9, z: 80 + i * 7 }, color: "#B9A88E", stroke: false }); });
    // windows with shutters, and the door
    [-50, 50].forEach(function (x) {
      new Z.Rect({ addTo: house, width: 18, height: 26, translate: { x: x, y: -4, z: 46 }, stroke: 2, fill: true, color: "#2B4B63" });
      new Z.Rect({ addTo: house, width: 18, height: 26, translate: { x: x, y: -4, z: 46.5 }, stroke: 2, color: trim });
      [-14, 14].forEach(function (d) { new Z.Rect({ addTo: house, width: 7, height: 26, translate: { x: x + d, y: -4, z: 46 }, stroke: 1, fill: true, color: shutter }); });
    });
    new Z.Rect({ addTo: house, width: 18, height: 34, translate: { y: 8, z: 46 }, stroke: 2, fill: true, color: shutter });
    new Z.Rect({ addTo: house, width: 12, height: 26, translate: { x: -50, y: -4, z: -46 }, stroke: 2, fill: true, color: "#2B4B63" });
    // mildew on the shaded north wall and low on the front, the part that washes away
    [[-76, -10, 20, 26], [-76, 14, -18, 30], [-76, -18, -28, 16]].forEach(function (m) {
      wash(new Z.Ellipse({ addTo: house, width: m[3], height: m[3] * .7, translate: { x: m[0] - .5, y: m[1], z: m[2] }, rotate: { y: TAU / 4 }, stroke: 4, fill: true }), "#5E7B3A", cleanShade);
    });
    [[-24, 22], [30, 20], [64, 24]].forEach(function (m) {
      wash(new Z.Ellipse({ addTo: house, width: 22, height: 10, translate: { x: m[0], y: m[1], z: 45.5 }, stroke: 3, fill: true }), "#6E8A49", clean);
    });

    function draw() { illo.updateRenderGraph(); }
    var range = document.querySelector("[data-wash]");
    function setWash() {
      var t = range ? Number(range.value) / 100 : 0;
      washes.forEach(function (w) { w.s.color = mix(w.d, w.c, t); });
      draw();
    }
    if (range) range.addEventListener("input", setWash);
    setWash();
    function tick() {
      if (!spinning || !visible) { looping = false; return; }
      illo.rotate.y += 0.005; draw();
      if ((turned += 0.005) >= TAU) { spinning = false; looping = false; return; } // one slow turn, then it rests
      requestAnimationFrame(tick);
    }
    function go() { if (spinning && visible && !looping && !paused) { looping = true; requestAnimationFrame(tick); } }
    addEventListener("load", function () { setTimeout(go, 1500); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; go(); }).observe(cv);
    onPause.push(function (p) { spinning = !p && wide && !dragged; if (spinning) turned = 0; go(); });
    cv.tabIndex = 0;
    cv.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault(); spinning = false; dragged = true; illo.rotate.y += e.key === "ArrowLeft" ? -0.2 : 0.2; draw();
    });
  })();

  /* ---------- live: the clock, open now, tonight's sunset and the sky, on Mount Pleasant time ---------- */
  var liveEl = document.getElementById("live"), L = {};
  try { L = JSON.parse(liveEl.textContent); } catch (_) {}
  var tz = L.tz || "America/New_York", now = new Date();
  function fmt(d, o) { return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: tz }, o)).format(d); }
  function parts(d) { var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); return p; }
  var P = parts(now), mins = Number(P.hour) * 60 + Number(P.minute);
  var clock = document.querySelector("[data-clock]");
  function tickClock() { if (clock) clock.textContent = fmt(new Date(), { hour: "numeric", minute: "2-digit" }).toLowerCase(); }
  tickClock(); setInterval(tickClock, 30000);
  var openEl = document.querySelector("[data-open]");
  if (openEl && L.hours && L.hours.length) {
    var today = (L.hours || []).find(function (h) { return h.days.indexOf(P.weekday) > -1; });
    var hm = function (s) { var a = s.split(":"); return a[0] * 60 + Number(a[1]); };
    var t12 = function (s) { var h = Number(s.split(":")[0]), m = s.split(":")[1]; return (h % 12 || 12) + (m === "00" ? "" : ":" + m) + (h < 12 ? " am" : " pm"); };
    if (today && mins >= hm(today.opens) && mins < hm(today.closes)) { openEl.textContent = "Open now. Crews out until " + t12(today.closes) + "."; openEl.classList.add("is-open"); }
    else openEl.textContent = "Closed right now. Text anytime and " + (L.owner || "we") + " will reply when we open.";
  }
  // Sunset from the sunrise equation (good to a couple of minutes, plenty for "crews pack up before dark").
  // n is the local calendar day (days since J2000 noon), so the answer is today's sunset all day long.
  function sun(d, lat, lon) {
    var ymd = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).forEach(function (x) { ymd[x.type] = Number(x.value); });
    var rad = Math.PI / 180, n = Math.round(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12) / 864e5 + 2440587.5 - 2451545), Js = n - lon / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360, C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var lam = (M + C + 282.9372) % 360, Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lam * rad);
    var dec = Math.asin(Math.sin(lam * rad) * Math.sin(23.4397 * rad));
    var w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec))) / rad;
    var ms = function (j) { return new Date((j - 2440587.5) * 864e5); };
    return { rise: ms(Jt - w / 360), set: ms(Jt + w / 360) };
  }
  if (L.lat != null) {
    var st = sun(now, L.lat, L.lon), ss = document.querySelector("[data-sunset]");
    if (ss) ss.textContent = fmt(st.set, { hour: "numeric", minute: "2-digit" }).toLowerCase();
    var toSet = (st.set - now) / 6e4, sinceRise = (now - st.rise) / 6e4;
    var sky = sinceRise < -30 || toSet < -40 ? "night" : toSet < 25 ? "dusk" : toSet < 100 || sinceRise < 60 ? "golden" : "day";
    var hero = document.querySelector("[data-sky]"); if (hero) hero.setAttribute("data-sky", sky);
  }
  var mi = Number(P.month) - 1, m = L.months && L.months[mi];
  if (m) {
    var mn = document.querySelector("[data-month-name]"), mt = document.querySelector("[data-month-note]");
    if (mn) mn.textContent = fmt(now, { month: "long" });
    if (mt) mt.textContent = m.note;
    document.querySelectorAll(".pc-months li").forEach(function (li, i) { li.classList.toggle("now", i === mi); });
  }

  /* ---------- the pressure dial ---------- */
  var dial = document.querySelector("[data-dial]"), psi = document.querySelector("[data-psi]");
  if (dial && psi) {
    var out = dial.querySelector("[data-psi-out]"), says = dial.querySelectorAll("[data-psi-at]");
    var show = function () {
      var v = Number(psi.value), pick = says[0];
      dial.style.setProperty("--p", (v / Number(psi.max)).toFixed(3));
      out.textContent = v.toLocaleString("en-US");
      says.forEach(function (li) { if (v >= Number(li.getAttribute("data-psi-at"))) pick = li; });
      says.forEach(function (li) { li.classList.toggle("on", li === pick); });
    };
    psi.addEventListener("input", show); show();
  }

  /* ---------- spotlight on cards: the light follows a mouse, never a finger ---------- */
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !still) {
    document.querySelectorAll("[data-spot]").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }
})();
