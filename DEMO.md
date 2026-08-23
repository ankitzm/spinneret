# Spinneret — Demo Runbook (3-min video)

The heal loop is real, but Bright Data's programmatic auto-heal is non-deterministic
and ends at a manual approval gate (no public approve-programmatically API). So the
**reliable, honest demo** drives the heal by hand — the same flow Bright Data demos
on stage. The recovered preview is the proof.

## Pre-flight (before recording)

1. Store deployed clean (variant A). Confirm: open `https://spinneret-store.vercel.app/product/aurora-headphones` → normal product page.
2. Dashboard live and green: `https://spinneret-three.vercel.app/`.
3. `bdata zones` works (authenticated).
4. Rehearse the manual heal once (below) — it recovered every field cleanly in testing.
5. Open 4 tabs: dashboard · store · GitHub Actions · Bright Data control panel (`brightdata.com/cp/scrapers/c_mt63yt141kkne9vb5t`).
6. No `.env` / tokens visible on screen.

## The recording (~3 min)

### 1. Healthy world (0:00–0:25)
- Dashboard: both sources green, **Bad rows shipped: 0**.
- Say: "Spinneret — scrapers that repair their own webs. Two collectors, running in CI, every row verified against golden rows."

### 2. Break the site (0:25–0:55)
```bash
npm run store:break
git commit -am "break store" && git push
```
- Wait for Vercel to redeploy (~40s). Reload the store — looks identical.
- DevTools → show every class renamed (`product-price` → `c-x9k2`, `<h1>` → `<h2>`).
- Say: "The site just shipped a redesign. Same content, every selector dead. This silently breaks normal scrapers."

### 3. Gate catches it (0:55–1:35)
```bash
node pipeline/run.mjs        # or trigger the GitHub Action
```
- Pipeline reports the store BROKEN. Dashboard flips it off green.
- Say: "Spinneret caught it before one bad row shipped — and it knows this is a **broken scraper**, not a real price change. That distinction is the whole product." (Point at the `SCRAPER BROKEN` vs `WORLD CHANGED` chip.)

### 4. Heal on camera (1:35–2:30)
```bash
bdata scraper heal c_mt63yt141kkne9vb5t \
  "The page was restructured with new class names. The visible content is still present. Re-locate by visible text: name = the large product title heading like 'Aurora Wireless Headphones'; price = the dollar amount like '\$129' next to the title; rating = the number like '4.6'; description = the body paragraph; image_url = the main product image src." \
  --url "https://spinneret-store.vercel.app/product/aurora-headphones" --pretty
```
- Watch the steps: `planner → code_fixer → step_preview_runner → request_fulfillment_validator`.
- **Show the `preview_result`** — every field recovered: `name`, `price 129`, `rating 4.6`, description, image. This is the approval envelope.
- Say: "It re-locates every field from the visible text and shows me exactly what the fix produces. Same Collector ID."

### 5. Approve (2:30–2:50)
```bash
bdata scraper approve c_mt63yt141kkne9vb5t --url "https://spinneret-store.vercel.app/product/aurora-headphones"
```
- Approve in the Bright Data UI too (the one human step, by design).
- Say: "One approval publishes the fix. That's the only human step."

### 6. Close (2:50–3:00)
```bash
npm run store:fix
git commit -am "restore store" && git push
```
- Back to green.
- Say: "Self-healing pipeline, runs in CI, never ships silent garbage, recovered every field on camera. Spinneret."

## Notes / honesty

- The pipeline (`node pipeline/run.mjs`) also runs the heal automatically and records an
  `awaiting approval` state with the recovered preview — but the manual command is
  more reliable to demo live. Both are honest; neither fakes a green check.
- The published re-run can lag the approval (a Scraper Studio publish quirk). Lead with
  the recovered **preview** as the proof — that is what Bright Data's own stage demo shows.
- Keychron is the real long-tail source proving this works beyond a toy store.

## Reset between takes
```bash
npm run store:fix && git commit -am "reset" && git push   # store back to clean
```
