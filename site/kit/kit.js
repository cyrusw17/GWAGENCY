/* GroundWork Detailer Kit: demo behavior. Stores nothing in the browser. */
(function () {
  // Demo booking widget: purely illustrative. On a client site this block is
  // replaced by the embedded Square / Booksy / Google booking iframe.

  // Time slots behave as an accessible radio group (arrow keys + space/enter).
  document.querySelectorAll(".k-embed .slots").forEach(group => {
    const slots = [...group.querySelectorAll(".slot")];
    const select = (i) => {
      slots.forEach((s, j) => { const on = i === j; s.setAttribute("aria-checked", String(on)); s.tabIndex = on ? 0 : -1; });
      slots[i].focus();
    };
    slots.forEach((s, i) => {
      s.tabIndex = s.getAttribute("aria-checked") === "true" ? 0 : -1;
      s.addEventListener("click", () => select(i));
      s.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select((i + 1) % slots.length); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select((i - 1 + slots.length) % slots.length); }
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); select(i); }
      });
    });
  });

  const form = document.querySelector(".k-embed");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const status = form.querySelector("[role=status]");
      const slot = form.querySelector(".slot[aria-checked=true]");
      btn.disabled = true;
      btn.textContent = "Booked (demo)";
      if (status) status.textContent = `Demo booking confirmed${slot ? " for " + slot.textContent : ""}. On a real site this hits your calendar and texts the customer.`;
    });
  }

  // Carry GroundWork campaign tags (already in this page's URL) into the demo-bar links. No storage.
  try {
    const q = new URLSearchParams(location.search);
    const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "city"];
    document.querySelectorAll(".gw-bar a").forEach(a => {
      const u = new URL(a.getAttribute("href"), location.origin);
      keep.forEach(k => { if (q.get(k) && !u.searchParams.has(k)) u.searchParams.set(k, q.get(k)); });
      a.href = u.pathname + u.search;
    });
  } catch (_) {}

  // Before/after compare (range input drives --pos).
  document.querySelectorAll("[data-k-compare]").forEach(el => {
    const rg = el.querySelector('input[type="range"]');
    if (rg) rg.addEventListener("input", () => el.style.setProperty("--pos", rg.value + "%"));
  });
})();
