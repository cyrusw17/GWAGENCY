/* field-guide: the neighborhood map and the rough net sheet. Without this file every field note
   shows in a list and the net sheet keeps its server-rendered numbers. */
(function () {
  document.body.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Map: one open field note at a time */
  var notes = document.querySelector("[data-notes]");
  if (notes) {
    var pins = document.querySelectorAll("[data-pin]");
    var open = function (key, focus) {
      notes.querySelectorAll("[data-note]").forEach(function (n) { n.classList.toggle("on", n.dataset.note === key); });
      pins.forEach(function (p) {
        var on = p.dataset.pin === key;
        p.classList.toggle("on", on);
        p.querySelector("a").setAttribute("aria-current", on ? "true" : "false");
      });
      var n = document.getElementById("note-" + key);
      if (n && !reduce) { n.classList.remove("in"); void n.offsetWidth; n.classList.add("in"); }
      if (n && focus && window.matchMedia("(max-width:899px)").matches) n.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    };
    document.querySelectorAll("[data-pin-link]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(a.dataset.pinLink, true); });
    });
    if (pins[0]) open(pins[0].dataset.pin, false);
  }

  /* Rough net sheet */
  var form = document.querySelector("[data-net]");
  if (form) {
    var cfg = JSON.parse(form.dataset.net), slip = document.querySelector(".slip");
    var price = form.querySelector("#n-price"), comm = form.querySelector("#n-comm"), pay = form.querySelector("#n-pay");
    var usd = function (n) { return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US"); };
    var put = function (sel, v) { var el = slip.querySelector('[data-r="' + sel + '"]'); if (el) el.textContent = v; };
    var calc = function () {
      var p = +price.value, c = +comm.value, o = Math.max(0, +pay.value || 0);
      var cm = p * c / 100, cs = p * cfg.costs / 100;
      form.querySelector('[data-out="price"]').textContent = usd(p);
      form.querySelector('[data-out="comm"]').textContent = c + "%";
      put("price", usd(p)); put("comm", "- " + usd(cm)); put("costs", "- " + usd(cs)); put("pay", "- " + usd(o));
      put("net", usd(p - cm - cs - o));
    };
    [price, comm, pay].forEach(function (i) { i.addEventListener("input", calc); });
    calc();
  }
})();
