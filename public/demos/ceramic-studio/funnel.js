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

  // "Choose <package>" buttons pre-select that package in step 1 of the form.
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      document.querySelectorAll("#lead input[name=service]").forEach(function (i) {
        if (i.value === a.getAttribute("data-pick")) i.checked = true;
      });
    });
  });

  // Lead form. Sends JSON to the site's lead endpoint. If there is no endpoint, or sending fails,
  // it falls back to a pre-filled text message so the lead is never lost.
  var form = document.getElementById("lead");
  if (!form) return;
  var status = form.querySelector("[role=status]");
  var stepNo = form.querySelector("[data-step]");

  // Two steps: an easy first question, contact details last. Without JS both steps simply show.
  form.classList.add("js-steps");
  function choice() {
    var picked = [].filter.call(form.querySelectorAll("input[name=service]"), function (i) { return i.checked; });
    return picked.map(function (i) { return i.value; }).join(", ");
  }
  form.querySelector("[data-next]").addEventListener("click", function () {
    if (!choice()) { status.textContent = "Pick at least one option."; return; }
    status.textContent = "";
    form.classList.add("step2");
    stepNo.textContent = "2";
    form.querySelector("input[name=phone]").focus();
  });
  function smsFallback(data) {
    var to = C.sms;
    if (!to) return false;
    var body = "Hi" + (data.name ? ", I'm " + data.name : "") + ". Interested in " + (data.service || "a quote") +
      (data.zip ? " in " + data.zip : "") + "." + (data.notes ? " " + data.notes : "");
    var sep = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?";
    location.href = "sms:" + to + sep + "body=" + encodeURIComponent(body);
    return true;
  }
  function done(msg) { form.classList.add("sent"); status.textContent = msg; status.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var fd = new FormData(form), data = {};
    fd.forEach(function (v, k) { if (k !== "service") data[k] = String(v).trim(); });
    data.service = choice();
    if (data.company_url) { done(C.thanks); return; } // honeypot
    delete data.company_url;
    data.site = C.slug; data.page = location.pathname;
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    if (!C.plain) track("lead", data.service); // our collector records the lead itself

    if (C.demo) { done("Demo only: on a real site this request goes straight to the owner's phone and email."); return; }
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
