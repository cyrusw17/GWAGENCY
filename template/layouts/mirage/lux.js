/* mirage: count-up stats, sticky-scroll story, tilt cards and the review belt. Every effect is
   skipped under reduced motion; without this file the page is complete and still. */
(function () {
  document.body.classList.remove("no-js");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!("IntersectionObserver" in window)) return;

  // Count-up numbers, once, when the stats scroll into view.
  var nums = document.querySelectorAll("[data-count]");
  if (!still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, end = Number(el.dataset.count), t0 = performance.now(), dec = String(end).indexOf(".") > -1 ? 1 : 0;
        (function f(t) { var p = Math.min(1, (t - t0) / 1400), v = end * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(f); })(t0);
      });
    }, { threshold: .6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  // Sticky story: the beat nearest the middle of the screen picks the photo on the stage.
  var beats = document.querySelectorAll("[data-beat]"), stage = document.querySelectorAll("[data-stage]");
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = e.target.dataset.beat;
      beats.forEach(function (b) { b.classList.toggle("on", b.dataset.beat === i); });
      stage.forEach(function (im) { im.classList.toggle("on", im.dataset.stage === i); });
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  beats.forEach(function (b) { so.observe(b); });

  // Tilt cards follow the pointer a few degrees, mouse only.
  if (!still && window.matchMedia("(hover: hover)").matches) document.querySelectorAll("[data-tilt]").forEach(function (c) {
    var inr = c.firstElementChild;
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      inr.style.transform = "rotateY(" + (x * 8) + "deg) rotateX(" + (-y * 8) + "deg)";
      inr.style.setProperty("--gx", (x + .5) * 100 + "%"); inr.style.setProperty("--gy", (y + .5) * 100 + "%");
    });
    c.addEventListener("pointerleave", function () { inr.style.transform = ""; });
  });

  // Review belt: duplicate the cards for a seamless loop; pause button and hover stop it.
  var belt = document.querySelector("[data-belt]"), btn = document.querySelector("[data-belt-pause]");
  if (belt && !still) {
    var tr = belt.firstElementChild;
    tr.querySelectorAll(":scope > li").forEach(function (li) { var c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); tr.appendChild(c); });
    belt.classList.add("moving");
    btn.addEventListener("click", function () { var p = btn.getAttribute("aria-pressed") !== "true"; btn.setAttribute("aria-pressed", String(p)); btn.textContent = p ? "Play reviews" : "Pause reviews"; belt.classList.toggle("paused", p); });
  } else if (btn) btn.hidden = true;
})();
