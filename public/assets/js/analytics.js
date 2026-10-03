/*
  GroundWork first-party analytics (browser side).
  - Sends: page views, link clicks, form submits, and a fixed list of interaction counts
    (see docs/redesign/TRACKING.md). Nothing else.
  - Stores nothing in the browser. No cookies, no IDs.
  - Stays silent if the visitor has Global Privacy Control or Do Not Track on.
  Server side: /api/track.php (see /privacy/).
*/
(function () {
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  var endpoint = (window.GW && window.GW.analyticsEndpoint) || "/api/track.php";
  var q = new URLSearchParams(location.search);

  function send(ev) {
    ev.path = location.pathname;
    ev.ref = document.referrer || "";
    ev.w = window.innerWidth;
    ["utm_source", "utm_medium", "utm_campaign", "demo"].forEach(function (k) { if (q.get(k)) ev[k] = q.get(k); });
    var body = JSON.stringify(ev);
    try {
      if (navigator.sendBeacon) { navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" })); return; }
      fetch(endpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(function () {});
    } catch (_) {}
  }

  // Page view
  send({ type: "pageview" });

  // Interaction counts from the design system (ui.js). Label must be on the server whitelist; no visitor input.
  window.GW_track = function (label) { send({ type: "ui", label: String(label).slice(0, 40) }); };

  // Every link click (internal, external, tel:, sms:, #anchors). Label = data-track or visible text.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var label = a.getAttribute("data-track") || (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || a.getAttribute("aria-label") || "";
    send({ type: "click", target: a.href, label: label });
  }, true);

  // Lead form submits are counted by site.js only after the form was actually delivered
  // (never on a failed validation). Label is the form name; nothing the visitor typed is sent.
  window.GW_submit = function (label) { send({ type: "submit", label: String(label).slice(0, 40) }); };
})();
