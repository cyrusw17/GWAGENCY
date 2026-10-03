/* GroundWork Funnel Template: page behavior. Stores nothing in the browser, sets no cookies.
   Config comes from the inline window.FUNNEL object written by tools/build.mjs. */
(function () {
  var C = window.FUNNEL || {};

  // Conversion events (call, text, book, form). Only sent when the site has an analytics endpoint,
  // and never when the visitor has Global Privacy Control or Do Not Track on.
  var quiet = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  function track(ev, label) {
    if (!C.analytics || quiet) return;
    var body = JSON.stringify({ type: ev, label: String(label || "").slice(0, 60), path: location.pathname, site: C.slug, w: innerWidth });
    try {
      // text/plain keeps the request "simple", so a collector on another domain needs no CORS preflight.
      if (!(navigator.sendBeacon && navigator.sendBeacon(C.analytics, body))) fetch(C.analytics, { method: "POST", body: body, keepalive: true }).catch(function () {});
    } catch (_) {}
  }
  track("pageview");
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-ev]");
    if (a) track(a.getAttribute("data-ev"), a.getAttribute("data-label") || a.textContent.trim());
  }, true);

  // Before/after compare: a real range input drives --pos, so touch and keyboard both work.
  document.querySelectorAll("[data-compare]").forEach(function (el) {
    var rg = el.querySelector("input[type=range]");
    if (rg) rg.addEventListener("input", function () { el.style.setProperty("--pos", rg.value + "%"); });
  });

  // "Book" links pre-select the package the visitor clicked on (a select, or a checkbox in the step form).
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-pick");
      var sel = document.querySelector("#lead select[name=service]");
      if (sel) sel.value = v;
      document.querySelectorAll("#lead input[name=service]").forEach(function (c) { if (c.value === v) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); } });
    });
  });

  // Lead form. Sends JSON to the site's lead endpoint. If there is no endpoint, or sending fails,
  // it falls back to a pre-filled text message so the lead is never lost.
  var form = document.getElementById("lead");
  if (!form) return;
  var status = form.querySelector("[role=status]");

  // Step form (template/kit.mjs): one fieldset at a time, contact details last.
  var steps = form.querySelectorAll("fieldset[data-step]");
  var at = 0;
  function show(i, focus) {
    at = i;
    steps.forEach(function (f, j) { f.classList.toggle("on", j === i); });
    if (focus) { var el = steps[i].querySelector("input:not([type=hidden]),button"); if (el) el.focus({ preventScroll: true }); }
  }
  function stepOk(i) {
    var f = steps[i], err;
    if (f.querySelector("input[name=service][type=checkbox]")) {
      var any = f.querySelector("input[name=service]:checked");
      err = f.querySelector("[data-err]");
      if (err) err.hidden = !!any;
      if (!any) return false;
    }
    var bad = Array.prototype.find.call(f.querySelectorAll("input,select,textarea"), function (x) { return !x.checkValidity(); });
    if (bad) { bad.reportValidity(); return false; }
    return true;
  }
  if (steps.length) {
    form.classList.add("js-steps");
    show(0);
    form.addEventListener("click", function (e) {
      if (e.target.closest("[data-next]") && stepOk(at)) show(at + 1, true);
      if (e.target.closest("[data-back]")) show(at - 1, true);
    });
    // A "Book" link from a price row lands on step 1 with that service ticked.
    document.addEventListener("click", function (e) { if (e.target.closest("[data-pick]")) show(0); }, true);
  }

  // Ballpark price from the ticked services. Size multiplies the ones marked data-scale.
  var out = form.querySelector("[data-estimate]");
  function estimate() {
    if (!out) return;
    var size = form.querySelector("input[name=size]:checked"), m = size ? Number(size.getAttribute("data-mult")) || 1 : 1;
    var lo = 0, hi = 0, n = 0;
    form.querySelectorAll("input[name=service]:checked").forEach(function (c) {
      var k = c.hasAttribute("data-scale") ? m : 1;
      lo += Number(c.getAttribute("data-lo")) * k; hi += Number(c.getAttribute("data-hi")) * k; n++;
    });
    var r = function (x) { return "$" + (Math.round(x / 5) * 5).toLocaleString("en-US"); };
    out.textContent = n ? (hi > lo ? r(lo) + "–" + r(hi) : r(lo) + "+") : out.getAttribute("data-empty") || out.textContent;
  }
  if (out) { out.setAttribute("data-empty", out.textContent); form.addEventListener("change", estimate); }

  // Phone or email: either one is enough.
  var oneof = form.querySelector("[data-oneof]");
  function contactOk() {
    if (!oneof) return true;
    var ok = Array.prototype.some.call(oneof.querySelectorAll("input"), function (x) { return x.value.trim() && x.checkValidity(); });
    var err = form.querySelector("[data-oneof-err]");
    if (err) err.hidden = ok;
    if (!ok) oneof.querySelector("input").focus();
    return ok;
  }
  function smsFallback(data) {
    var to = C.sms;
    if (!to) return false;
    var body = "Hi, I'm " + data.name + ". Interested in " + (data.service || "a quote") +
      (data.zip ? " in " + data.zip : "") + "." + (data.notes ? " " + data.notes : "");
    var sep = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?";
    location.href = "sms:" + to + sep + "body=" + encodeURIComponent(body);
    return true;
  }
  function done(msg) { form.classList.add("sent"); status.textContent = msg; status.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (steps.length) { for (var i = 0; i < steps.length; i++) if (!stepOk(i)) { show(i, true); return; } }
    if (!form.reportValidity() || !contactOk()) return;
    var fd = new FormData(form), data = {};
    fd.forEach(function (v, k) { v = String(v).trim(); if (v) data[k] = data[k] ? data[k] + ", " + v : v; });
    if (data.size) { data.service = (data.service || "") + " (" + data.size + ")"; delete data.size; }
    data.name = data.name || "";
    if (data.company_url) { done(C.thanks); return; } // honeypot
    delete data.company_url;
    data.site = C.slug; data.page = location.pathname;
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    if (!C.plain) track("lead", data.service); // our collector records the lead itself

    if (C.demo) { done(C.demoThanks || "Demo only: on a real site this request goes straight to the owner's phone and email."); return; }
    if (!C.lead) { if (!smsFallback(data)) { btn.disabled = false; } return; }

    fetch(C.lead, { method: "POST", headers: C.plain ? {} : { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw 0; done(C.thanks); })
      .catch(function () {
        btn.disabled = false;
        status.textContent = "That didn't send. Opening a text message instead so your request still reaches us.";
        smsFallback(data);
      });
  });
})();
