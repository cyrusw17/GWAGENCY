/* listing-book: the price filter and the payment worksheet. Without this file every listing
   shows and the worksheet keeps the featured home's server-rendered numbers. */
(function () {
  document.body.classList.remove("no-js");

  /* Filter */
  var filters = document.querySelector(".filters"), cards = document.querySelectorAll(".card"), count = document.querySelector("[data-count]");
  function show(f) {
    var n = 0;
    cards.forEach(function (c) { var on = f === "all" || c.dataset.band === f; c.hidden = !on; if (on) n++; });
    count.textContent = n === 1 ? "1 more home in the book" : n + " more homes in the book";
  }
  if (filters) {
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      filters.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      show(b.dataset.f);
    });
    show("all");
  }

  /* Payment worksheet */
  var ws = document.querySelector("[data-ws]");
  if (!ws) return;
  var homes = JSON.parse(ws.dataset.ws), sel = ws.querySelector("#ws-home"), down = ws.querySelector("#ws-down"), rate = ws.querySelector("#ws-rate");
  var t = document.querySelector(".ticket");
  var usd = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var put = function (k, v) { t.querySelector('[data-r="' + k + '"]').textContent = v; };
  function calc() {
    var h = homes.filter(function (x) { return x.id === sel.value; })[0] || homes[0];
    var d = +down.value, r = +rate.value, loan = h.price * (1 - d / 100), m = r / 1200, n = 360;
    var pi = m ? loan * m / (1 - Math.pow(1 + m, -n)) : loan / n;
    ws.querySelector('[data-o="down"]').textContent = d + "% (" + usd(h.price * d / 100) + ")";
    ws.querySelector('[data-o="rate"]').textContent = r + "%";
    put("loan", usd(loan)); put("pi", usd(pi)); put("ti", usd(h.ti)); put("hoa", usd(h.hoa)); put("total", usd(pi + h.ti + h.hoa));
  }
  [sel, down, rate].forEach(function (i) { i.addEventListener("input", calc); });
  document.querySelectorAll("[data-load]").forEach(function (a) {
    a.addEventListener("click", function () { sel.value = a.dataset.load; calc(); });
  });
  calc();
})();
