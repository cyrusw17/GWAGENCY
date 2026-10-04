/* night-log behavior: the company clock (where tonight's crew would be right now, on the building's
   time zone), the bid estimator, and the 3D office floor (Zdog). Zdog loads only after the page has
   painted and the floor is on screen. The cart only moves by itself on wide screens with motion
   allowed; "Pause motion" stops it, and reduced-motion visitors start paused. funnel.js keeps
   tracking and the walkthrough form. Everything here is extra: the page works without it. */
(function () {
  "use strict";
  var body = document.body;
  body.classList.remove("no-js");
  var $ = function (sel) { return document.querySelector(sel); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = matchMedia("(min-width: 960px)").matches;
  var paused = reduce, onPause = [];
  var pauseBtn = $("[data-pause]");
  if (pauseBtn) {
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.addEventListener("click", function () {
      paused = pauseBtn.getAttribute("aria-pressed") !== "true";
      pauseBtn.setAttribute("aria-pressed", String(paused));
      onPause.forEach(function (f) { f(paused); });
    });
  }

  var data = { tz: "America/New_York", rooms: [] };
  try { data = JSON.parse(document.getElementById("log-data").textContent); } catch (_) {}
  var rooms = data.rooms || [];
  function mins(t) { // "6:12 pm" -> minutes after midnight
    var m = /(\d+):(\d+)\s*(am|pm)/i.exec(t || ""); if (!m) return 0;
    return (Number(m[1]) % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0)) * 60 + Number(m[2]);
  }

  /* ---------- the company clock ---------- */
  var clock = $("[data-clock]"), clockText = $("[data-clock-text]");
  function tick() {
    if (!clock || !rooms.length) return;
    var p = new Intl.DateTimeFormat("en-US", { timeZone: data.tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
    var now = mins(p), first = mins(rooms[0][2]), last = mins(rooms[rooms.length - 1][2]) + 37;
    var night = now >= 18 * 60 || now < 2 * 60, here = "";
    if (now >= 18 * 60 && now < first) here = "The crew is unlocking the door.";
    else if (now >= first && now < last) {
      for (var i = 0; i < rooms.length; i++) if (mins(rooms[i][2]) <= now) here = "The crew would be in the " + rooms[i][1].toLowerCase() + ".";
    } else if (night) here = "Locked up, alarm set.";
    else here = "Office hours. The crew comes in after you leave.";
    clockText.textContent = p.toLowerCase().replace(" ", " ") + " in Greensboro. " + here;
    clock.classList.toggle("day", !night);
    clock.hidden = false;
  }
  tick(); setInterval(tick, 30000);

  /* ---------- the estimator ---------- */
  var est = $("[data-bid]");
  if (est) {
    var cfg = { types: [], min: 0 };
    try { cfg = JSON.parse(est.getAttribute("data-bid")); } catch (_) {}
    var range = est.querySelector("#est-sqft"), type = est.querySelector("#est-type");
    var sqOut = est.querySelector("[data-sqft-out]"), num = $("[data-est-num]");
    var calc = function () {
      var sq = Number(range.value), t = cfg.types[Number(type.value)] || { rate: 0.025 };
      var n = Number((est.querySelector("input[name=nights]:checked") || { value: 3 }).value);
      var visit = Math.max(sq * t.rate, cfg.min), month = Math.round(visit * n * 4.33 / 10) * 10;
      sqOut.textContent = sq.toLocaleString("en-US");
      num.textContent = "$" + month.toLocaleString("en-US");
    };
    est.addEventListener("input", calc); est.addEventListener("change", calc);
    est.addEventListener("submit", function (e) { e.preventDefault(); });
    calc();
  }

  /* ---------- the log list ---------- */
  var items = rooms.map(function (r) { return document.querySelector('[data-room="' + r[0] + '"]'); });
  function mark(done, now) {
    items.forEach(function (li, i) { if (!li) return; li.classList.toggle("done", i < done); li.classList.toggle("now", i === now); });
  }

  /* ---------- the 3D floor ---------- */
  var cv = $("[data-floor]"), nextBtn = $("[data-next-room]");
  if (!cv) return;
  var started = false;
  function load() {
    if (started) return; started = true;
    var sc = document.createElement("script");
    sc.src = "zdog.min.js"; sc.async = true; sc.onload = build;
    document.head.appendChild(sc);
  }
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
    var size = function () { var r = stage.getBoundingClientRect(); return { w: r.width, h: r.height }; };
    var box = size(), fit = function (s) { return Math.min(s.w / 270, s.h / 230); };
    var dragging = false;
    var illo = new Z.Illustration({ element: cv, zoom: fit(box), rotate: { x: -0.7, y: 0.6 }, translate: { y: 10 }, dragRotate: true,
      onDragStart: function () { dragging = true; kick(); }, onDragEnd: function () { dragging = false; } });
    illo.setSize(Math.round(box.w), Math.round(box.h));
    addEventListener("resize", function () { var s = size(); if (!s.w) return; illo.setSize(Math.round(s.w), Math.round(s.h)); illo.zoom = fit(s); kick(); });

    var ground = new Z.Anchor({ addTo: illo, rotate: { x: TAU / 4 } });
    // The slab under the floor.
    new Z.Box({ addTo: ground, width: 238, height: 178, depth: 10, translate: { z: -5.5 }, color: "#3A424C", frontFace: false, rearFace: false, leftFace: "#2A3038", rightFace: "#2A3038", stroke: false });
    // Rooms on the 520x400 plan from the still drawing, scaled by half and centered.
    var PLAN = { lobby: [180, 230, 190, 140], open: [180, 30, 190, 200], conf: [370, 30, 120, 120], kitchen: [370, 150, 120, 220], rest: [30, 30, 150, 120], offices: [30, 150, 150, 220] };
    var LIT = "#EFE3B4", DARK = "#2C333B", WALL = 12;
    var floors = [], centers = [];
    rooms.forEach(function (r, i) {
      var p = PLAN[r[0]] || [30 + i * 70, 30, 70, 70];
      var x = (p[0] + p[2] / 2 - 260) / 2, y = (p[1] + p[3] / 2 - 200) / 2, w = p[2] / 2, h = p[3] / 2;
      centers.push({ x: x, y: y });
      floors.push(new Z.Rect({ addTo: ground, width: w - 2, height: h - 2, translate: { x: x, y: y }, fill: true, stroke: false, color: LIT }));
      // Low walls on each side, open at the top so the light reads from above.
      [[-w / 2, -h / 2, w / 2, -h / 2], [w / 2, -h / 2, w / 2, h / 2], [w / 2, h / 2, -w / 2, h / 2], [-w / 2, h / 2, -w / 2, -h / 2]].forEach(function (s, k) {
        new Z.Shape({ addTo: ground, translate: { x: x, y: y }, path: [{ x: s[0], y: s[1], z: 0 }, { x: s[2], y: s[3], z: 0 }, { x: s[2], y: s[3], z: WALL }, { x: s[0], y: s[1], z: WALL }], fill: true, stroke: 1, color: k % 2 ? "#9AA6B1" : "#B9C3CC" });
      });
    });
    // Exit sign over the lobby door.
    var door = centers[0] || { x: 0, y: 70 };
    new Z.Rect({ addTo: ground, width: 18, height: 2, translate: { x: door.x, y: 89, z: WALL + 5 }, fill: true, stroke: 3, color: "#2BB673" });
    // The janitor's cart: grey body, yellow bucket, a mop handle.
    var cart = new Z.Anchor({ addTo: ground, translate: { x: door.x, y: 100, z: 5 } });
    new Z.Box({ addTo: cart, width: 14, height: 9, depth: 8, color: "#5E6B78", leftFace: "#4D5862", rightFace: "#4D5862", rearFace: "#4D5862", stroke: false });
    new Z.Cylinder({ addTo: cart, diameter: 8, length: 7, translate: { x: 3, z: 6 }, color: "#F2C230", stroke: false });
    new Z.Shape({ addTo: cart, path: [{ x: -4, y: 0, z: 4 }, { x: -6, y: 0, z: 26 }], stroke: 2, color: "#C9D2DA" });
    [[-6, -4], [6, -4], [-6, 4], [6, 4]].forEach(function (p) { new Z.Shape({ addTo: cart, translate: { x: p[0], y: p[1], z: -4 }, stroke: 3.5, color: "#111" }); });

    // The night: the cart rolls to a room, cleans it, the light goes off, it rolls on.
    var done = 0, from = { x: door.x, y: 100 }, to = centers[0], legT = 0, cleanT = 0, rest = 0;
    var running = false, oneRoom = false, armed = false, visible = true, raf = 0, last = 0;
    var LEG = 1100, CLEAN = 900;
    function paint() {
      floors.forEach(function (f, i) { f.color = i < done ? DARK : LIT; });
      mark(done, done < rooms.length && (legT >= 1 || cleanT > 0) ? done : -1);
    }
    function reset() { done = 0; from = { x: door.x, y: 100 }; to = centers[0]; legT = 0; cleanT = 0; paint(); }
    function step(dt) {
      if (legT < 1) {
        legT = Math.min(1, legT + dt / LEG);
        var e = legT < .5 ? 2 * legT * legT : 1 - Math.pow(-2 * legT + 2, 2) / 2;
        cart.translate.x = from.x + (to.x - from.x) * e; cart.translate.y = from.y + (to.y - from.y) * e;
        cart.rotate.z = Math.atan2(to.y - from.y, to.x - from.x);
        if (legT >= 1) { paint(); if (oneRoom && armed) { oneRoom = armed = false; running = autoplay(); } }
        return;
      }
      if (done >= rooms.length) { // back at the door, lights off: wait, then a new night
        rest -= dt; if (rest <= 0) reset();
        return;
      }
      cleanT += dt;
      cart.rotate.z += dt / 260; // a slow turn while mopping
      if (cleanT >= CLEAN) {
        done++; cleanT = 0; legT = 0; from = to;
        if (oneRoom) armed = true; // stop once the cart reaches the next room
        if (done >= rooms.length) { to = { x: door.x, y: 100 }; rest = 2600; } else to = centers[done];
        paint();
      }
    }
    function autoplay() { return wide && !paused; }
    function frame(t) {
      raf = 0;
      var dt = last ? Math.min(64, t - last) : 16; last = t;
      var moving = (running || oneRoom) && visible;
      if (moving) step(dt);
      illo.updateRenderGraph();
      if (moving || dragging) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    onPause.push(function () { running = autoplay(); kick(); });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      armed = done >= rooms.length && legT >= 1; // a new night: just roll to the first room
      if (armed) rest = 0;
      oneRoom = true; kick();
    });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; if (visible) kick(); });

    // Start mid-shift: two rooms done, the cart parked in the third, so the still frame tells the story.
    done = 2; from = centers[1]; to = centers[2] || centers[0]; legT = 1;
    cart.translate.x = to.x; cart.translate.y = to.y;
    paint();
    running = autoplay();
    body.classList.add("has-3d");
    kick();
  }
})();
