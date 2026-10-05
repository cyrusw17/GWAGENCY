/* text-thread: ask a question chip, get the answer as texts. Without this file the whole
   conversation shows. */
(function () {
  var msgs = document.querySelector("[data-msgs]"), chips = document.querySelector(".chips");
  if (!msgs || !chips) return;
  document.body.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var parts = {};
  msgs.querySelectorAll("[data-q],[data-a]").forEach(function (li) {
    var i = li.dataset.q || li.dataset.a;
    (parts[i] = parts[i] || []).push(li);
    li.remove();
  });
  var busy = false;
  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || busy) return;
    var list = parts[b.dataset.ask]; if (!list) return;
    b.disabled = true; b.setAttribute("aria-disabled", "true");
    busy = true;
    var i = 0;
    (function next() {
      if (i >= list.length) { busy = false; return; }
      var li = list[i++];
      if (reduce || li.dataset.q !== undefined) { msgs.appendChild(li); scroll(); setTimeout(next, reduce ? 0 : 350); return; }
      var dots = document.createElement("li"); dots.className = "in typing"; dots.setAttribute("aria-hidden", "true"); dots.innerHTML = "<span></span><span></span><span></span>";
      msgs.appendChild(dots); scroll();
      setTimeout(function () { dots.remove(); msgs.appendChild(li); scroll(); next(); }, Math.min(1200, 300 + li.textContent.length * 8));
    })();
  });
})();
