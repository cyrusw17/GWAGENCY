/* kitchen-table: "fix it or leave it". Guess first, then the answer shows. Without this file
   every answer shows. */
(function () {
  var cards = document.querySelectorAll("[data-card]"), score = document.querySelector("[data-score]");
  if (!cards.length) return;
  document.body.classList.remove("no-js");
  var done = 0, right = 0;
  cards.forEach(function (c) {
    var ans = c.querySelector("[data-ans]");
    ans.hidden = true;
    c.querySelectorAll("[data-guess]").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        if (!ans.hidden) return;
        var ok = b.dataset.guess === ans.dataset.ans;
        b.setAttribute("aria-pressed", "true");
        c.classList.add(ok ? "ok" : "miss");
        ans.hidden = false; done++; if (ok) right++;
        c.querySelectorAll("[data-guess]").forEach(function (x) { x.disabled = true; });
        if (score) score.textContent = "You matched us on " + right + " of " + done + ".";
      });
    });
  });
})();
