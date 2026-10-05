/* music-row: buy / sell switch in the header card, expanding listing panels, and the staging
   before/after slider. Without this file both header forms show and the slider sits at 50%. */
(function () {
  document.body.classList.remove("no-js");
  var segs = document.querySelectorAll("[data-seg]"), panes = document.querySelectorAll("[data-pane]");
  function seg(v) {
    segs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.seg === v)); });
    panes.forEach(function (p) { p.hidden = p.dataset.pane !== v; });
  }
  segs.forEach(function (b) {
    b.addEventListener("click", function () { seg(b.dataset.seg); });
  });
  seg("buy");

  // Buy: open the first listing in that neighborhood. Sell: carry the address into the form.
  var panels = document.querySelectorAll(".panel");
  function open(p) { panels.forEach(function (x) { x.classList.toggle("open", x === p); }); }
  panels.forEach(function (p) { p.addEventListener("mouseenter", function () { open(p); }); p.addEventListener("focus", function () { open(p); }); p.addEventListener("click", function () { open(p); }); });
  var buy = document.getElementById("pane-buy"), sell = document.getElementById("pane-sell");
  buy.addEventListener("submit", function (e) {
    e.preventDefault();
    var hood = buy.hood.value, hit = [].find.call(panels, function (p) { return p.dataset.hood === hood; });
    if (hit) open(hit);
    document.getElementById("homes").scrollIntoView();
  });
  sell.addEventListener("submit", function (e) {
    e.preventDefault();
    var notes = document.getElementById("f-notes"), r = document.querySelector('#lead input[name=kind][value="Selling"]');
    if (notes && sell.addr.value) notes.value = "Home value for " + sell.addr.value.trim();
    if (r) r.checked = true;
    document.getElementById("book").scrollIntoView();
  });

  var ba = document.querySelector("[data-ba]"), range = document.querySelector("[data-ba-range]");
  if (ba && range) range.addEventListener("input", function () { ba.style.setProperty("--pos", range.value + "%"); });
})();
