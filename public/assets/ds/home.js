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
  select(tabs[0]);
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
/* Hero visual: the 3D fan of sample sites. Mouse tilt only (no motion on touch or with reduced motion); picking a site also opens that trade's work order. */
(function () {
  var fan = document.getElementById("fan"), stage = document.getElementById("fan-stage");
  if (!fan) return;
  /* The screenshots load after the page, so they never hold up the headline (phone LCP). Sizes are fixed, so nothing shifts. */
  function load() { [].forEach.call(fan.querySelectorAll("img[data-src]"), function (im) { im.src = im.dataset.src; }); }
  if (document.readyState === "complete") load(); else addEventListener("load", load);
  var phs = [].slice.call(fan.querySelectorAll(".fan-ph")), front = 1;
  function lay() {
    phs.forEach(function (p, i) {
      var d = (((i - front) % 3) + 3) % 3; d = d === 2 ? -1 : d;
      p.setAttribute("aria-pressed", String(!d));
      p.style.transform = "translateX(" + d * 92 + "px) translateZ(" + (d ? -40 : 60) + "px) rotateY(" + d * -28 + "deg)";
    });
  }
  function pick(i, sync) {
    front = i; lay();
    if (sync) { var t = document.getElementById(phs[i].dataset.tab); if (t) t.click(); }
  }
  phs.forEach(function (p) { p.addEventListener("click", function () { pick(+p.dataset.i, true); }); });
  if (matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      fan.style.transform = "rotateY(" + x * 24 + "deg) rotateX(" + -y * 14 + "deg)";
    });
    stage.addEventListener("pointerleave", function () { fan.style.transform = ""; });
  }
})();
