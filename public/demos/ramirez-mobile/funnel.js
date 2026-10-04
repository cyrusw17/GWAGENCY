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

  // "Latest review N days ago", counted from today rather than from the build date.
  document.querySelectorAll("[data-since]").forEach(function (el) {
    var d = Math.round((Date.now() - Date.parse(el.getAttribute("data-since") + "T12:00:00Z")) / 864e5);
    if (d >= 0) el.textContent = d < 1 ? "today" : d < 2 ? "yesterday" : d < 60 ? d + " days ago" : Math.round(d / 30) + " months ago";
  });

  // "Choose <package>" buttons pre-select that package in step 1 of the form.
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      document.querySelectorAll("#lead input[name=service]").forEach(function (i) {
        if (i.value === a.getAttribute("data-pick")) i.checked = true;
      });
    });
  });

  // Price picker: package price plus add-ons, and its Book button carries the answers into the form.
  document.querySelectorAll("[data-est]").forEach(function (est) {
    var total = est.querySelector("[data-est-total]"), sum = est.querySelector("[data-est-sum]"), book = est.querySelector("[data-est-book]");
    function update() {
      var n = 0, pick = "", words = [];
      est.querySelectorAll("input:checked").forEach(function (i) {
        n += Number(i.getAttribute("data-price") || 0) + Number(i.getAttribute("data-add") || 0);
        if (i.hasAttribute("data-pick-pkg")) pick = i.getAttribute("data-pick-pkg");
        words.push(i.getAttribute("data-text"));
      });
      total.textContent = "$" + n.toLocaleString("en-US");
      sum.textContent = words.join(" · ");
      if (book) book.setAttribute("data-pick", pick);
    }
    est.addEventListener("change", update);
    est.addEventListener("submit", function (e) { e.preventDefault(); });
    if (book) book.addEventListener("click", function () {
      var notes = document.querySelector("#lead textarea[name=notes]");
      if (!notes) return;
      // Replace an earlier picker line rather than stacking old picks next to new ones.
      var line = "From the price picker: " + sum.textContent + " (" + total.textContent + ")";
      notes.value = /^From the price picker: .*$/m.test(notes.value) ? notes.value.replace(/^From the price picker: .*$/m, line) : (notes.value ? line + "\n" + notes.value : line);
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
  var next = form.querySelector("[data-next]");
  next.addEventListener("click", function () {
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
    if (!form.classList.contains("step2")) { next.click(); return; } // Enter on step 1 means "Next"
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
