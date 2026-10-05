# Source

Imported 2026-10-05 from https://github.com/Bhanunamikaze/Agentic-SEO-Skill @ 6919916 (MIT, see LICENSE).
Copied: SKILL.md, scripts/, resources/. Not copied: docs, tests, installers.
The 10 specialist agents in resources/agents/ are also installed as Claude Code subagents in `.claude/agents/seo-*.md`
(with `<SKILL_DIR>` set to `.claude/skills/seo`), so any session in this repo can spawn e.g. `seo-technical` or `seo-verifier`.
Python deps: `python3 -m pip install -r .claude/skills/seo/requirements.txt`.
GroundWork rule: demos are sample designs for fictional businesses; never "fix" entity or review findings by inventing facts.
