/* lawn-season behavior: the month strip (grass, height and this month's plan), the ZIP route checker
   with the next visit date, and the 3D yard (Zdog). Zdog loads only after the page has painted and the
   yard is on screen, so it never holds up the first view. The mower only runs by itself on wide
   screens with motion allowed; "Pause motion" stops it, and reduced-motion visitors start paused.
   funnel.js keeps tracking and the quote form. Everything here is extra: the page works without it. */
(function () {
  "use strict";
  var root = document.documentElement, body = document.body;
  body.classList.remove("no-js");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = matchMedia("(min-width: 960px)").matches;
  var paused = reduce, onPause = [];
  var pauseBtn = document.querySelector("[data-pause]");
  if (pauseBtn) {
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.addEventListener("click", function () {
      paused = pauseBtn.getAttribute("aria-pressed") !== "true";
      pauseBtn.setAttribute("aria-pressed", String(paused));
      onPause.forEach(function (f) { f(paused); });
    });
  }

  // Today on Dublin time (the crew's clock, not the visitor's).
  function ohio() {
    var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
    var g = function (t) { return Number(p.filter(function (x) { return x.type === t; })[0].value); };
    return new Date(Date.UTC(g("year"), g("month") - 1, g("day")));
  }
  var today = ohio();

  /* ---------- months ---------- */
  var year = [];
  try { year = JSON.parse(document.getElementById("year-data").textContent); } catch (_) {}
  var monthBtns = [].slice.call(document.querySelectorAll("[data-month]"));
  var $ = function (sel) { return document.querySelector(sel); };
  var planBtn = $("[data-plan-pick]"), setSeason = function () {};
  var cutRows = [].slice.call(document.querySelectorAll(".cut-rows li"));
  function pick(i) {
    var m = year[i]; if (!m) return;
    monthBtns.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
    $("[data-plan-month]").textContent = m.m;
    $("[data-today]").hidden = i !== today.getUTCMonth();
    $("[data-plan-line]").textContent = m.line;
    $("[data-plan-offer]").textContent = m.offer;
    $("[data-plan-price]").textContent = m.price;
    $("[data-plan-unit]").textContent = m.unit;
    if (planBtn) planBtn.setAttribute("data-pick", m.offer);
    document.querySelectorAll("[data-cut]").forEach(function (el) { el.textContent = m.cut == null ? "off" : String(m.cut); });
    document.querySelectorAll(".yard-cut, .big-cut").forEach(function (el) { el.classList.toggle("is-off", m.cut == null); });
    cutRows.forEach(function (li) { li.classList.toggle("now", m.cut != null && li.textContent.indexOf(String(m.cut) + " in") === 0); });
    setSeason(m.season, m.cut);
  }
  monthBtns.forEach(function (b) { b.addEventListener("click", function () { pick(Number(b.getAttribute("data-month"))); }); });
  var current = today.getUTCMonth();
  pick(current);

  /* ---------- route checker ---------- */
  var f = $(".zip-check");
  if (f) {
    var days = JSON.parse(f.getAttribute("data-route") || "[]"), out = f.querySelector(".zip-out");
    var names = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 }, full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var z = f.querySelector("input").value.replace(/[^0-9]/g, "").slice(0, 5), hit = -1;
      days.forEach(function (d, i) { if (hit < 0 && d[2].indexOf(z) > -1) hit = i; });
      if (z.length !== 5) { out.textContent = "Type a 5-digit ZIP."; return; }
      if (hit < 0) { out.textContent = "Not on a route yet. Ask anyway: we add a street when three neighbors sign up."; return; }
      var d = days[hit], wd = names[d[0]], gap = (wd - today.getUTCDay() + 7) % 7 || 7;
      var next = new Date(today.getTime() + gap * 864e5);
      var date = next.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      var m = today.getUTCMonth() + 1, inSeason = m >= 4 && m <= 10;
      out.textContent = "Yes. We're in " + d[1] + " every " + full[wd] + "." + (inSeason ? " Next visit: " + full[wd].slice(0, 3) + ", " + date + (gap === 1 ? " (tomorrow)." : " (in " + gap + " days).") : " Weekly mowing starts in April.");
    });
  }

  /* ---------- the 3D yard ---------- */
  var cv = $("[data-yard]"), mowBtn = $("[data-mow]");
  if (!cv) return;
  var started = false;
  function load() {
    if (started) return; started = true;
    var sc = document.createElement("script");
    sc.src = "zdog.min.js"; sc.async = true; sc.onload = build;
    document.head.appendChild(sc);
  }
  // After first paint, on idle, and only once the yard is (nearly) on screen.
  function whenIdle(fn) { (window.requestIdleCallback || function (cb) { setTimeout(cb, 300); })(fn, { timeout: 2000 }); }
  addEventListener("load", function () {
    whenIdle(function () {
      if (!("IntersectionObserver" in window)) return load();
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "200px" });
      io.observe(cv);
    });
  });

  function build() {
    var Z = window.Zdog; if (!Z) return;
    var TAU = Z.TAU, stage = cv.parentNode;
    var SEASON = {
      spring: { a: "#7FC25A", b: "#69AD48", tall: "#A6D47E", tree: "#9BD36A", leaves: false, snow: false },
      summer: { a: "#4E9A43", b: "#3E8238", tall: "#7DB866", tree: "#3F8A3A", leaves: false, snow: false },
      fall:   { a: "#6E9A42", b: "#5C8636", tall: "#97B85E", tree: "#D9862E", leaves: true,  snow: false },
      winter: { a: "#D9E3E6", b: "#CBD7DB", tall: "#E4ECEE", tree: null,      leaves: false, snow: true }
    };
    var season = "fall", S = SEASON.fall;
    var size = function () { var w = stage.getBoundingClientRect().width; return { w: w, h: w * 420 / 520 }; };
    var box = size();
    var illo = new Z.Illustration({ element: cv, zoom: box.w / 380, rotate: { x: -0.62, y: 0.72 }, translate: { y: 18 }, dragRotate: true,
      onDragStart: function () { dragging = true; kick(); }, onDragEnd: function () { dragging = false; } });
    illo.setSize(Math.round(box.w), Math.round(box.h));
    addEventListener("resize", function () { var s = size(); if (!s.w) return; illo.setSize(Math.round(s.w), Math.round(s.h)); illo.zoom = s.w / 380; kick(); });

    var ground = new Z.Anchor({ addTo: illo, rotate: { x: TAU / 4 }, translate: { y: 20 } });
    // The lot: a plinth of soil, then the lawn in 8 stripes of 8 patches each.
    new Z.Box({ addTo: ground, width: 236, height: 196, depth: 14, translate: { z: -7.5 }, color: "#6B4E36", frontFace: false, rearFace: false, leftFace: "#5A4130", rightFace: "#5A4130", stroke: false });
    var ROWS = 8, COLS = 8, W = 25, L = 24.5, x0 = -118 + W / 2, y0 = -98 + L / 2;
    var patches = [];
    for (var r = 0; r < ROWS; r++) {
      patches[r] = [];
      for (var c = 0; c < COLS; c++) patches[r][c] = new Z.Rect({ addTo: ground, width: W, height: L, translate: { x: x0 + r * W, y: y0 + c * L }, fill: true, stroke: false, color: S.tall });
    }
    var mowed = patches.map(function () { return patches[0].map(function () { return false; }); });
    // Driveway along the right edge, and the walk.
    new Z.Rect({ addTo: ground, width: 34, height: 196, translate: { x: 101 }, fill: true, stroke: false, color: "#CFC8B8" });
    // The house sits behind the lot.
    var house = new Z.Anchor({ addTo: illo, translate: { z: -128, y: -12 } });
    var walls = new Z.Box({ addTo: house, width: 150, height: 64, depth: 54, color: "#F4EFE2", leftFace: "#E4DDCB", rightFace: "#E4DDCB", topFace: false, stroke: false });
    var roofC = "#33463F";
    var roof = new Z.Anchor({ addTo: house, translate: { y: -32 } });
    [-1, 1].forEach(function (side) {
      new Z.Shape({ addTo: roof, path: [{ x: -80, y: 0, z: side * 31 }, { x: 80, y: 0, z: side * 31 }, { x: 80, y: -30, z: 0 }, { x: -80, y: -30, z: 0 }], fill: true, stroke: 2, color: roofC });
    });
    var snowCap = new Z.Shape({ addTo: roof, path: [{ x: -80, y: -30 }, { x: 80, y: -30 }], stroke: 7, color: "#FFFFFF", visible: false });
    new Z.Rect({ addTo: house, width: 18, height: 34, translate: { y: 15, z: 27.5 }, fill: true, stroke: false, color: "#12352E" });
    [-48, 44].forEach(function (x) { new Z.Rect({ addTo: house, width: 24, height: 18, translate: { x: x, y: -4, z: 27.5 }, fill: true, stroke: 2, color: "#9CC3D0" }); });
    // The maple by the drive.
    var tree = new Z.Anchor({ addTo: illo, translate: { x: 78, z: -70, y: 0 } });
    new Z.Cylinder({ addTo: tree, diameter: 8, length: 46, rotate: { x: TAU / 4 }, translate: { y: -3 }, color: "#5A3E2B", stroke: false });
    var canopy = new Z.Shape({ addTo: tree, translate: { y: -44 }, stroke: 62, color: S.tree });
    var canopy2 = new Z.Shape({ addTo: tree, translate: { y: -60, x: -12, z: 8 }, stroke: 40, color: S.tree });
    var branches = new Z.Shape({ addTo: tree, path: [{ y: -24 }, { x: -14, y: -52 }, { move: { y: -30 } }, { x: 14, y: -58 }], closed: false, stroke: 3, color: "#5A3E2B", visible: false });
    // Fallen leaves, scattered the same way every time.
    var leaves = [];
    for (var i = 0; i < 26; i++) {
      var t = (i * 137.5) % 360, rr = 18 + ((i * 53) % 70);
      leaves.push(new Z.Shape({ addTo: ground, translate: { x: Math.cos(t) * rr + 30, y: Math.sin(t) * rr * 0.8, z: 1 }, stroke: 5, color: i % 3 ? "#D9862E" : "#B4532A", visible: false }));
    }
    // The mower: a butter-yellow deck, black wheels and a handle.
    var mower = new Z.Anchor({ addTo: ground, translate: { x: x0, y: y0 - L, z: 6 } });
    new Z.Box({ addTo: mower, width: 18, height: 16, depth: 8, color: "#F2C230", leftFace: "#D9A916", rightFace: "#D9A916", rearFace: "#D9A916", stroke: false });
    [[-8, -7], [8, -7], [-8, 7], [8, 7]].forEach(function (p) { new Z.Shape({ addTo: mower, translate: { x: p[0], y: p[1], z: -3 }, stroke: 6, color: "#1B1F1E" }); });
    new Z.Shape({ addTo: mower, path: [{ x: -7, y: 8, z: 2 }, { x: -7, y: 22, z: 22 }, { x: 7, y: 22, z: 22 }, { x: 7, y: 8, z: 2 }], closed: false, stroke: 2.5, color: "#12352E" });

    function paint() {
      var s = SEASON[season];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) patches[r][c].color = s.snow ? (r % 2 ? s.a : s.b) : mowed[r][c] ? (r % 2 ? s.a : s.b) : s.tall;
      canopy.visible = canopy2.visible = !!s.tree; branches.visible = !s.tree;
      if (s.tree) canopy.color = canopy2.color = s.tree;
      leaves.forEach(function (l) { l.visible = s.leaves; });
      snowCap.visible = s.snow; mower.visible = !s.snow;
    }

    // Mowing: the mower runs stripe by stripe, alternating direction, cutting each patch it crosses.
    var row = 0, pos = -1, running = false, oneStripe = false, rest = 0, dragging = false, visible = true, raf = 0;
    function stepMower(dt) {
      if (rest > 0) { rest -= dt; if (rest <= 0) { mowed.forEach(function (m) { m.fill(false); }); row = 0; pos = -1; paint(); } return; }
      pos += dt / 140; // patches per ms
      var c = Math.floor(pos), dir = row % 2 ? -1 : 1, col = dir > 0 ? c : COLS - 1 - c;
      if (c >= 0 && c < COLS && !mowed[row][col]) { mowed[row][col] = true; paint(); }
      var y = dir > 0 ? y0 - L + pos * L : y0 + COLS * L - pos * L;
      mower.translate.x = x0 + row * W; mower.translate.y = y;
      mower.rotate.z = dir > 0 ? 0 : TAU / 2;
      if (pos >= COLS + 1) {
        row++; pos = -1;
        if (oneStripe) { oneStripe = false; running = autoplay(); }
        if (row >= ROWS) { row = 0; rest = 2200; }
      }
    }
    function autoplay() { return wide && !paused && !SEASON[season].snow; }
    var last = 0;
    function frame(t) {
      raf = 0;
      var dt = last ? Math.min(64, t - last) : 16; last = t;
      if ((running || oneStripe) && visible) stepMower(dt);
      illo.updateRenderGraph();
      if (((running || oneStripe) && visible) || dragging) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    setSeason = function (s) {
      season = SEASON[s] ? s : "summer";
      if (SEASON[season].snow) { running = false; oneStripe = false; }
      else running = autoplay();
      if (mowBtn) { mowBtn.disabled = SEASON[season].snow; mowBtn.textContent = SEASON[season].snow ? "Mower's put away" : "Mow a stripe"; }
      paint(); kick();
    };
    onPause.push(function () { running = autoplay(); kick(); });
    if (mowBtn) mowBtn.addEventListener("click", function () { if (SEASON[season].snow) return; if (rest > 0) { rest = 1; } oneStripe = true; kick(); });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; if (visible) kick(); });

    // Start with a couple of stripes already cut, so the still frame reads as a mowed lawn.
    for (var rr2 = 0; rr2 < 3; rr2++) for (var cc = 0; cc < COLS; cc++) mowed[rr2][cc] = true;
    row = 3; pos = 0; stepMower(0);
    var cur = year[current] || {};
    var pressed = monthBtns.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0];
    setSeason(pressed ? year[Number(pressed.getAttribute("data-month"))].season : cur.season);
    body.classList.add("has-3d");
  }
})();
