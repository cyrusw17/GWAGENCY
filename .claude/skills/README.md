# Site design skills (imported 2026-10-03)

37 skills from three MIT-licensed repos, installed in cyrusw17/GWAGENCY under `.claude/skills/`.
Any session working in the GWAGENCY checkout on branch `claude/design-skills-woiitt` (and on the default branch once merged) sees them in its skill list.

Sources (pinned commits): freshtechbro/claudedesignskills @ 1da73fe, jeffallan/claude-skills @ 882ef55, alirezarezvani/claude-skills @ 19392f7.

## House rules for using them on our sites
- strategy/design-bar.md (in the project files) overrides every skill here, above all modern-web-design, landing and epic-design. Skills are for craft (motion, type, tokens, CRO, a11y, schema), not ready-made layouts. Glassmorphism and default bento grids fail the bar.
- Motion has to do a job: a before/after reveal, an estimator, a package picker, a service-area checker. Decorative scroll effects don't count.
- Phones first. A demo must still load fast on a mid-range phone on 4G: aim for LCP under 2.5s and keep total JS under about 100 KB gzipped unless 3D clearly earns its place.
- Heavy 3D (Three.js, Vanta) only where it sells the business (a car-paint reflection, a before/after reveal). Otherwise use CSS, GSAP or Motion. Always honor `prefers-reduced-motion`.
- The funnel template is vanilla HTML/CSS/JS with no build step. Skills that show React examples (motion-framer, web3d-integration-patterns) are still useful for their vanilla APIs and patterns; don't add React to the template.
- Load libraries from cdnjs or jsdelivr with pinned versions, never `@latest`.
- No invented reviews, ratings, names or stats on real client sites (FTC rule, already enforced by tools/build.mjs).

## Design, layout and motion
| Skill | What it does | Best fit |
|---|---|---|
| modern-web-design | Current design trends and patterns (bento grids, bold type, glass, dark mode) with an audit script | Starting point for each of the 5 variations per niche; making each one look distinct |
| epic-design | Cinematic 2.5D scroll storytelling without WebGL: parallax layers, clip-path reveals, text fly-ins, sticky sections | Premium-feeling hero and service sections that stay light on phones |
| landing | Generates a single-page HTML landing page with CSS 3D, GSAP scroll and mouse parallax | Rapid first drafts of a demo variation (follow the GroundWork no-invented-facts rule at its top) |
| ui-design-system | Design tokens (color, type, spacing, shadow, motion) from one brand color | Giving each demo its own token set in site.json/funnel.css |
| brand-guidelines | Applying and enforcing a brand's colors, voice and typography | Keeping a client site on-brand once a real client signs |
| gsap-scrolltrigger | GSAP timelines and ScrollTrigger pinning, scrubbing, parallax | Main motion engine for scroll effects on all niches |
| motion-framer | Motion (Framer Motion) animations, gestures, layout transitions; has a vanilla JS API | Hover/tap micro-interactions, staggered reveals |
| animejs | Lightweight timeline, stagger and SVG morph animation | Small SVG touches: a squeegee wipe, a growing lawn line, a shine sweep |
| scroll-reveal-libraries | AOS-style reveal-on-scroll | The cheapest way to add motion to a simple variation |
| locomotive-scroll | Smooth scrolling with parallax and viewport detection | Only for one "showpiece" variation; test hard on phones |
| barba-js | Page transitions between pages | Multi-page client sites (Grow plan), not the one-page funnel |
| lottie-animations | After Effects JSON animations, plus a file optimizer | Icon animations (booking confirmed, before/after); keep files small |
| lightweight-3d-effects | Zdog pseudo-3D, Vanta backgrounds, Vanilla-Tilt cards | Tilt cards for packages, a subtle animated hero background |
| threejs-webgl | Full Three.js scenes, materials, lighting, loaders | The one place 3D earns it, e.g. a rotating car with ceramic-coat reflections on one detailer variation |
| web3d-integration-patterns | How to combine Three.js with GSAP/Motion scroll without jank | Any variation that mixes 3D and scroll |

