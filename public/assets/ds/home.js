/* Homepage trade picker: ARIA tabs with arrow-key support. Without JS every work order shows. */
(function () {
  var list = document.querySelector(".tabs");
  if (!list) return;
  var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) { tab.focus(); tab.scrollIntoView({ block: "nearest", inline: "nearest" }); }
  }
  /* Every work order gets the tallest one's height, so switching trades never moves the page. */
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  function even() {
    var h = 0;
    panels.forEach(function (p) { p.style.minHeight = ""; p.hidden = false; h = Math.max(h, p.offsetHeight); });
    panels.forEach(function (p) { p.style.minHeight = h + "px"; });
  }
  even();
  select(tabs[0]);
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { var on = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]; even(); select(on || tabs[0]); }, 150); });
  list.addEventListener("click", function (e) {
    var t = e.target.closest('[role="tab"]');
    if (t) select(t);
  });
  list.addEventListener("keydown", function (e) {
    var i = tabs.indexOf(document.activeElement), n = tabs.length;
    if (i < 0) return;
    var j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j >= 0) { e.preventDefault(); select(tabs[j], true); }
  });
})();
/* Hide the bottom bar while the hero Start button is on screen, so Start isn't shown twice. */
(function () {
  var hero = document.getElementById("hero-start"), bar = document.querySelector(".bar");
  if (!hero || !bar || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (e) { bar.classList.toggle("off", e[0].isIntersecting); }).observe(hero);
})();
/* Hero visual: 3D carousel of sample sites. It only moves when the visitor swipes, drags, taps or uses the arrows; tapping a site also opens that trade's work order. */
(function () {
  var cf = document.getElementById("cf"), stage = document.getElementById("cf-stage");
  if (!cf) return;
  /* The screenshots load after the page, so they never hold up the headline (phone LCP). Sizes are fixed, so nothing shifts. */
  function load() { [].forEach.call(cf.querySelectorAll("img[data-src]"), function (im) { im.src = im.dataset.src; }); }
  if (document.readyState === "complete") load(); else addEventListener("load", load);
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = [].slice.call(cf.querySelectorAll(".cf-ph")), N = cards.length, name = document.getElementById("cf-name");
  /* Opens on the visitor's trade when the link says it (?trade=detail|ext|lawn|comm|re), otherwise on detailing. */
  var want = (location.search.match(/[?&]trade=([a-z]+)/) || [])[1], pos = 1;
  cards.some(function (c, i) { if (want && c.dataset.tab === "t-" + want) { pos = i; return true; } });
  var target = pos, drag = null, running = false;
  function wrap(d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; }
  function front() { return ((Math.round(target) % N) + N) % N; }
  function render() {
    cards.forEach(function (c, i) {
      var d = wrap(i - pos), a = Math.abs(d);
      c.style.transform = "translateX(" + d * 96 + "px) translateZ(" + -a * 90 + "px) rotateY(" + Math.max(-1, Math.min(1, d)) * -38 + "deg)";
      c.style.zIndex = String(100 - Math.round(a * 10));
      c.style.opacity = a > 2.2 ? 0 : 1;
      c.tabIndex = a > 2.2 ? -1 : 0;
    });
    var k = front(), t = document.getElementById(cards[k].dataset.tab);
    var label = (t ? t.textContent.trim() : "") + " \u00b7 " + cards[k].dataset.name;
    if (name.textContent !== label) name.textContent = label;
  }
  function loop() {
    if (!drag) pos += (target - pos) * (RM ? 1 : 0.16);
    if (!drag && Math.abs(target - pos) < 0.001) pos = target;
    render();
    if (drag || pos !== target) requestAnimationFrame(loop); else running = false;
  }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function go(n) { target = Math.round(target) + n; start(); }
  cards.forEach(function (c, i) {
    c.addEventListener("click", function () {
      if (drag && drag.moved) return;
      target = pos + wrap(i - pos); start();
      var t = document.getElementById(c.dataset.tab); if (t) t.click();
    });
  });
  stage.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, p: pos, moved: false }; start(); });
  addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) { pos = drag.p - dx / 120; target = pos; }
  });
  function end() { if (!drag) return; var d = drag; target = Math.round(pos); setTimeout(function () { if (drag === d) drag = null; start(); }, 0); }
  addEventListener("pointerup", end); addEventListener("pointercancel", end);
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  var prev = document.getElementById("cf-prev"), next = document.getElementById("cf-next");
  prev.hidden = next.hidden = false;
  prev.addEventListener("click", function () { go(-1); });
  next.addEventListener("click", function () { go(1); });
  render();
  if (want) { var wt = document.getElementById(cards[pos].dataset.tab); if (wt) wt.click(); }
})();
