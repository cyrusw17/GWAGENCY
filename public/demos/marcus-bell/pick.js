/* profile: "which client are you?" shows one plan at a time. Without this file all of them show. */
(function () {
  var tabs = document.querySelectorAll("[data-whopick]"), panels = document.querySelectorAll("[data-who]");
  if (!tabs.length) return;
  document.body.classList.remove("no-js");
  function show(i) {
    tabs.forEach(function (t) { t.setAttribute("aria-pressed", String(t.dataset.whopick === i)); });
    panels.forEach(function (p) { p.hidden = p.dataset.who !== i; });
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.whopick); }); });
  show("0");
})();
