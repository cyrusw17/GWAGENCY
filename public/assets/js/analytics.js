/*
  GroundWork first-party analytics (browser side), opt-in only.
  - Nothing is sent and no tracking cookie is set until the visitor taps "Allow" on the banner.
  - Global Privacy Control or Do Not Track counts as "No thanks": no banner, nothing sent.
  - After "Allow": page views, link clicks, form submits (after delivery) and a fixed list of
    interaction labels (see docs/analytics.md) go to /api/track.php, our own server. No third parties.
  - Cookies (first-party, see /privacy/#cookies):
      gw_consent  the visitor's choice ("1" allow, "0" no thanks), 6 months. Essential: remembers the answer.
      gw_vid      random visitor id, 6 months. Only after "Allow".
      gw_sid      random visit id, expires after 30 minutes without activity. Only after "Allow".
  - Any element with data-cookie-settings reopens the banner so the choice can be changed.
*/
(function () {
  var MONTHS6 = 15552000, VISIT = 1800;
  var endpoint = (window.GW && window.GW.analyticsEndpoint) || "/api/track.php";
  var q = new URLSearchParams(location.search);
  var gpc = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
  // One choice covers every *.groundwork-web.com selling page.
  var domain = /(^|\.)groundwork-web\.com$/.test(location.hostname) ? "; domain=.groundwork-web.com" : "";
  var secure = location.protocol === "https:" ? "; secure" : "";

  function getC(n) { var m = document.cookie.match("(?:^|; )" + n + "=([^;]*)"); return m ? m[1] : ""; }
  function setC(n, v, age) { document.cookie = n + "=" + v + "; path=/; max-age=" + age + "; samesite=lax" + domain + secure; }
  function id() {
    var a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function allowed() { return !gpc && getC("gw_consent") === "1"; }

  function send(ev) {
    if (!allowed()) return;
    var vid = getC("gw_vid"); if (!vid) { vid = id(); }
    var sid = getC("gw_sid"); if (!sid) { sid = id(); ev.newvisit = 1; }
    setC("gw_vid", vid, MONTHS6);       // keeps the 6 months rolling from the last visit
    setC("gw_sid", sid, VISIT);         // sliding 30-minute visit
    ev.vid = vid; ev.sid = sid;
    ev.path = location.pathname;
    ev.ref = document.referrer || "";
    ev.w = window.innerWidth;
    ["utm_source", "utm_medium", "utm_campaign", "demo"].forEach(function (k) { if (q.get(k)) ev[k] = q.get(k); });
    var body = JSON.stringify(ev);
    try {
      // text/plain keeps the request simple; the server reads the JSON body either way.
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }))) return;
      fetch(endpoint, { method: "POST", body: body, keepalive: true, credentials: "same-origin", headers: { "Content-Type": "text/plain" } }).catch(function () {});
    } catch (_) {}
  }

  // Hooks used by ui.js, site.js and guide.js. Always defined; they do nothing without consent.
  // Interaction labels must be on the server whitelist; nothing the visitor types is sent.
  window.GW_track = function (label) { send({ type: "ui", label: String(label).slice(0, 40) }); };
  window.GW_submit = function (label) { send({ type: "submit", label: String(label).slice(0, 40) }); };

  // Every link click (internal, external, tel:, sms:, #anchors). Label = data-track or visible text.
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target : null;
    if (!el) return;
    var opener = el.closest("[data-cookie-settings]");
    if (opener) { e.preventDefault(); banner(true); return; }
    var a = el.closest("a[href]");
    if (!a || !allowed()) return;
    var label = a.getAttribute("data-track") || (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || a.getAttribute("aria-label") || "";
    send({ type: "click", target: a.href, label: label });
  }, true);

  function choose(yes) {
    setC("gw_consent", yes ? "1" : "0", MONTHS6);
    if (!yes) { setC("gw_vid", "", 0); setC("gw_sid", "", 0); }
    var b = document.getElementById("gw-consent"); if (b) b.remove();
    if (yes) send({ type: "pageview" });   // count the page they agreed on
  }

  function banner(reopen) {
    if (document.getElementById("gw-consent")) return;
    var css = document.createElement("style");
    css.textContent =
      "#gw-consent{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:430px;box-sizing:border-box;" +
      "background:#fffdf8;color:#1d1d1b;border:1px solid #c9c3b6;border-radius:10px;padding:16px 18px;" +
      "font:15px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.18)}" +
      "#gw-consent p{margin:0 0 12px}#gw-consent a{color:inherit;text-decoration:underline}" +
      "#gw-consent .r{display:flex;gap:10px;flex-wrap:wrap}" +
      "#gw-consent button{flex:1 1 120px;min-height:44px;padding:10px 14px;border-radius:7px;border:1.5px solid #1d1d1b;" +
      "font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer;background:#fffdf8;color:#1d1d1b}" +
      "#gw-consent button:focus-visible{outline:3px solid #2f6fdf;outline-offset:2px}" +
      "#gw-consent .gpc{font-size:13px;color:#55524b;margin:10px 0 0}" +
      "@media (max-width:560px){#gw-consent{left:8px;right:8px;padding:10px 12px;font-size:14px}#gw-consent p{margin-bottom:8px}" +
      "#gw-consent button{min-height:44px;padding:8px 10px;font-size:14px}}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.id = "gw-consent";
    d.setAttribute("role", "region");
    d.setAttribute("aria-label", "Cookie choice");
    d.innerHTML =
      "<p><strong>Can we count your visit</strong> with a few first-party cookies? No ads, nothing sold or shared. <a href=\"/privacy/#cookies\">Details</a></p>" +
      "<div class=\"r\"><button type=\"button\" data-c=\"1\">Allow</button><button type=\"button\" data-c=\"0\">No thanks</button></div>" +
      (gpc ? "<p class=\"gpc\">Your browser sends a privacy signal (Global Privacy Control or Do Not Track), so we record nothing whatever you pick here.</p>" : "");
    d.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-c]");
      if (b) choose(b.getAttribute("data-c") === "1");
    });
    document.body.appendChild(d);
    // Sit above any sticky bottom bar (Call | Text | Start) so its buttons stay tappable.
    var lift = 0;
    Array.prototype.forEach.call(document.querySelectorAll("body *"), function (el) {
      if (el === d || d.contains(el)) return;
      var cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
      var r = el.getBoundingClientRect();
      if (r.height > 0 && r.height < window.innerHeight / 3 && Math.abs(r.bottom - window.innerHeight) < 2) lift = Math.max(lift, r.height);
    });
    if (lift) d.style.bottom = (lift + 8) + "px";
    if (reopen) d.querySelector("button").focus();
  }

  function start() {
    var c = getC("gw_consent");
    if (allowed()) send({ type: "pageview" });
    else if (!gpc && c === "") banner(false);
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
