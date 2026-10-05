/*
  Checklist forms in blog posts. A form with data-guide="<checklist-slug>" asks for an email and
  the business name (website optional), sends them to GW.formEndpoint as a "guide" lead, then shows
  the download that sits hidden inside the form ([data-guide-download]) right away. If the endpoint
  can't be reached the download still shows: the reader asked for it and shouldn't pay for our outage.
  Markup: /mnt/project-files/web/guide-form/README.md
*/
(function () {
  "use strict";
  document.querySelectorAll("form[data-guide]").forEach(function (form) {
    var status = form.querySelector("[data-guide-status]"), dl = form.querySelector("[data-guide-download]");
    var say = function (msg) { if (status) status.textContent = msg; };
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = form.elements.email, shop = form.elements.shop, site = form.elements.links;
      [email, shop].forEach(function (i) { i.removeAttribute("aria-invalid"); });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.setAttribute("aria-invalid", "true"); say("Add the email to send the checklist to."); return email.focus(); }
      if (!shop.value.trim()) { shop.setAttribute("aria-invalid", "true"); say("Add your business name."); return shop.focus(); }
      var btn = form.querySelector("button[type=submit], button:not([type])");
      if (btn) btn.disabled = true;
      say("Sending...");
      var G = window.GW || {}, data = {
        form: "guide", guide: form.getAttribute("data-guide"), email: email.value.trim(), shop: shop.value.trim(),
        links: site ? site.value.trim() : "", attribution: (location.pathname + location.search).slice(0, 500),
        company_url: form.elements.company_url ? form.elements.company_url.value : ""
      };
      if (G.formEndpoint) {
        try { await fetch(G.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }); } catch (_) {}
      }
      if (typeof window.GW_submit === "function") window.GW_submit("guide");
      form.querySelectorAll("[data-guide-fields]").forEach(function (f) { f.hidden = true; });
      if (dl) { dl.hidden = false; var a = dl.querySelector("a"); if (a) a.focus(); }
      say("");
    });
  });
})();
