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
