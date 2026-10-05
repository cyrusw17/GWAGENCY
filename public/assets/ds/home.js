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
/* Hero option: live search-result preview. Changing the trade also opens that trade's work order below. */
(function () {
  var trade = document.getElementById("serp-trade"), town = document.getElementById("serp-town");
  if (!trade || !town) return;
  var T = document.getElementById("serp-title"), D = document.getElementById("serp-desc");
  var copy = {
    detail: ["Mobile Car Detailing in {t}", "Prices by vehicle size, packages spelled out and booking from your phone. We come to you anywhere in {c}."],
    ext: ["Pressure Washing and Soft Washing in {t}", "Send two photos and get a price without a visit. House, roof, driveway and fence cleaning in {c}."],
    lawn: ["Weekly Lawn Mowing in {t}", "Weekly and every-other-week mowing, edging and cleanups. See if your street is on our {c} route."],
    comm: ["Office and Commercial Cleaning in {t}", "After-hours cleaning to a written scope. Insured, checklist-based and ready for a walkthrough in {c}."],
    re: ["{c} Real Estate Agent | Homes for Sale in {t}", "Current listings, how I work with buyers and sellers, and a direct line to me, not a portal."]
  };
  function esc(s) { return s.replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function render() {
    var t = esc(town.value.trim() || "Your Town, TX"), c = esc((town.value.split(",")[0] || "").trim() || "town");
    var k = copy[trade.value], m = function (s) { return s.replace(/\{t\}/g, "<mark>" + t + "</mark>").replace(/\{c\}/g, "<mark>" + c + "</mark>"); };
    T.innerHTML = m(k[0]) + (trade.value === "re" ? "" : " | Your Business");
    D.innerHTML = m(k[1]);
  }
  var map = { detail: "t-detail", ext: "t-ext", lawn: "t-lawn", comm: "t-comm", re: "t-re" };
  trade.addEventListener("change", function () { render(); var tab = document.getElementById(map[trade.value]); if (tab) tab.click(); });
  town.addEventListener("input", render);
  render();
})();
