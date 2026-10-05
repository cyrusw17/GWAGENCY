/* summit: filter the featured listings from the hero search, and carry the home value address
   into the request form. Without this file every listing shows and the search is hidden. */
(function () {
  document.body.classList.remove("no-js");
  var form = document.querySelector("[data-search]"), cards = document.querySelectorAll(".card[data-area]"),
      count = document.querySelector("[data-count]"), none = document.querySelector("[data-none]");
  function run() {
    var a = form.area.value, max = Number(form.max.value) || Infinity, beds = Number(form.beds.value) || 0, n = 0;
    cards.forEach(function (c) {
      var ok = (!a || c.dataset.area === a) && Number(c.dataset.price) <= max && Number(c.dataset.beds) >= beds;
      c.hidden = !ok; if (ok) n++;
    });
    if (count) count.textContent = n + " of " + cards.length + " homes";
    if (none) none.hidden = n > 0;
  }
  if (form) {
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); document.getElementById("listings").scrollIntoView(); });
    form.addEventListener("change", run);
  }
  var addr = document.querySelector("[data-addr]");
  if (addr) addr.addEventListener("submit", function (e) {
    e.preventDefault();
    var notes = document.getElementById("f-notes"), sell = document.querySelector('#lead input[name=kind][value="Selling"]');
    if (notes && addr.addr.value) notes.value = "Home value for " + addr.addr.value.trim();
    if (sell) sell.checked = true;
    document.getElementById("book").scrollIntoView();
  });
})();
