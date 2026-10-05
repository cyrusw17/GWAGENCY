// Shared parts for real estate agent layouts: the 3-step request form with text consent, and
// the footer an agent's advertising needs (brokerage, license number, Equal Housing statement).
// Layouts style these with their own CSS. Every string goes through esc().
import { esc, when, url } from "./_kit.mjs";

export function agentForm(k, s, opts = {}) {
  const ld = s.lead || {}, areas = opts.areas || ld.areas || [];
  return `<form class="quote" id="lead" data-steps novalidate aria-labelledby="${opts.labelledby || "book-h"}">
      <p class="k-progress" aria-live="polite"><span data-progress>Step 1 of 3</span></p>
      <fieldset data-step="1" class="on">
        <legend>${esc(ld.start?.question || "What can I help with?")}</legend>
        <div class="choices">${(ld.start?.options || []).map((x, i) => `<label class="choice"><input type="radio" name="kind" value="${esc(x.value)}" id="kind-${i}"><span><b>${esc(x.value)}</b>${when(x.hint, `<small>${esc(x.hint)}</small>`)}</span></label>`).join("")}</div>
        <div class="step-nav"><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="2">
        <legend>${esc(ld.step2 || "Where and when?")}</legend>
        <label for="f-service">${esc(ld.areaLabel || "Neighborhood")}</label>
        <select name="service" id="f-service">${areas.map(a => `<option>${esc(a)}</option>`).join("")}<option>Not sure yet</option></select>
        <label for="f-when">Timeline</label>
        <select name="timeline" id="f-when">${(ld.timelines || []).map(t => `<option>${esc(t)}</option>`).join("")}</select>
        <label for="f-notes">Anything I should know? <span class="opt">(optional)</span></label>
        <textarea name="notes" id="f-notes" maxlength="1000" rows="3" placeholder="${esc(ld.notesHint || "")}"></textarea>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button type="button" class="btn btn-go" data-next>Next</button></div>
      </fieldset>
      <fieldset data-step="3">
        <legend>${esc(ld.step3 || "How should I reach you?")}</legend>
        <label for="f-name">Your name</label>
        <input name="name" id="f-name" autocomplete="name" required>
        <label for="f-phone">Mobile number</label>
        <input name="phone" id="f-phone" type="tel" autocomplete="tel" inputmode="tel">
        <label for="f-email">or email</label>
        <input name="email" id="f-email" type="email" autocomplete="email" pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+">
        <p class="hint">${esc(ld.contactHint || "Phone or email, whichever you check first. You only need one.")}</p>
        <div class="hp" aria-hidden="true"><label>Leave empty<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
        <p class="consent">${esc(ld.consent || "")}</p>
        <div class="step-nav"><button type="button" class="btn-back" data-back>Back</button><button class="btn btn-go" type="submit">${esc(ld.submit || "Send")}</button></div>
        <p class="note">${esc(ld.privacy || "")}</p>
      </fieldset>
      <p class="k-status" role="status" aria-live="polite" tabindex="-1"></p>
    </form>`;
}

export function agentFooter(k, s) {
  const b = k.b;
  return `<footer class="foot">
  <div class="wrap foot-in">
    <div><b>${esc(b.name)}</b><br>${esc(b.brokerage || "")}<br>${k.addr()}<br>${esc(b.license || "")}</div>
    <div><b>Call or text</b><br>${k.call("footer", k.phone, "foot-link")}<br>${esc(b.hoursText || "")}${when(b.email, `<br><a class="foot-link" href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}</div>
    <p class="eho"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M20 4 3 16h4v18h26V16h4z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 20h14M13 26h14" stroke="currentColor" stroke-width="3"/></svg><span>${esc(s.eho || "Equal Housing Opportunity.")}</span></p>
    <p class="credit">${k.credit()}</p>
  </div>
</footer>`;
}

// Form, footer and sticky-bar CSS every agent layout shares; colors come from the layout's tokens
// (--ink, --muted, --line, --go, --go-d, --card, --display, --body, --radius).
export const AGENT_CSS = `.quote{background:var(--card);color:var(--ink);border:2px solid var(--ink);border-radius:var(--radius);padding:24px}
.k-progress{font-size:13px;font-weight:700;color:var(--go-d);margin:0 0 6px}
legend{font:600 24px/1.2 var(--display);margin-bottom:14px;padding:0}
.choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:420px){.choices{grid-template-columns:1fr}}
.choice{position:relative;display:block;cursor:pointer}
.choice input{position:absolute;opacity:0}
.choice span{display:block;border:2px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-height:56px;background:var(--card)}
.choice small{display:block;color:var(--muted);font-size:13px}
.choice input:checked+span{border-color:var(--go);box-shadow:inset 0 0 0 1px var(--go)}
.choice input:focus-visible+span{outline:3px solid var(--go);outline-offset:2px}
.quote label{display:block;font-weight:700;font-size:15px;margin:14px 0 4px}
.quote input:not([type=radio]),.quote select,.quote textarea{width:100%;font:400 17px var(--body);padding:12px;border:1.5px solid var(--muted);border-radius:var(--radius);background:#fff;color:#1d1d1d;min-height:48px}
.opt{font-weight:400;color:var(--muted)}
.hint,.note{font-size:14px;color:var(--muted)}
.consent{font-size:13px;color:var(--muted);margin:14px 0 0;line-height:1.45}
.step-nav{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px}
.step-nav .btn:only-child{margin-left:auto}
.btn-back{background:none;border:0;font:700 16px var(--body);color:var(--muted);text-decoration:underline;cursor:pointer;min-height:44px}
.k-status{font-weight:700;margin:0}
.k-status:empty{display:none}
.foot{background:#141414;color:#CFCAC2;padding:36px 0 100px;font-size:15px}
@media (min-width:900px){.foot{padding-bottom:36px}}
.foot-in{display:grid;grid-template-columns:1fr;gap:20px}
@media (min-width:760px){.foot-in{grid-template-columns:1fr 1fr 1fr}}
.foot b,.foot a{color:#fff}
.eho{display:flex;gap:10px;align-items:center;margin:0;font-size:14px}
.credit{grid-column:1/-1;font-size:13px;margin:0}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));background:#141414}
.sticky .btn{flex:1;min-height:50px;padding:0 12px;gap:6px}
.sticky .btn-call,.sticky .btn-text{flex:0 0 auto;background:#333;color:#fff}
.sticky svg{width:18px;height:18px}
@media (min-width:900px){.sticky{display:none}}
.faq details{border-bottom:1px solid var(--line)}
.faq summary{cursor:pointer;font-weight:700;font-size:18px;padding:16px 30px 16px 0;list-style:none;position:relative}
.faq summary::-webkit-details-marker{display:none}
.faq summary:after{content:"+";position:absolute;right:4px;top:12px;font-size:24px;color:var(--go)}
.faq details[open] summary:after{content:"–"}
.faq p{margin:0 0 16px;color:var(--muted)}`;

// A stock photo as responsive WebP: "img/x.jpg" in site.json is served as img/x-800.webp and
// img/x-1600.webp (made at import time). Anything else (an SVG illustration) passes through.
export function photo(src, sizes = "100vw") {
  if (!/\.jpg$/.test(src || "")) return `src="${url(src)}"`;
  const b = src.replace(/\.jpg$/, "");
  return `src="${url(b + "-1600.webp")}" srcset="${url(b + "-800.webp")} 800w, ${url(b + "-1600.webp")} 1600w" sizes="${sizes}"`;
}
