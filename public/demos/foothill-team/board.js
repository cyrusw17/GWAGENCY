/* open-house: day tabs, the big screen, and the weekend route. Without this file both days'
   rows show and the first house stays on screen. */
(function () {
  document.body.classList.remove("no-js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tabs = document.querySelector(".tabs"), panels = document.querySelectorAll("[data-daypanel]");
  var img = document.querySelector("[data-screen]"), sName = document.querySelector("[data-screen-name]"), sTime = document.querySelector("[data-screen-time]");
  var list = document.querySelector("[data-route]"), nEl = document.querySelector("[data-route-n]"), route = [];

  function day(i) {
    tabs.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.day === i)); });
    panels.forEach(function (p) { p.hidden = +p.dataset.daypanel !== i; });
  }
  if (tabs) { tabs.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) day(+b.dataset.day); }); day(0); }

  function screen(li) {
    document.querySelectorAll(".row.on").forEach(function (r) { r.classList.remove("on"); });
    li.classList.add("on");
    var swap = function () { img.src = li.dataset.img; img.alt = li.dataset.alt; sName.textContent = li.dataset.name; sTime.textContent = li.dataset.time; };
    if (reduce) return swap();
    img.classList.add("flip"); setTimeout(function () { swap(); img.classList.remove("flip"); }, 180);
  }

  function draw() {
    nEl.textContent = "(" + route.length + (route.length === 1 ? " stop)" : " stops)");
    list.innerHTML = "";
    if (!route.length) { var e = document.createElement("li"); e.className = "empty"; e.textContent = "Tap + Route on any open house to plan your weekend."; list.appendChild(e); return; }
    route.forEach(function (li) {
      var it = document.createElement("li");
      it.textContent = li.dataset.time + ", " + li.dataset.name;
      list.appendChild(it);
    });
  }

  document.querySelectorAll(".row").forEach(function (li, i) {
    if (i === 0) li.classList.add("on");
    li.querySelector(".pick").addEventListener("click", function () { screen(li); });
    var add = li.querySelector(".add");
    add.addEventListener("click", function () {
      var at = route.indexOf(li);
      if (at < 0) route.push(li); else route.splice(at, 1);
      add.setAttribute("aria-pressed", String(at < 0));
      add.querySelector("[aria-hidden]").textContent = at < 0 ? "✓ Added" : "+ Route";
      draw();
    });
  });

  /* Sending the route fills the request form. */
  var send = document.querySelector("[data-route-send]");
  if (send) send.addEventListener("click", function () {
    var notes = document.querySelector("#lead textarea[name=notes]");
    if (notes && route.length) notes.value = "My open house route: " + route.map(function (li) { return li.dataset.time + " " + li.dataset.name; }).join("; ");
    var buy = document.querySelector('#lead input[name=kind][value="Touring open houses"]');
    if (buy) buy.checked = true;
  });
})();
