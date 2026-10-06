/* Behavior for designed layouts (template/layouts/), shipped as the page's funnel.js.
   Same rules as the default template's funnel.js: no cookies, nothing stored, GPC and DNT honored,
   leads fall back to a pre-filled text when sending fails. Adds the 3-step quote form from kit.mjs:
   one step at a time, a live ballpark, and phone OR email. */
(function () {
  var C = window.FUNNEL || {};
  var quiet = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  function track(ev, label) {
    if (!C.analytics || quiet) return;
    var body = JSON.stringify({ type: ev, label: String(label || "").slice(0, 60), path: location.pathname, site: C.slug, w: innerWidth });
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(C.analytics, body))) fetch(C.analytics, { method: "POST", body: body, keepalive: true }).catch(function () {});
    } catch (_) {}
  }
  track("pageview");
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-ev]");
    if (a) track(a.getAttribute("data-ev"), a.getAttribute("data-label") || a.textContent.trim());
  }, true);

  // Before/after: a real range input drives --pos, so touch and keyboard both work.
  document.querySelectorAll("[data-compare]").forEach(function (el) {
    var rg = el.querySelector("input[type=range]");
    if (rg) rg.addEventListener("input", function () { el.style.setProperty("--pos", rg.value + "%"); });
  });

  var form = document.getElementById("lead");
  if (!form) return;
  var status = form.querySelector("[role=status]");
  var steps = form.querySelectorAll("fieldset[data-step]");
  var at = 0;

  function show(i, focus) {
    at = i;
    steps.forEach(function (f, j) { f.classList.toggle("on", j === i); });
    if (focus) { var el = steps[i].querySelector("input,button"); if (el) el.focus({ preventScroll: true }); }
  }
  function stepOk(i) {
    var f = steps[i];
    if (f.querySelector("input[name=service]")) {
      var any = !!f.querySelector("input[name=service]:checked"), err = f.querySelector("[data-err]");
      if (err) err.hidden = any;
      if (!any) return false;
    }
    var bad = [].find.call(f.querySelectorAll("input,textarea"), function (x) { return !x.checkValidity(); });
    if (bad) { bad.reportValidity(); return false; }
    return true;
  }
  form.classList.add("js-steps");
  show(0);
  form.addEventListener("click", function (e) {
    if (e.target.closest("[data-next]") && stepOk(at)) show(at + 1, true);
    if (e.target.closest("[data-back]")) show(at - 1, true);
  });

  // A "Book" link on a price row ticks that service and opens step 1.
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      form.querySelectorAll("input[name=service]").forEach(function (c) { if (c.value === a.getAttribute("data-pick")) c.checked = true; });
      estimate(); show(0);
    });
  });

  // Ballpark from the ticked services; the size multiplies the ones marked data-scale.
  var out = form.querySelector("[data-estimate]"), empty = out && out.textContent;
  function estimate() {
    if (!out) return;
    var size = form.querySelector("input[name=size]:checked"), m = size ? Number(size.getAttribute("data-mult")) || 1 : 1;
    var lo = 0, hi = 0, n = 0;
    form.querySelectorAll("input[name=service]:checked").forEach(function (c) {
      var k = c.hasAttribute("data-scale") ? m : 1;
      lo += Number(c.getAttribute("data-lo")) * k; hi += Number(c.getAttribute("data-hi")) * k; n++;
    });
    var r = function (x) { return "$" + (Math.round(x / 5) * 5).toLocaleString("en-US"); };
    out.textContent = n ? (hi > lo ? r(lo) + "–" + r(hi) : r(lo) + "+") : empty;
  }
  form.addEventListener("change", estimate);

  var oneof = form.querySelector("[data-oneof]");
  function contactOk() {
    var ok = !oneof || [].some.call(oneof.querySelectorAll("input"), function (x) { return x.value.trim() && x.checkValidity(); });
    var err = form.querySelector("[data-oneof-err]");
    if (err) err.hidden = ok;
    if (!ok) oneof.querySelector("input").focus();
    return ok;
  }

  function smsFallback(data) {
    if (!C.sms) return false;
    var body = "Hi" + (data.name ? ", I'm " + data.name : "") + ". Interested in " + (data.service || "a quote") +
      (data.zip ? " in " + data.zip : "") + "." + (data.notes ? " " + data.notes : "");
    location.href = "sms:" + C.sms + (/iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?") + "body=" + encodeURIComponent(body);
    return true;
  }
  function done(msg) { form.classList.add("sent"); status.textContent = msg; status.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (at < steps.length - 1) { if (stepOk(at)) show(at + 1, true); return; } // Enter means "Next"
    for (var i = 0; i < steps.length; i++) if (!stepOk(i)) { show(i, true); return; }
    if (!contactOk()) return;
    var data = {};
    new FormData(form).forEach(function (v, k) { v = String(v).trim(); if (v) data[k] = data[k] ? data[k] + ", " + v : v; });
    if (data.size) { data.service = (data.service || "") + " (" + data.size + ")"; delete data.size; }
    if (data.company_url) { done(C.thanks); return; } // honeypot
    data.site = C.slug; data.page = location.pathname;
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    if (!C.plain) track("lead", data.service); // our collector records the lead itself
    if (C.demo) { done(C.demoThanks || "Demo only: on a real site this request goes straight to the owner's phone and email."); return; }
    if (!C.lead) { if (!smsFallback(data)) btn.disabled = false; return; }
    fetch(C.lead, { method: "POST", headers: C.plain ? {} : { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw 0; done(C.thanks); })
      .catch(function () {
        btn.disabled = false;
        status.textContent = "That didn't send. Opening a text message instead so your request still reaches us.";
        smsFallback(data);
      });
  });
})();
