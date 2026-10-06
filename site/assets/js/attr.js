/*
  Campaign tags for pages that don't load /assets/ds/site.js (niche selling pages, /site-check/).
  Same rule as site.js: only tags already in this page's URL are kept, passed on in internal links,
  and sent with a form the visitor chooses to send. Nothing is stored.
*/
(function () {
  "use strict";
  var params = new URLSearchParams(location.search), attr = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "demo", "city", "niche", "trade"].forEach(function (k) {
    if (params.get(k)) attr[k] = params.get(k).slice(0, 60);
  });
  window.gwAttr = attr;
  if (!Object.keys(attr).length) return;
  document.querySelectorAll('a[href^="/"]').forEach(function (a) {
    try {
      var u = new URL(a.getAttribute("href"), location.origin);
      Object.keys(attr).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, attr[k]); });
      a.setAttribute("href", u.pathname + u.search + u.hash);
    } catch (_) {}
  });
})();
