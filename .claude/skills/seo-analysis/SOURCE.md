# seo-analysis (InfraNodus)

`SKILL.md` is copied unchanged from https://github.com/infranodus/skills/blob/master/skill-seo-analysis/SKILL.md
(fetched 2026-10-05; the upstream repo states no license). Methodology page: https://infranodus.com/skills/seo

## How we run it without the InfraNodus MCP
The skill's tools need an InfraNodus account connected as an MCP server. We have none, so we use the
fallbacks the skill allows:
- Search demand (`analyze_related_search_queries`): Google Suggest, expanded with a-z and question prefixes.
  `node tools/seo-terms.mjs` does this for every niche and writes the term lists.
- Informational supply (`analyze_google_search_results`): web search for the top queries, reading which
  topics the ranking pages cover and which they skip.
- Supply-demand gaps: queries that show up in Suggest but that the top results answer weakly.

Results and the per-page term map live in the project files under `seo-terms/`.
