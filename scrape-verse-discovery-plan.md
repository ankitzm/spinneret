# Discovery Plan: ScrapeVerse Hackathon Winning Project

**Date:** 2026-08-23 (submission deadline is TODAY — winners announced early September)
**Product stage:** New product (hackathon build)
**Discovery question:** What project maximizes win probability across all 6 judging criteria while solving a real-world problem?

> **v2 update (judge-grounded):** Both probable judges now researched. Idea re-ranked against their *actual* rubric, not inferred marketing. Headline pick changed — see §0. Original RecallRadar analysis kept below as the vertical demo option.

---

## 0. THE VERDICT (judge-grounded) — build **Prometheus** *(working title: "SelfHeal-CI")*

### The two judges, decoded from primary sources

**Anil Kumar Krishnashetty** (Bright Data, Sr. Technical PMM — the "best use of Bright Data" side). His own hackathon repo `anil-bd/scraper-studio-scrape-verse-hackathon-august-2026` is a literal rubric. Verbatim **"What Judges Look For":**
1. At least one working create-and-run flow, **Collector ID as proof**
2. **A self-healing demonstration** wherever the target allows
3. **The Collector ID wired into something downstream** — API, database, schedule, or dashboard
4. Reproducible repo + explanation of the generated code

His signature pattern (from his demo): build a *minimal* scraper → run → **heal it in place to extend/repair, same Collector ID, show the "approval envelope"** → re-run to verify. His mantra: *"the actual scraping is ~20% of the work"* — **downstream integration is the differentiator.** He even ships an *anti-scraper site* (`anil-bd/ecommerce-shop`, "Alto & Oak") that mutates its DOM daily via GitHub Action specifically to give self-healing something to heal. And the programmatic heal path is documented: `POST /dca/trigger` → poll → health-check (≥1 row, `REQUIRED_FIELDS` non-empty) → `POST /dca/collectors/{id}/refactor_template` → poll progress → re-validate. **Known limitation:** heal ends in `user_approval`; no public API to approve programmatically → approve in UI (plan the demo around this).

**Kunal Kushwaha** (WeMakeDevs founder — the community/impact side). CNCF Ambassador, GitHub Star, DevOps educator. His entire **DevOps Bootcamp is GitHub Actions CI/CD + GitOps.** Values: open source by default, "learning in public," career-relevance, code that "handles edge cases." He literally teaches the exact primitive this hackathon rewards. The kickoff guide (his org) names the idea verbatim: *"Put `bdata scraper run` inside GitHub Actions on a cron… have `claude -p run bdata scraper heal` automatically… a scraper that fixes itself while you sleep, with a wall of green checks to prove it."*

### Where the two judges' preferences INTERSECT — that's the win

| | Anil wants | Kunal wants |
|---|---|---|
| Core | Scraper Studio + heal loop + Collector ID proof | GitHub Actions CI/CD + autonomous heal |
| Proof | downstream wiring (API/DB/schedule/dashboard) | open-source, reproducible, edge-case-handling |
| Demo | show the approval envelope / heal on camera | wall of green checks, live |
| Value | novel target not in BD library | real usefulness, career-relevant |

**The single build that maxes BOTH:** a **self-healing scraper running autonomously in GitHub Actions CI, that detects a real site change, heals via `bdata scraper heal`, re-validates against golden rows, and only then ships verified data downstream — with a public status page (wall of green checks) as the deliverable.** This is idea #5 from the official list ("Scrapers in CI, no humans"), executed as a real product, on a novel target, wired downstream. It hits **all 6 criteria** and lands on *both* judges' deepest expertise simultaneously.

### The pick: **Prometheus** — "the CI/CD pipeline that keeps AI agents from being confidently wrong"

