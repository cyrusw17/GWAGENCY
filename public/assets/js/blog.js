// Blog self-checks (tools/build-blog.mjs, visual "checker"): count ticked boxes and show the matching verdict.
// Without this script the checker is still a plain printable checklist.
document.querySelectorAll(".bv-check").forEach((box) => {
  const inputs = [...box.querySelectorAll("input[type=checkbox]")];
  const score = box.querySelector(".bv-score b"), meter = box.querySelector(".bv-meter i"), verdict = box.querySelector(".bv-verdict");
  const bands = JSON.parse(box.dataset.bands || "[]");
  const update = () => {
    const n = inputs.filter((i) => i.checked).length;
    score.textContent = n;
    meter.style.width = `${(n / inputs.length) * 100}%`;
    verdict.textContent = (bands.find((b) => n >= b.min) || bands[bands.length - 1] || { text: "" }).text;
  };
  box.classList.add("is-live");
  box.addEventListener("change", update);
  update();
});