## Conversion and copy
| Skill | What it does | Best fit |
|---|---|---|
| page-cro | Conversion audit of a landing page with a scoring script | Review every demo before marketing review |
| form-cro | Lead form field and friction analysis | The quote/booking form on every funnel |
| popup-cro | Popups, slide-ins, sticky bars | Use sparingly: a sticky "call / text" bar on phones |
| copywriting | Writing page copy, headline scorer | Hero headlines and service copy per niche |
| copy-editing | Editing passes, readability and AI-content detector | Final pass so copy doesn't read as AI slop |
| content-humanizer | Makes AI-sounding text sound human, with a scorer | Directly targets the "AI slop" problem on the earlier demos |
| marketing-psychology | Behavioral principles (social proof, anchoring, scarcity) | Ordering sections and pricing on the funnel |
| ab-test-setup | Experiment design and sample size calculator | Later, when client sites have traffic |
| analytics-tracking | GA4/GTM event plans and conversion tracking | Fits the existing call/text/booking tracking in the template |

## SEO and answer engines
| Skill | What it does | Best fit |
|---|---|---|
| seo-audit | Technical and on-page SEO audit with checker scripts | Before handing off each site |
| local-seo-manager | Local SEO for service-area businesses: NAP, service areas, LocalBusiness schema | Core to every detailer, exterior cleaning and landscaping site |
| schema-markup | Implementing and validating schema.org JSON-LD | LocalBusiness, Service, FAQPage on each funnel |
| aeo | Getting cited by ChatGPT, Perplexity and other answer engines (E-E-A-T, structure) | Pairs with the aeotester:audit skill and llms.txt |
| site-architecture | URL structure, navigation and internal linking | Multi-page Grow sites |
| programmatic-seo | Templated pages at scale (city x service) | Service-area pages for clients later |

## Code quality, testing and security
| Skill | What it does | Best fit |
|---|---|---|
| javascript-pro | Modern vanilla ES2023+ JavaScript | funnel.js and tools/*.mjs |
| a11y-audit | WCAG 2.2 AA scanner and contrast checker | Every demo (contrast on photo heroes is the usual failure) |
| playwright-expert | Writing Playwright browser tests | Screenshot and smoke tests of each built site (Chromium is preinstalled) |
| debugging-wizard | Systematic debugging from errors and stack traces | Build or render bugs |
| code-reviewer | Structured code review (read-only tools) | Before handing code to the lead, alongside the built-in code-review |
| security-reviewer | Security audit with severity-rated report | Before merges; static site plus the lead form endpoint |
| secure-code-guardian | OWASP-safe input handling and headers | The lead form and any PHP endpoint |

## Safety check (done before install)
Every file was scanned (and every flagged script read) for shell or subprocess calls, network calls, credential and env access, auto-installs, hidden Unicode and hidden instructions. Changes made:
- Removed barba-js `scripts/project_setup.py` (it ran `npm install` by itself) and updated the two docs that mentioned it.
- Removed `full-page-screenshot` entirely (shell calls to macOS `sips`, a local browser proxy, writes and runs a generated Python file). Use Playwright or the built-in run skill for screenshots.
- Removed the aeo plugin manifest (`.claude-plugin/`), not needed for a repo skill.
- Added a GroundWork rule to `landing` overriding its "invent content when input is sparse" line.
Kept and noted: seo-audit, page-cro, aeo and site-architecture scripts fetch a URL only when you pass one (stdlib urllib). No script reads credentials or calls a hardcoded server.

## What was skipped and why
- freshtechbro: babylonjs-engine, playcanvas-engine, aframe-webxr (game engines and VR), blender-web-pipeline, substance-3d-texturing, spline-interactive, rive-interactive (need paid or desktop authoring tools), react-three-fiber, react-spring-physics, animated-component-libraries (React only; our template has no React), pixijs-2d (canvas games and particles, too heavy for phone funnels), skill-creator (already built in). The repo's 27 agents and 50+ commands were not imported; they are wrappers around the same skills.
- jeffallan: 61 of 67 skipped. They cover other stacks (Python, Go, Rust, Java, .NET, Django, Rails, Laravel, Vue, Angular, React, Next.js, Flutter, mobile), infrastructure (Kubernetes, Terraform, cloud, SRE, databases, Spark), ML and AI, Salesforce, Shopify, WordPress, Atlassian. test-master and react-expert were reviewed and skipped as not fitting a no-build static template.
- alirezarezvani: about 800 skill files skipped (458 are Gemini duplicates). Skipped domains: C-level advisors, finance, compliance and regulatory (RA/QM), project management, productivity, research, agent orchestration, cloud and DevOps, data and ML, LinkedIn/X/YouTube/social, paid ads, SaaS product (signup, paywall, onboarding, churn), React/Next.js generators (landing-page-generator, senior-frontend), and cold-email (the cold email specialist owns that playbook). behuman, performance-profiler (Node/Python/Go backends) and skill-security-auditor were reviewed and skipped.