A self-healing data pipeline where Scraper Studio collectors run in GitHub Actions on cron. Each run: trigger Collector ID via `POST /dca/trigger` → validate output against golden rows + required-fields schema → **classify the failure**: is the *scraper* broken (site redesign → auto-heal via `refactor_template` / `bdata scraper heal`, re-validate, commit, green check) or did the *world* change (real data delta → that's a signal, alert downstream). Downstream: a clean structured **data API + status/provenance dashboard** ("every source: Green / Healing / Degraded — never silently wrong"). Open-source, reproducible, one-command setup.

**Why it beats the RecallRadar plan below:** RecallRadar wins criterion #1 (impact) but is *median* on "best use of Scraper Studio" and doesn't touch Kunal's CI/CD wheelhouse. Prometheus is the intersection of both judges' expertise + hits 4–6 criteria structurally by construction. **RecallRadar becomes the demo vertical** — point Prometheus at a real long-tail domain with genuine stakes (product-recall pages, or a regional e-commerce catalog per Anil's `ecommerce-shop` pattern) so the impact story is concrete, not abstract infra.

### Target selection (decisive for "novel + real")
- Must NOT be in BD's 800+ library (Step 0 rule). Pick a **long-tail vertical with real change-churn**: a regional/niche e-commerce catalog, a B2B supplier catalog, product-recall/safety pages, or a docs/changelog site.
- Recommended: **a niche e-commerce or B2B catalog that genuinely changes** (mirrors Anil's own demo domain shopalto.xyz / Alto & Oak) — gives natural break→heal moments AND a real "price/stock changed vs scraper broke" classification story, which is the *hard, impressive* part.

### The demo video arc (Presentation = 1/6, must be shown live)
1. Pipeline green, data flowing to the API/dashboard.
2. Target site changes (real drift, or induce via a staged/forked page à la Alto & Oak's daily mutation).
3. CI run goes red — but **caught by the golden-row gate, never silently wrong** (this is the edge-case-handling Kunal rewards).
4. `bdata scraper heal` runs, **approval envelope shown** (Anil's signature beat), re-validates, commits.
5. Wall of green checks returns; verified data flows again. Collector ID visible throughout.

### Fallback if CI heal won't fully reproduce today
Show the evidence-gate catching the breakage + the heal invoked (approval envelope) + re-validation, even if part is run manually. Honesty > fakery (AI-disclosure rule). Never fake a green check.

---

## 1. The Hackathon (verified facts)

- **"Into the Scrape-Verse"** — WeMakeDevs × Bright Data, Aug 17–23 2026, online + SF event. 5,000+ registered developers.
- **Theme:** self-healing web scrapers built with **Bright Data Scraper Studio** (mandatory — a *custom* scraper; a prebuilt-library scraper alone does not qualify).
- **Prizes ($15,000 pool):** Web-Slinger grand = NVIDIA DGX Spark (~$5k, best use of Bright Data) · Suit-Up = iPad per member (best UI) · Spider-Sense = Keychron per member (cleanest code) · Daily Bugle = Galaxy Watch (best LinkedIn post) · $2,500 credits split among top teams · $50 credits per participant (code `wemakedevs` at https://brdta.com/wemakedevs).
- **Judging — 6 criteria, equal weight:** ① Potential impact ② Creativity/innovation ③ Technical excellence ④ Use of Scraper Studio ⑤ Reliability & self-healing ⑥ Presentation.
- **Submission (form https://forms.gle/iQf2SjHQViSJaRAv7):** public repo + clear README + example structured output + demo video + explanation of Scraper Studio integration. AI tools allowed but must be disclosed and explainable.
- **Rules that shape the idea:** public data only; **no government websites**; no login-walled/personal data; coding starts after Aug 17 (ideation before is fine).
- **Explicit judge guidance (kickoff blog):** target long-tail/niche sites *not* in Bright Data's 800+ prebuilt scrapers; run everything from a coding agent/terminal; **demo `bdata scraper heal` — "Judges will be looking for it"**; treat the Collector ID as a production API (`POST /dca/trigger`); repo must be reproducible.

Key resources: kickoff guide (wemakedevs.com/blogs/scrape-verse-kick-off), Scraper Studio docs (overview, AI-agent walkthrough — 5 scraper types: PDP, Discovery, Sitemap, Search, Interact; self-healing tool; coding-agent prompts; CLI `npx -p @brightdata/cli`), official demo repo (github.com/anil-bd/scraper-studio-scrape-verse-hackathon-august-2026), Bright Data skills (github.com/brightdata/skills). Free tier: 5,000 credits/mo (1 credit = 1 Scraper Studio page load) + $50 promo credits.

---

## 2. What already exists (saturation map)

**Past Bright Data challenge winners pattern:** winners are (1) trust/security/verifiability plays — SOC-CERT threat intel, Auto_Sec pentest agent, VeriTrace (merkle-anchored scrape provenance), Release & Deprecation Sentinel; (2) hyper-specific real-world usefulness — Swarmed (bee swarm removal), Packworks (sari-sari store pricing, 335K stores); or (3) a novel twist on the data itself — PriceGhost (geo-differential pricing discrimination with signed evidence dossiers). **Generic trackers/aggregators fill the losing 90% of every pool.**

**Saturated categories (avoid):** price trackers/comparison, brand monitoring/social listening, lead-gen/SDR, job search, news sentiment, real estate, competitive-intel diffs, GEO/"how LLMs see my brand", RAG-from-docs, event discovery, travel. Bright Data's own 20+ demo repos already cover all of these.

**Current-competition intel (GitHub topic `scraper-studio`, updated Aug 21–23):** the strongest rivals converged on **evidence-gated self-healing meta-tools** — brightdata-gatekeeper (verify heal against golden rows), anansi (contract-gated healing, "tells a broken scraper from a real repricing"), sourcemender (deterministic evidence gate), roi-ledger (healing with cost accounting). Smart tech, but they're *infrastructure demos* — weak on criterion ① (real-world impact). That's the opening.

**Untouched gaps with real pain:** consumer/product safety, security & supply-chain watch, compliance/regulatory (non-gov sources only!), physical-world/local data, accessibility, evidence-grade scraping applied to a real vertical.

---

## 3. Ideas explored (10)

| # | Idea | Verdict |
|---|------|---------|
| 1 | **RecallRadar** — self-healing fleet watching manufacturer recall/safety-notice pages; matches user products; flags recalled items still sold on second-hand marketplaces | **WINNER — see §4** |
| 2 | Hospital cash-price transparency comparer (US chargemaster files on private hospital sites) | Strong impact, but pricing-adjacent (PriceGhost/PriceLens fatigue) and heavy data wrangling |
| 3 | Dependency deprecation sentinel tested against *your* repo | Real pain, but Release & Deprecation Sentinel already won with the generic version |
| 4 | ToS/privacy-policy silent-change diff watcher with signed evidence | Good, but impact ceiling moderate; ToS;DR precedent |
| 5 | Scholarship/financial-aid finder across long-tail university/foundation pages | Great audience fit (WeMakeDevs students), but aggregator-shaped |
| 6 | Supply-chain typosquat watch (npm/PyPI pages) | Registries have APIs — weak Scraper Studio justification |
| 7 | Utility-outage aggregator (private utility sites) | Real impact but undemoable without a live outage |
| 8 | Allergen-advisory / food-label change watcher | Merged into #1 as a category |
| 9 | Evidence-gated healing meta-tool | Exactly what 4+ rival teams are building — crowded |
| 10 | Local small-business supply-price index (Packworks-style) | Needs ground truth we don't have |

---

## 4. The Winning Idea: **RecallRadar** — "a product-safety monitor that is not allowed to die"

### One-liner
Product recalls are announced on hundreds of messy, ever-changing manufacturer pages — and most recalled products are never returned or fixed (recall remedy-completion rates are notoriously low, often cited in the 10–30% range; recalled goods even keep circulating on second-hand marketplaces, which is illegal to sell in the US). RecallRadar is a fleet of self-healing Scraper Studio scrapers watching manufacturer recall/safety-notice pages, normalizing everything into one alert stream, matching against a user's household product list — and cross-checking resale marketplaces for recalled items still being sold.

### Why this wins each criterion
1. **Potential impact** — safety of real people (car seats, cribs, batteries, appliances). Emotionally resonant, journalist-grade angle ("recalled items still for sale second-hand"). No rival team is anywhere near this space.
2. **Creativity** — not one of the 9 suggested ideas, not in any saturated category, not in Bright Data's demo repos, not in past winners.
3. **Technical excellence** — heterogeneous scraper fleet → common recall schema → LLM severity classification → product-matching engine → alerting; plus marketplace cross-check.
4. **Use of Scraper Studio** — the *ideal* Scraper Studio workload: dozens of long-tail brand pages (exactly the FAQ's "niche verticals" guidance — none in the prebuilt library), mixing scraper types: **Sitemap/Discovery** (find recall pages), **PDP** (parse each notice), **Search** (keyword "recall" + brand, URL-less). Collector IDs triggered on cron via `POST /dca/trigger`.
5. **Reliability & self-healing — the narrative writes itself:** recall pages are the worst-maintained pages on the web; a silently broken scraper here = a missed safety alert. Self-healing isn't a gimmick bolted on for judges — *it is the product requirement*. GitHub Actions cron → golden-row validation per source → on breakage, `bdata scraper heal` from a description of the failure → re-validate → re-run → alert only on verified data. "A safety monitor that repairs itself while you sleep."
6. **Presentation** — Spider-Man theme lands free: *"With great data comes great responsibility."* Demo arc: recall appears → alert fires → we break a source (site redesign) → dashboard shows source degraded, never silently wrong → heal runs in CI → wall of green checks → alert flows again.

### Architecture (go-wild version — full product vision)
```
[Manufacturer recall/safety pages ×N brands]          [Second-hand marketplaces]
   Scraper Studio custom scrapers (Sitemap/PDP/Search)   Bright Data MCP tools
   Collector IDs, cron via POST /dca/trigger             (facebook_marketplace_listings,
        │                                                 ebay_product, etc.)
        ▼                                                        │
  Normalizer → common RecallNotice schema  ◄─────────────────────┘
        │                    (cross-check: recalled model # still listed?)
        ▼
  LLM severity classifier (injury risk / fire / choking / chemical)
        │
        ▼
  Matching engine ← user household inventory (manual entry / receipt paste)
        │
        ▼
  Alerts (email/Discord/push) + public recall feed API + dashboard
        │
  Reliability layer (the self-healing story):
  GitHub Actions cron → run all collectors → golden-row evidence gate per source
  → on failure: `bdata scraper heal` with failure brief → re-validate vs golden rows
  → commit healed scraper → status page: every source Green/Healing/Degraded, never silent
```

### Hackathon-scope cut (submittable today)
- 5–8 manufacturer recall pages across 2–3 categories (kids' products, appliances, batteries) — enough to show fleet heterogeneity.
- One Scraper Studio scraper per source (at least one Sitemap-type + one PDP-type + one Search-type to show range).
- Normalizer + SQLite/JSON store + simple matching (user enters brand/model list).
- CI cron + one **recorded break→heal→re-run** loop (this is the money shot of the demo video).
- Marketplace cross-check via 1–2 MCP calls for one recalled product (the "wow" 30 seconds).
- Minimal terminal-first UX + tiny status dashboard (also serves Suit-Up/Spider-Sense tracks).
- LinkedIn post about the build → Daily Bugle track entry (free extra prize shot).

---

## 5. Critical Assumptions

| # | Assumption | Category | Impact | Uncertainty | Priority |
|---|-----------|----------|--------|-------------|----------|
| 1 | Manufacturer recall pages are scrapeable public data (no login/gov) | Rules/Feasibility | Kill-shot | Low — they are public marketing pages; gov-site ban avoided by design | P0 |
| 2 | Scraper Studio handles heterogeneous long-tail pages well enough to build N scrapers fast | Feasibility | High | Medium — mitigate: start with cleanest 5 sources, coding-agent prompts docs | P0 |
| 3 | `bdata scraper heal` demo is reproducible on demand | Feasibility | High — judges explicitly look for it | Medium — mitigate: induce breakage by pointing scraper at a changed/staged copy of the page, or capture a real drift | P0 |
| 4 | Judges reward real-world vertical over meta-infra | Value | High | Low — impact is criterion #1; past winners confirm | P1 |
| 5 | Marketplace cross-check doesn't dilute the "Scraper Studio is core" requirement | Rules | Medium | Low — Scraper Studio remains the core loop; MCP is garnish | P1 |
| 6 | Free tier (5,000 page loads + $50) covers the build | Viability | Medium | Low | P2 |

## 6. Validation / Execution Plan (today)

| Hour | Step | Success criteria |
|---|------|-----------------|
| 1 | Claim credits (`wemakedevs`), install CLI, run one PDP scraper on the cleanest recall page | Clean JSON out |
| 2–4 | Build 5–8 scrapers via coding-agent prompts; normalize schema | ≥5 sources feeding one store |
| 5 | Golden-row gates + GitHub Actions cron + `/dca/trigger` wiring | Green CI run |
| 6 | Stage a breakage → run `bdata scraper heal` → re-validate → **record it** | Break→heal→green captured on video |
| 7 | Matching engine + alert + marketplace cross-check for one recalled item | End-to-end alert fires |
| 8 | README (architecture diagram, AI-tool disclosure, reproduce steps), example structured output, 3-min demo video, submit form + LinkedIn post | All 5 submission requirements met |

**Decision framework:** if Scraper Studio chokes on a source → swap source, don't fight it (fleet size 5 is enough). If heal demo won't reproduce → show the evidence-gate catching the failure + manual heal invocation; honesty beats fakery (AI disclosure rule). If time collapses → cut dashboard, never cut the heal video.

---

## 7. Sources
- Hackathon: wemakedevs.org/hackathons/scrape-verse (+ /rules /resources /schedule), kickoff blog, judges tweet (x.com/WeMakeDevs/status/2087471447803621676)
- Docs: docs.brightdata.com/datasets/scraper-studio/* (overview, ai-agent, self-healing-tool, coding-agent-prompts, build-with-the-cli), docs.brightdata.com/cli/overview, free-tier page
- Prior art: DEV.to winner posts (Dec 2024, May 2025, n8n Aug 2025), lablab.ai Web Data UNLOCKED recap, HackerNoon PoU winners, github.com/brightdata repos, github.com/topics/scraper-studio (rival intel)
