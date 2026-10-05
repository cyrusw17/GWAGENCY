/* casa: header slideshow (pausable, still under reduced motion), For sale / Sold tabs, and the
   home value card, which carries the address into the request form. */
(function () {
  document.body.classList.remove("no-js");
  var slides = document.querySelectorAll("[data-slides] .slide"), dots = document.querySelectorAll(".dots i"),
      pause = document.querySelector("[data-pause]"), i = 0, timer = null;
  function go(n) { slides[i].classList.remove("on"); if (dots[i]) dots[i].classList.remove("on"); i = n % slides.length; slides[i].classList.add("on"); if (dots[i]) dots[i].classList.add("on"); }
  function play() { timer = setInterval(function () { go(i + 1); }, 6000); }
  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    play();
    pause.addEventListener("click", function () {
      var p = pause.getAttribute("aria-pressed") === "true";
      if (p) { play(); pause.textContent = "Pause photos"; } else { clearInterval(timer); pause.textContent = "Play photos"; }
      pause.setAttribute("aria-pressed", String(!p));
    });
  } else if (pause) pause.hidden = true;

  var tabs = document.querySelectorAll("[data-tab]"), items = document.querySelectorAll("[data-status]");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-pressed", String(x === t)); });
      items.forEach(function (li) { li.hidden = t.dataset.tab !== "All" && li.dataset.status !== t.dataset.tab; });
    });
  });

  var worth = document.querySelector("[data-worth]");
  if (worth) worth.addEventListener("submit", function (e) {
    e.preventDefault();
    var notes = document.getElementById("f-notes"), sell = document.querySelector('#lead input[name=kind][value="Selling"]');
    if (notes && worth.addr.value) notes.value = "Home value for " + worth.addr.value.trim();
    if (sell) sell.checked = true;
    document.getElementById("book").scrollIntoView();
  });
})();
