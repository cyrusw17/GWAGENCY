# Work log hub

The internal work log published to GitHub Pages: grades for every board, the 15 demo sites (5 per trade), and a plain explanation of the offer, outreach, lead lists, mockups, sales path, design bar and decisions.

| File | What it is |
|---|---|
| `data.json` | The only file to edit when work moves: board grades and the 15 demo slots. |
| `index.html` | The page. `{{BOARDS}}`, `{{DEMOS}}` and the other placeholders are filled from `data.json`. |
| `hub.css` | Styles, on the GroundWork brand faces and amber. |

Build locally with `node tools/build-hub.mjs` (writes `_site/`). `.github/workflows/pages.yml` runs the same build on every push to the default branch and publishes it.

## Updating a demo slot
A slot shows an "Open the demo" link once it has `"client"` (a folder in `clients/` whose `site.json` has `"demo": true`) and `"slug"` (the folder under `demos/`). The build runs `tools/build.mjs` on it with the usual checks, so a demo that fails its checks fails the Pages build.

`status` is one of `concept`, `building`, `draft` (an earlier version being replaced), `review` or `graded`. `grade` is one of `A+`, `A`, `B`, `C`, `D`, `F`, `Inc.`; board grades come from the consultant's scorecard only.

## What stays off this page
The repository and its Pages site are public, so the page leaves out lead or prospect data, the private call list, budget figures and internal process notes. The full internal version lives in the project files (`master-site/internal-report.html`).
