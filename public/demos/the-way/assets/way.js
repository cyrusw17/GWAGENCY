// Shared behavior for every page: navbar, reveals, the mile-marker beam, spotlight cards and the placeholder forms.
document.documentElement.classList.remove("no-js");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Navbar: shrink on scroll, menu toggle on phones
const nav = document.querySelector(".nav");
const toggle = nav?.querySelector(".nav__toggle");
const thumb = document.querySelector(".thumb");
const onScroll = () => {
  const y = scrollY;
  nav?.classList.toggle("is-scrolled", y > 40);
  thumb?.classList.toggle("is-shown", y > innerHeight * 0.6);
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", open);
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.classList.contains("is-open")) { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
});

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

// Mile markers: a gold beam follows the reader down the road and lights each post it passes
const timeline = document.querySelector(".timeline");
if (timeline) {
  const beam = timeline.querySelector(".timeline__beam");
  const miles = [...timeline.querySelectorAll(".mile")];
  let ticking = false;
  const draw = () => {
    ticking = false;
    const r = timeline.getBoundingClientRect();
    const reach = innerHeight * 0.6 - r.top;
    const h = reduce ? r.height : Math.max(0, Math.min(r.height, reach));
    beam.style.height = h + "px";
    for (const m of miles) m.classList.toggle("is-lit", reduce || m.offsetTop + 20 <= h);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
  addEventListener("resize", draw);
  draw();
}

// Spotlight cards
document.querySelectorAll(".spot").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", e.clientX - r.left + "px");
    card.style.setProperty("--y", e.clientY - r.top + "px");
  });
});

// Lantern lights as soon as someone starts writing a prayer request
const lantern = document.querySelector(".lantern");
const request = document.querySelector("#request");
request?.addEventListener("input", () => lantern?.classList.toggle("is-lit", request.value.trim().length > 0));

// Placeholder forms: nothing is sent anywhere until the ministry connects a real inbox
document.querySelectorAll("form[data-preview]").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const done = document.getElementById(form.dataset.preview);
    form.hidden = true;
    done.classList.add("is-shown");
    done.setAttribute("tabindex", "-1");
    done.focus();
  });
});
