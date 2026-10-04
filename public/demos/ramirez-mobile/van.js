/* van-door layout behavior: the spinning van (Zdog), today's route on the real clock, the wash pad,
   tilt and spotlight on cards, and a rolling price total. funnel.js keeps tracking and the forms.
   Everything here is decoration on top of a page that already works without it. */
(function () {
  "use strict";
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var css = getComputedStyle(document.documentElement);
  var C = function (n, d) { return (css.getPropertyValue(n) || d).trim() || d; };

  /* ---------- the van ---------- */
  var cv = document.querySelector("[data-van]");
  if (cv && window.Zdog) {
    var Z = window.Zdog, TAU = Z.TAU;
    var white = "#FFFDF8", shade = "#E9E2D3", ink = C("--ink", "#14213D"), cobalt = C("--cobalt", "#2340A8"),
        chili = C("--chili", "#C8341F"), gold = C("--gold", "#F2A922"), tire = "#22252B", glass = "#9DB6E6";
    var box = cv.getBoundingClientRect();
    // Zdog scales the canvas for the screen's pixel ratio itself; size it in CSS pixels.
    var illo = new Z.Illustration({ element: cv, zoom: box.width / 300, rotate: { x: -0.32, y: -0.7 }, dragRotate: true,
      onDragStart: function () { spinning = false; hint && hint.classList.add("gone"); },
      onDragMove: function () { draw(); } });
    illo.setSize(Math.round(box.width), Math.round(box.height));
    addEventListener("resize", function () { var r = cv.parentNode.getBoundingClientRect(), w = Math.min(r.width, 560); illo.setSize(Math.round(w), Math.round(w * 440 / 560)); illo.zoom = w / 300; draw(); });
    var van = new Z.Anchor({ addTo: illo, translate: { y: 8 } });
    // cargo box
    new Z.Box({ addTo: van, width: 120, height: 66, depth: 62, translate: { x: -14, y: -14 }, stroke: 4,
      color: white, leftFace: shade, rightFace: white, topFace: "#F6F1E6", bottomFace: false, rearFace: shade, frontFace: white });
    // cab: a shorter box with a sloped windshield
    new Z.Box({ addTo: van, width: 40, height: 46, depth: 62, translate: { x: 66, y: -4 }, stroke: 4,
      color: white, leftFace: false, rightFace: shade, topFace: "#F6F1E6", bottomFace: false, rearFace: shade, frontFace: white });
    new Z.Shape({ addTo: van, path: [{ x: 46, y: -47, z: 30 }, { x: 70, y: -27, z: 30 }, { x: 70, y: -27, z: -30 }, { x: 46, y: -47, z: -30 }],
      stroke: 4, fill: true, color: white });
    new Z.Shape({ addTo: van, path: [{ x: 49, y: -43, z: 26 }, { x: 68, y: -28, z: 26 }, { x: 68, y: -28, z: -26 }, { x: 49, y: -43, z: -26 }],
      stroke: 2, fill: true, color: glass });
    // side windows, both sides
    [35, -35].forEach(function (z) {
      new Z.Rect({ addTo: van, width: 22, height: 14, translate: { x: 66, y: -20, z: z > 0 ? 34 : -34 }, stroke: 2, fill: true, color: glass });
      // the pinstripe: red over navy, the way Rudy painted it
      new Z.Rect({ addTo: van, width: 150, height: 5, translate: { x: 4, y: 2, z: z }, stroke: 1, fill: true, color: chili });
      new Z.Rect({ addTo: van, width: 150, height: 3, translate: { x: 4, y: 9, z: z }, stroke: 1, fill: true, color: cobalt });
      // the door seal: a gold tile with a cobalt center
      new Z.Rect({ addTo: van, width: 24, height: 24, translate: { x: -26, y: -24, z: z }, stroke: 2, fill: true, color: gold });
      new Z.Ellipse({ addTo: van, diameter: 11, translate: { x: -26, y: -24, z: z + (z > 0 ? 0.5 : -0.5) }, stroke: 3, fill: true, color: cobalt });
    });
    // headlights and bumper
    new Z.Rect({ addTo: van, width: 8, height: 6, translate: { x: 87, y: 6, z: 20 }, rotate: { y: TAU / 4 }, stroke: 2, fill: true, color: gold });
    new Z.Rect({ addTo: van, width: 8, height: 6, translate: { x: 87, y: 6, z: -20 }, rotate: { y: TAU / 4 }, stroke: 2, fill: true, color: gold });
    new Z.Box({ addTo: van, width: 4, height: 6, depth: 64, translate: { x: 88, y: 16 }, color: ink, stroke: 2 });
    // wheels
    [[52, 32], [52, -32], [-46, 32], [-46, -32]].forEach(function (p) {
      var w = new Z.Cylinder({ addTo: van, diameter: 24, length: 8, translate: { x: p[0], y: 22, z: p[1] }, stroke: 2, color: tire, backface: "#3A3E46" });
      new Z.Ellipse({ addTo: w, diameter: 10, translate: { z: p[1] > 0 ? 4.5 : -4.5 }, stroke: 2, fill: true, color: "#C9CED6" });
    });
    // the shade tent, set up beside the van
    var tent = new Z.Anchor({ addTo: illo, translate: { x: -18, y: 8, z: -92 } });
    [[-40, -30], [40, -30], [-40, 30], [40, 30]].forEach(function (p) {
      new Z.Shape({ addTo: tent, path: [{ x: p[0], y: 34, z: p[1] }, { x: p[0], y: -40, z: p[1] }], stroke: 2.5, color: "#7A7F88" });
    });
    new Z.Shape({ addTo: tent, path: [{ x: -44, y: -40, z: -34 }, { x: 44, y: -40, z: -34 }, { x: 44, y: -40, z: 34 }, { x: -44, y: -40, z: 34 }],
      stroke: 3, fill: true, color: chili });
    new Z.Shape({ addTo: tent, path: [{ x: -44, y: -40, z: 34 }, { x: 44, y: -40, z: 34 }], stroke: 7, color: gold });
    // ground: a tile pad
    new Z.Rect({ addTo: illo, width: 250, height: 210, translate: { y: 35, z: -40 }, rotate: { x: TAU / 4 }, stroke: 0, fill: true, color: "rgba(35,64,168,.08)" });

    var spinning = !still, visible = true, hint = document.querySelector("[data-spin-hint]");
    var draw = function () { illo.updateRenderGraph(); };
    var tick = function () {
      if (spinning && visible) { illo.rotate.y += 0.004; draw(); }
      if (spinning) requestAnimationFrame(tick);
    };
    draw();
    if (spinning) requestAnimationFrame(tick);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    // keyboard: arrows turn it
    cv.tabIndex = 0;
    cv.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault(); spinning = false; illo.rotate.y += e.key === "ArrowLeft" ? -0.2 : 0.2; draw();
    });
  }

  /* ---------- today's route, on San Antonio time ---------- */
  var stops = document.querySelector("[data-stops]");
  if (stops) {
    var now = new Date(), parts = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
    var mins = Number(parts.hour) * 60 + Number(parts.minute), day = parts.weekday;
    var toMin = function (t) { var a = String(t).split(":"); return Number(a[0]) * 60 + Number(a[1] || 0); };
    var hours = []; try { hours = JSON.parse(stops.getAttribute("data-hours") || "[]"); } catch (e) {}
    var today = hours.filter(function (h) { return h[0].indexOf(day) >= 0; })[0];
    var openNow = !!today && mins >= toMin(today[1]) && mins < toMin(today[2]);
    var lis = stops.querySelectorAll("li"), current = null;
    lis.forEach(function (li) {
      var a = toMin(li.getAttribute("data-from")), b = toMin(li.getAttribute("data-to"));
      if (!openNow) return;
      if (mins >= b) li.classList.add("done");
      else if (mins >= a) { li.classList.add("now"); li.setAttribute("aria-current", "step"); current = li; }
    });
    var nowEl = document.querySelector("[data-now]");
    if (nowEl) {
      if (openNow && current) nowEl.textContent = "Right now: " + current.querySelector("b").textContent + ". Text and Rudy answers between cars.";
      else if (openNow) nowEl.textContent = "Between cars right now. Text and Rudy answers in a few minutes.";
      else nowEl.textContent = "We're off the road right now. Text anyway, Rudy answers first thing at 7.";
    }
    var open = document.querySelector("[data-open]");
    if (open) {
      open.hidden = false; open.classList.toggle("is-open", openNow);
      open.querySelector("[data-open-text]").textContent = openNow ? "On the road now" : "Back at 7am";
    }
  }

  /* ---------- the wash pad: wipe the mud off ---------- */
  var pad = document.querySelector("[data-wash]"), mud = document.querySelector("[data-mud]");
  if (pad && mud && mud.getContext) {
    var ctx = mud.getContext("2d"), pct = document.querySelector("[data-wash-pct]"), done = document.querySelector("[data-wash-done]");
    var W, H, finished = false, strokes = 0, last = null;
    var auto = document.querySelector("[data-wash-auto]"), autoLabel = auto ? auto.textContent : "";
    var size = function () {
      var r = pad.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = mud.width = Math.round(r.width * d); H = mud.height = Math.round(r.height * d);
      paint();
    };
    // A seeded random so the dirt looks the same on every visit.
    var seed = 11, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var paint = function () {
      seed = 11; ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H);
      var cols = ["rgba(120,86,52,.78)", "rgba(96,70,44,.72)", "rgba(150,116,78,.6)", "rgba(80,64,48,.5)"];
      for (var i = 0; i < 150; i++) {
        var x = rnd() * W, y = H * (0.3 + rnd() * 0.62), r = (8 + rnd() * 38) * W / 640;
        ctx.fillStyle = cols[i % 4]; ctx.beginPath();
        ctx.ellipse(x, y, r * (1 + rnd()), r, rnd() * 3, 0, 6.3); ctx.fill();
      }
      for (var j = 0; j < 260; j++) { // splatter
        ctx.fillStyle = cols[j % 4]; ctx.beginPath(); ctx.arc(rnd() * W, H * (0.2 + rnd() * 0.75), rnd() * 4 * W / 640 + 1, 0, 6.3); ctx.fill();
      }
      finished = false; if (pct) pct.textContent = "0%"; if (done) done.hidden = true; if (auto) auto.textContent = autoLabel;
    };
    var wipe = function (x, y) {
      var r = W * 0.06;
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round"; ctx.lineWidth = r * 2;
      if (last) { ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
      last = [x, y];
      if (++strokes % 8 === 0) measure();
    };
    var measure = function () {
      var data = ctx.getImageData(0, 0, W, H).data, left = 0, total = 0;
      for (var i = 3; i < data.length; i += 4 * 97) { total++; if (data[i] > 40) left++; }
      var start = measure.start || (measure.start = left || 1);
      var p = Math.max(0, Math.min(100, Math.round(100 - (left / start) * 100)));
      if (pct) pct.textContent = p + "%";
      if (p >= 70 && !finished) { finished = true; ctx.clearRect(0, 0, W, H); if (pct) pct.textContent = "100%"; if (done) done.hidden = false; pad.classList.add("shine"); if (auto) auto.textContent = "Get it muddy again"; }
    };
    var at = function (e) { var r = mud.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    var down = false;
    mud.addEventListener("pointerdown", function (e) { down = true; last = null; mud.setPointerCapture(e.pointerId); var p = at(e); wipe(p[0], p[1]); });
    mud.addEventListener("pointermove", function (e) { if (down) { var p = at(e); wipe(p[0], p[1]); } });
    ["pointerup", "pointercancel"].forEach(function (t) { mud.addEventListener(t, function () { down = false; last = null; measure(); }); });
    if (auto) auto.addEventListener("click", function () {
      if (finished) { pad.classList.remove("shine"); measure.start = 0; paint(); measure(); return; }
      if (still) { strokes = 7; ctx.clearRect(0, 0, W, H); measure(); return; }
      // a sponge pass, back and forth, top to bottom
      var row = 0, rows = 6, t = 0;
      last = null;
      var step = function () {
        t += 0.06;
        var x = (row % 2 ? 1 - t : t) * W, y = H * (0.28 + row * 0.13);
        wipe(x, y);
        if (t >= 1) { t = 0; row++; last = null; }
        if (row < rows && !finished) requestAnimationFrame(step); else measure();
      };
      requestAnimationFrame(step);
    });
    size(); measure.start = 0; measure();
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (!finished) { measure.start = 0; size(); measure(); } }, 200); });
  }

  /* ---------- a package button also answers step 1 of the form ---------- */
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-pick");
      document.querySelectorAll("#lead input[name=kind]").forEach(function (i) { if (i.value === v) i.checked = true; });
    });
  });

  /* ---------- tilt and spotlight on cards (mouse only, never with reduced motion) ---------- */
  if (fine && !still) {
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg"); el.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); });
    });
  }
  if (fine) document.querySelectorAll("[data-spot]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- the price total rolls to the new number ---------- */
  var total = document.querySelector("[data-est-total]");
  if (total && !still) {
    var shown = Number(total.textContent.replace(/[^0-9]/g, "")) || 0, wrote = null, run = 0;
    new MutationObserver(function () {
      if (total.textContent === wrote) return; // our own frame, not a new price
      var to = Number(total.textContent.replace(/[^0-9]/g, "")) || 0, from = shown, t0 = performance.now(), id = ++run;
      if (to === from) return;
      var frame = function (t) {
        if (id !== run) return;
        var k = Math.min(1, (t - t0) / 380);
        shown = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        total.textContent = wrote = "$" + shown.toLocaleString("en-US");
        if (k < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }).observe(total, { childList: true, characterData: true, subtree: true });
  }
})();
