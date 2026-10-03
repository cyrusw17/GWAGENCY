# Work log hub

A short public status page for GitHub Pages: the offer, the finished demo site and where the business stands. Outreach mechanics, grades and decisions stay in the internal report in the project files.

| File | What it is |
|---|---|
| `data.json` | The only file to edit when work moves: `perTrade` and the demo slots. |
| `index.html` | The page. `{{DEMOS}}` and the other placeholders are filled from `data.json`. |
| `hub.css` | Styles, on the GroundWork brand faces and amber. |

Build locally with `node tools/build-hub.mjs` (writes `_site/`). `.github/workflows/pages.yml` runs the same build on every push to the default branch as a check. It publishes only when run by hand (Actions > Work log on Pages > Run workflow), after Pages is turned on in Settings > Pages > Source: GitHub Actions.

## Updating a demo slot
A slot shows an "Open the demo" link once it has `"client"` (a folder in `clients/` whose `site.json` has `"demo": true`) and `"slug"` (the folder under `demos/`). The build runs `tools/build.mjs` on it with the usual checks, so a demo that fails its checks fails the Pages build.

`status` is one of `concept`, `building`, `draft` (an earlier version being replaced), `review` or `graded`. `grade` is optional (`A+` to `F` or `Inc.`) and must match the consultant's scorecard.

## What stays off this page
The repository and its Pages site are public and prospects could find them, so the page shows only the offer, the demo and a short status. The full internal version lives in the project files (`master-site/internal-report.html`).
