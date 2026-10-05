# Site hub

The GitHub Pages home page. It lists every page by trade: each trade's selling page and demo sites side by side, then the rest of groundwork-web.com and any older demo drafts. It has a search box and trade filters. Outreach mechanics, grades and decisions stay in the internal report in the project files.

| File | What it is |
|---|---|
| `data.json` | The only file to edit when work moves: one entry per trade. |
| `index.html` | The page. `{{CATALOG}}`, `{{CHIPS}}` and the other placeholders are filled by `tools/build-hub.mjs`. |
| `hub.css` | Styles, on the GroundWork brand faces and amber. |

Build locally with `node tools/build-pages.mjs` (writes `_site/`). It runs `tools/build-hub.mjs` for the hub and the demos, then copies every page of groundwork-web.com (`public/`, links rewritten for the `/GWAGENCY/` path). Every page gets a one-line bar at the top: back to the hub, its trade and position, the previous and next page in that trade, and search. Requests to `/api/` (tracking, forms) are answered locally in this copy, since Pages has no server. `.github/workflows/pages.yml` runs the build on every push to the default branch and force-pushes the result to the `gh-pages` branch, which GitHub Pages serves.

## A trade in data.json
- `slots`: the main demo (`perTrade` of them). A slot is built and linked once it has `"client"` (a folder in `clients/` whose `site.json` has `"demo": true`) and `"slug"` (the folder under `demos/`). The build runs `tools/build.mjs` on it with the usual checks, so a demo that fails its checks fails the Pages build. `status` is one of `concept`, `building`, `draft`, `review` or `graded`; `grade` is optional and must match the consultant's scorecard. Neither is shown publicly.
- `page`: the trade's selling page under `public/` (for example `"real-estate/"`).
- `more`: extra demo sites already built under `public/`, as `{ "label", "href" }` with `href` like `"site/demos/<slug>/"`. The card takes its title and summary from that page. Add `"featured": true` to show one beside the main demo; the rest are labelled "More demos".
- `candidates`: other versions of the selling page, as `{ "label", "href" }` relative to `public/`.

Pages under `public/` that no trade claims are listed under the agency site. Folders in `public/demos/` that no trade claims are listed as earlier drafts.

## What stays off this page
The repository and its Pages site are public and prospects could find them, so the page shows only the sites and the offer. The full internal version lives in the project files (`master-site/internal-report.html`).

## Showcase pages
A trade with two or more demos also gets `showcase/<trade id>/`: one page with a screenshot and link for every demo, for showing a prospect. The hub links it at the top and in the trade's section, and the trade name in each page's bar opens it. Screenshots live in `hub/shots/<slug>.jpg`. Run `node tools/hub-shots.mjs` after `node tools/build-pages.mjs` to make or refresh them; it needs Playwright, so it runs locally, not in CI. A demo without a screenshot shows its name on a plain panel.
