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

  // "Book" links pre-select the package the visitor clicked on.
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      var sel = document.querySelector("#lead select[name=service]");
      if (sel) sel.value = a.getAttribute("data-pick");
    });
  });

  // Lead form. Sends JSON to the site's lead endpoint. If there is no endpoint, or sending fails,
  // it falls back to a pre-filled text message so the lead is never lost.
  var form = document.getElementById("lead");
  if (!form) return;
  var status = form.querySelector("[role=status]");
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

  // Multi-step form (layouts): one easy question first, contact details last.
  // Only runs when the form has data-steps; the default template's one-page form is untouched.
  var steps = form.hasAttribute("data-steps") ? form.querySelectorAll("[data-step]") : [];
  var at = 0, progress = form.querySelector("[data-progress]");
  function show(i) {
    at = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach(function (st, n) { st.classList.toggle("on", n === at); });
    if (progress) progress.textContent = "Step " + (at + 1) + " of " + steps.length;
    // Move focus into the step shown, so Back and Next never leave it on a hidden control.
    var first = steps[at].querySelector("input:checked") || steps[at].querySelector("input:not([type=hidden]),select,textarea,button");
    if (first) first.focus();
  }
  function stepOk() {
    var kind = steps[at].querySelector("[name=kind]");
    if (kind && !steps[at].querySelector("[name=kind]:checked")) {
      kind.setCustomValidity("Pick one to continue."); kind.reportValidity(); kind.setCustomValidity(""); return false;
    }
    var fields = steps[at].querySelectorAll("input,select,textarea");
    for (var n = 0; n < fields.length; n++) if (!fields[n].reportValidity()) return false;
    return true;
  }
  if (steps.length) {
    form.addEventListener("click", function (e) {
      // A tap or mouse click on a first-step choice moves on. Keyboard selection (detail 0) waits for Next,
      // so arrow keys can move between choices.
      if (at === 0 && e.detail > 0 && e.target.closest(".choice")) { setTimeout(function () { show(1); }, 120); return; }
      if (e.target.closest("[data-next]") && stepOk()) show(at + 1);
      if (e.target.closest("[data-back]")) show(at - 1);
    });
    // A package button jumps past the first question, since the visitor already picked.
    document.querySelectorAll("[data-pick]").forEach(function (a) { a.addEventListener("click", function () { if (at === 0) show(1); }); });
  }
  var phone = form.querySelector("[name=phone]"), email = form.querySelector("[name=email]");
  function contactOk() {
    if (!email || !phone) return true;
    var none = !phone.value.trim() && !email.value.trim();
    phone.setCustomValidity(none ? "Add a mobile number or an email so we can reply." : "");
    return !none;
  }
  if (email) [phone, email].forEach(function (el) { el && el.addEventListener("input", contactOk); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (steps.length && at < steps.length - 1) { if (stepOk()) show(at + 1); return; } // Enter on an early step
    contactOk();
    if (!form.reportValidity()) return;
    var fd = new FormData(form), data = {};
    fd.forEach(function (v, k) { data[k] = String(v).trim(); });
    if (data.kind) { data.service = data.kind + ": " + (data.service || ""); delete data.kind; }
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
