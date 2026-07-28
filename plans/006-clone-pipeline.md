# 006: Store clone pipeline — scrape, provision, deploy, URL

## Status

Plan. Not started. Depends on plan 005 (template app and store.json v2).

## Goal

Input: one Instagram or Facebook store URL.

Output: a deployed demo at `https://<storename>.storekit.darjs.dev` with the
prospect's name, logo/brand colors, products, prices, and images — ready to
send as a cold DM.

Target time: one agent run plus a short human review, under one hour per store.

## Decisions

- Scraping uses the founder's real browser through the agent-browser skill.
  No new scraping framework, no headless farm, no Instagram API.
- The pipeline is a small set of `vp run store:*` commands plus one skill
  (`skills/store-clone/SKILL.md`) that orchestrates them. Keep the infra
  simple: thin commands over Wrangler, not a provisioner framework.
- Every prospect clone is a separate Worker with its own D1, KV, and R2
  resources, per the repository model in `docs/product-preferences.md`.
- Demo checkouts use the founder's existing QPay merchant credentials, as the
  Plugged demo does. Secrets come from an owner-only `.env` file outside the
  repo through the existing guarded secrets-file flow, generalized per store.

## Commands

Root tasks, parameterized by store id. Follow the existing Plugged task style
in `vite.config.ts`, with the confirmation env-var guardrails generalized from
`PLUGGED_*` to `STORE_KIT_<ID>_*`.

1. `vp run store:new -- <id>`
   - Copy `apps/template-store` to `apps/<id>` (strip template seed and media).
   - Write a minimal `store.json` (`id`, `name`, `publicBaseUrl`).
   - Generate `wrangler.jsonc` with environment placeholders.
   - Refuse to overwrite an existing directory.
2. `vp run store:provision -- <id>`
   - Create D1 database, KV namespaces, and R2 bucket with `wrangler` CLI.
   - Write returned IDs into `apps/<id>/wrangler.jsonc`.
   - Idempotent: existing IDs are kept, not recreated.
   - Declare the custom-domain route `<id>.storekit.darjs.dev` in Wrangler
     config. DNS is manual on first use of the zone only.
3. `vp run store:catalog:build -- <id>`
   - Input: `apps/<id>/data/draft.catalog.json` (loose format: names, prices,
     sizes, colors, image filenames) plus images in `apps/<id>/data/images/`.
   - Output: a valid `catalog.seed.json` with generated TypeIDs, slugs, SKUs,
     dimensions, alt text, and content-addressed R2 keys.
   - The scraper never writes the strict seed format directly.
4. `vp run store:migrate -- <id>`, `vp run store:seed -- <id>`,
   `vp run store:media -- <id>`
   - Generalized forms of the existing Plugged tasks.
5. `vp run store:deploy -- <id>`
   - Guarded build + deploy through Astro's flattened Wrangler config.
   - First-deploy secrets file: `<id>`-specific, absolute path, mode `600`.
6. `vp run store:smoke -- <id>`
   - Generalized smoke: system route, catalog routes, image access, checkout
     page renders.
7. `vp run store:url -- <id>`
   - Print the store URL. Last step of every pipeline run.

## Skill: `skills/store-clone/SKILL.md`

An agent skill that runs the end-to-end motion. Steps:

1. Open the given Instagram/Facebook URL with agent-browser in the founder's
   real (logged-in) browser. Read-only actions only.
2. Extract: store name, profile image, bio/contact hints, and the recent
   product posts: image URLs, captions, prices, size mentions.
3. Download product images into a staging folder. Record source URL per image.
4. Draft `draft.catalog.json`: agent proposes categories, variants, MNT prices
   parsed from captions. Mark every uncertain field.
5. STOP for human review of the draft: prices, variants, banner copy, which
   posts are products. The human confirms or edits in place.
6. Create a v1 `store.json`: name from the profile, accent color sampled from
   the profile image, contact links from the bio.
7. Run: `store:new` (skip copy backfill when the app exists), `store:catalog:build`,
   `store:provision`, `store:migrate`, `store:media`, `store:seed`,
   `store:deploy`, `store:smoke`, `store:url`.
8. Report the URL, the skipped/uncertain products, and what the human edited.

Safety rules for the skill:

- Never post, like, follow, or message from the founder's account.
- Keep request volume low and paced. One profile, one product grid, done.
- Copyright: this is a sales demo for the prospect's own products. Do not reuse
  scraped material for any other store.
- Never pay a QPay invoice created on a demo deployment.

## store.json v2 consumption

`store:new` writes the minimal config. The skill upgrades it after scraping:
`brand.wordmark`, `theme.accent` sampled from the prospect's profile image,
`contact` links, `footer.tagline` from the bio. All values remain editable
before deploy.

## Out of scope

- Production environments, custom apex domains, per-store QPay merchants.
- Real order operation for demo stores (admin worktree dependency).
- Automated DNS API management, R2 custom domain automation for per-store
  media domains. Demo media uses the store Worker's media origin until a sale
  converts; keep the Plugged immutable-upload contract.
- Scheduled or bulk scraping.

## Completion criteria

- A new store id goes from URL to deployed demo with: one skill run, one human
  review, and no hand-edited Wrangler or seed files.
- Two sequential clones deploy without touching each other's resources.
- Smoke passes on the deployed URL; guest checkout reaches the QPay QR step.
- `vp check` and `vp test` pass.

## Risks and controls

| Risk | Control |
| ---- | ------- |
| wrangler.jsonc ID write-back corrupts config | JSONC round-trip editing with comments preserved; diff before save |
| Scraped prices/sizes wrong in demo | Human review step is mandatory in the skill |
| Founder IG account flagged | Real browser, read-only, low volume, no automation bursts |
| Secrets leak into repo or logs | Reuse the existing guarded secrets-file flow; skill never prints values |
| Demo media through Worker violates media rule | Fast follow after a sale: dedicated R2 custom domain, as Plugged does |
