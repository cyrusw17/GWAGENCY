/*
  GroundWork-Web design system v3. Site behavior. Replaces the retired main.js.
  Stores nothing in the browser itself (analytics.js handles the opt-in cookies).
  Needs config.js first (window.GW).
*/
(function () {
  var GW = window.GW || {};
  var doc = document;
  function all(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  var params = new URLSearchParams(location.search);

  // Attribution travels in the links, not in storage. Only tags already in this page's URL are passed on.
  var keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "demo", "city", "niche", "trade"];
  var attr = {};
  keep.forEach(function (k) { if (params.get(k)) attr[k] = params.get(k).slice(0, 60); });
  window.gwAttr = attr;
  if (Object.keys(attr).length) {
    all('a[href^="/"]').forEach(function (a) {
      try {
        var u = new URL(a.getAttribute("href"), location.origin);
        Object.keys(attr).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, attr[k]); });
        a.setAttribute("href", u.pathname + u.search + u.hash);
      } catch (_) {}
    });
  }

  // Mobile menu
  var header = doc.querySelector(".site-header"), btn = doc.querySelector(".menu-btn");
  if (header && btn) {
    var links = header.querySelector(".links");
    function setOpen(open) {
      header.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Close" : "Menu";
    }
    btn.addEventListener("click", function () { setOpen(!header.classList.contains("open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && header.classList.contains("open")) { setOpen(false); btn.focus(); } });
    if (links) links.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  }

  // Current page marker
  all(".links a, .footer-nav a").forEach(function (a) {
    var h = a.getAttribute("href") || "";
    var path = h.split("?")[0];
    if (path && path !== "/" && location.pathname.indexOf(path) === 0) a.setAttribute("aria-current", "page");
  });

  // Year
  all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Scale live demo previews to fit their frame
  function fitFrames() {
    all(".frame-view").forEach(function (v) {
      var f = v.querySelector("iframe");
      if (!f) return;
      var s = v.clientWidth / 1280;
      f.style.transform = "scale(" + s + ")";
      f.style.height = (v.clientHeight / s) + "px";
    });
  }
  fitFrames();
  addEventListener("resize", fitFrames);

  // /start/: plan and demo come from the query (?plan=host&demo=bayou)
  var planQ = params.get("plan"), demoQ = params.get("demo");
  if (planQ === "host" || planQ === "grow") { var pr = doc.querySelector('input[name="plan"][value="' + planQ + '"]'); if (pr) pr.checked = true; }
  if (demoQ) { var ds = doc.querySelector('select[name="demo"]'); if (ds && [].some.call(ds.options, function (o) { return o.value === demoQ; })) ds.value = demoQ; }

  // /start/: order summary follows the plan radio. Prices come from config.js.
  var sumPlan = doc.querySelector("[data-summary-plan]");
  if (sumPlan) {
    var P = GW.pricing || {};
    var nameEl = doc.querySelector("[data-summary-plan-name]");
    var paint = function () {
      var r = doc.querySelector("input[name=plan]:checked");
      var plan = r && r.value === "host" ? "host" : "grow";
      sumPlan.textContent = "$" + P[plan] + "/mo";
      if (nameEl) nameEl.textContent = plan === "host" ? "Host" : "Grow";
    };
    all("input[name=plan]").forEach(function (r) { r.addEventListener("change", paint); });
    paint();
  }

  // Calendly: a plain link out. No embed, so no third-party script or cookies load on our pages.
  all("[data-calendly-link]").forEach(function (a) {
    if (!GW.calendlyUrl) { a.hidden = true; return; }
    try {
      var u = new URL(GW.calendlyUrl);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { if (attr[k]) u.searchParams.set(k, attr[k]); });
      a.href = u.toString();
    } catch (_) { a.href = GW.calendlyUrl; }
  });

  // Lead forms (start and audit): validate, POST, then Stripe or the thanks page.
  all("form[data-gw-form]").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      all(".field-error", form).forEach(function (n) { n.remove(); });
      all("[aria-invalid]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
      var fields = all("input, textarea, select", form).filter(function (el) { return el.willValidate && !el.hidden && el.type !== "hidden"; });
      var bad = fields.filter(function (el) { return !el.checkValidity(); });
      if (bad.length) {
        bad.forEach(function (el) {
          el.setAttribute("aria-invalid", "true");
          var msg = doc.createElement("p");
          msg.className = "field-error";
          msg.id = (el.name || "field") + "-error";
          el.setAttribute("aria-describedby", msg.id);
          msg.textContent = el.validity.typeMismatch && el.type === "email" ? "Use an email like name@shop.com." : "Add this so we know how to reach you.";
          var label = el.closest("label");
          if (label) label.insertAdjacentElement("afterend", msg); else el.after(msg);
        });
        bad[0].focus();
        return;
      }
      var data = Object.fromEntries(new FormData(form).entries());
      // Where this lead came from: the campaign tags carried through links, the form's page, and the
      // referring site when the visitor landed straight on the form page. Sent with the form they chose to send.
      var src = Object.assign({}, window.gwAttr || {}, { page: location.host + location.pathname });
      try { var rh = document.referrer ? new URL(document.referrer).hostname : ""; if (rh && !/(^|\.)groundwork-web\.com$/.test(rh) && rh !== location.hostname) src.ref = rh; } catch (_) {}
      data.attribution = JSON.stringify(src);
      data.page = location.pathname;
      data.form = form.dataset.gwForm;
      var submit = form.querySelector("button[type=submit]");
      var status = form.querySelector("[role=status]");
      function say(m) { if (status) status.textContent = m; }
      if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent; submit.textContent = "Sending"; submit.setAttribute("aria-busy", "true"); }
      say("Sending your details.");

      var delivered = false;
      if (GW.formEndpoint) {
        try {
          var r = await fetch(GW.formEndpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) });
          delivered = r.ok;
        } catch (_) { delivered = false; }
      }
      if (!delivered) {
        var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
        window.open("mailto:" + GW.email + "?subject=" + encodeURIComponent("[GroundWork] " + form.dataset.gwForm) + "&body=" + encodeURIComponent(body), "_blank");
        if (form.dataset.gwForm === "start") {
          say("We could not send your details. Email us from the window that opened, or try again.");
          if (submit) { submit.disabled = false; submit.textContent = submit.dataset.label || "Continue to checkout"; submit.removeAttribute("aria-busy"); }
          return;
        }
      }
      if (delivered && typeof window.GW_submit === "function") window.GW_submit(form.dataset.gwForm);
      if (form.dataset.gwForm === "start") {
        var plan = data.plan === "host" ? "host" : "grow";
        var link = GW.stripe && (GW.stripe[plan] || GW.stripe.build);
        if (link) {
          var u = new URL(link);
          if (data.email) u.searchParams.set("prefilled_email", data.email);
          u.searchParams.set("client_reference_id", (data.shop || "shop").replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 60) + "--" + plan);
          say("Taking you to secure checkout.");
          location.href = u.toString();
          return;
        }
      }
      say("Received. Taking you to the confirmation page.");
      location.href = "/thanks/?from=" + encodeURIComponent(form.dataset.gwForm);
    });
  });

  // Thanks page: show the block that matches ?from= (no personal data in the URL or in storage)
  var thanks = doc.querySelector("[data-thanks]");
  if (thanks) {
    var from = params.get("from") || "";
    var shown = false;
    all("[data-thanks-if]").forEach(function (el) { var on = el.dataset.thanksIf === from; el.hidden = !on; if (on) shown = true; });
    if (!shown) { var d = doc.querySelector('[data-thanks-if=""]'); if (d) d.hidden = false; }
  }
})();
