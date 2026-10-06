/*
  GroundWork-Web design system v3. Interactions. Each piece is opt-in by data-ui.
  Needs config.js first (window.GW.pricing). Tracking goes through window.GW_track (analytics.js),
  which does not exist when the visitor has Global Privacy Control or Do Not Track on, so every
  call here is guarded. Allowed labels are listed in docs/redesign/TRACKING.md and api/track.php.
*/
(function () {
  var doc = document;
  function all(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  function track(label) { if (typeof window.GW_track === "function") window.GW_track(label); }
  function once(label) { var done = false; return function () { if (!done) { done = true; track(label); } }; }

  // Reveal on scroll. Content is visible by default; the .js class only arms the animation.
  doc.documentElement.classList.add("js");
  var rv = all(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  // price_seen: fires once when the price section is first on screen.
  all('[data-ui="price-seen"]').forEach(function (el) {
    var fire = once("price_seen");
    if ("IntersectionObserver" in window) {
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fire(); o.disconnect(); } }, { threshold: 0.3 });
      o.observe(el);
    }
  });

  // Before/after compare. Drives --pos on the wrapper from the range input.
  all('[data-ui="compare"]').forEach(function (el) {
    var rg = el.querySelector('input[type="range"]');
    var used = once("compare_use");
    if (!rg) return;
    rg.addEventListener("input", function () { el.style.setProperty("--pos", rg.value + "%"); used(); });
  });

  // Plan picker. Every number comes from GW.pricing, nothing is typed into the HTML twice.
  all('[data-ui="picker"]').forEach(function (el) {
    var P = (window.GW && window.GW.pricing) || {};
    var buttons = all("button[data-plan]", el);
    var mo = doc.getElementById(el.getAttribute("data-month"));
    var inc = doc.getElementById(el.getAttribute("data-included"));
    var tot = doc.getElementById(el.getAttribute("data-total"));
    var months = parseInt(el.getAttribute("data-months") || "3", 10);
    var copy = {};
    buttons.forEach(function (b) { copy[b.getAttribute("data-plan")] = b.getAttribute("data-copy") || ""; });
    var sent = {}, sentCount = 0;
    function money(n) { return "$" + n.toLocaleString("en-US"); }
    function pick(plan, fromUser) {
      if (!(plan in P)) return;
      buttons.forEach(function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-plan") === plan)); });
      if (mo) mo.textContent = money(P[plan]);
      if (inc) inc.textContent = copy[plan];
      if (tot) tot.textContent = money(P.build + months * P[plan]);
      if (fromUser && !sent[plan] && sentCount < 2) { sent[plan] = true; sentCount++; track("plan_" + plan); }
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { pick(b.getAttribute("data-plan"), true); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = buttons[(i + d + buttons.length) % buttons.length];
        n.focus(); pick(n.getAttribute("data-plan"), true);
      });
    });
    var start = buttons.filter(function (b) { return b.getAttribute("aria-checked") === "true"; })[0] || buttons[0];
    if (start) pick(start.getAttribute("data-plan"), false);
  });

  // Phone demo. Fictional shop. Nothing the visitor does here is sent anywhere except the two counts.
  all('[data-ui="phone"]').forEach(function (el) {
    var pkgs = all(".pkg", el), slots = all(".slot", el), book = el.querySelector(".book"), note = el.querySelector(".s-note");
    var pk = null, sl = null, base = note ? note.textContent : "";
    var pkOnce = once("demo_package"), bookOnce = once("demo_book");
    function refresh() {
      book.disabled = !(pk && sl);
      book.textContent = pk && sl ? "Book " + pk.getAttribute("data-p") + " for $" + pk.getAttribute("data-v") : (pk ? "Now pick a time" : "Pick a package and a time");
    }
    function radio(list, b) { list.forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); }
    pkgs.forEach(function (b, i) {
      b.addEventListener("click", function () { radio(pkgs, b); pk = b; if (note) note.textContent = base; pkOnce(); refresh(); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault(); pkgs[(i + d + pkgs.length) % pkgs.length].focus(); pkgs[(i + d + pkgs.length) % pkgs.length].click();
      });
    });
    slots.forEach(function (b) {
      b.addEventListener("click", function () { slots.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); sl = b; if (note) note.textContent = base; refresh(); });
    });
    book.addEventListener("click", function () {
      if (book.disabled) return;
      if (note) note.textContent = "Booked: " + pk.getAttribute("data-p") + ", " + sl.textContent + ". This is what your customer sees. Nothing was sent.";
      bookOnce();
    });
    refresh();
  });
})();
