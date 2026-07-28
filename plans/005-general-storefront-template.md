# 005: General storefront template and store.json v2

## Status

Plan. Not started.

## Goal

One neutral, clean, data-driven storefront template that any Mongolian store can
become by changing config and seed data only. No per-store design work.

The template is the cold-DM demo. A prospect sees a credible store on a phone,
with working checkout, and believes their store can look like this within days.

## Decisions

- Astro 7 + Solid 1 islands. Same stack as `apps/plugged`. Do not use the Solid 2
  experiment in `apps/demo-solid-store`.
- Fresh, clean, minimal design. Do not copy Plugged's grunge identity or DUND's
  editorial system.
- Identity comes from `store.json` and seed data. Pages and components consume
  config; they do not hardcode a store name, color, or copy.
- Headless behavior comes from `@store-kit/storefront`. The template owns only
  presentation.
- Per-store design forks remain allowed later. The template is the starting
  point, not a restriction.

## Scope

### 0. Visual reference

Default motif: 29CM-style curated commerce — typography-led and product-dense.
Products stay the hero. Editorial modules appear only when they merchandise
real products (curated rows, use-case picks). No sparse editorial layouts with
non-product filler. A Musinsa-style dense catalog is a later alternate motif
for high-SKU stores.

### 1. store.json v2 in `packages/config`

Extend `storeConfigSchema`. Keep `additionalProperties: false`. Keep existing
fields (`id`, `name`, `publicBaseUrl`) unchanged so the Plugged and DUND configs
stay valid.

Add optional groups:

| Group      | Fields                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `brand`    | `wordmark` (string), `logoAsset` (optional path under app `public/`)    |
| `theme`    | `accent` (hex), `ink` (hex), `surface` (hex), `radius` (`sm`/`md`/`lg`) |
| `contact`  | `phone`, `instagram`, `facebook` (optional URLs)                        |
| `footer`   | `tagline` (optional string)                                             |

Rules:

- Commerce data does not move into `store.json`. Bank-transfer instructions,
  delivery fee, and checkout copy stay in the seed contract `checkoutSettings`.
- Secrets never enter `store.json`.
- Export a `ParsedStoreConfig` type and keep `parseStoreConfig` as the single
  entry point.
- Unit tests: valid minimal config, valid full config, rejection of unknown
  keys, rejection of invalid hex colors.

### 2. Template app `apps/template-store`

New thin store app. App id `template-store`. Neutral Mongolian demo brand so
the deployed template is itself a usable demo link.

Pages (all SSR through Astro, Solid islands where interactive):

- `/` — announcement strip (optional), hero from `brand` + featured products,
  category list, service strip (delivery, payment, support from `contact`).
- `/products` — grid, category filter, use-case filter if present in seed,
  search entry.
- `/products/[slug]` — gallery, variant selection (size/color option map),
  price, stock state, purchase island.
- `/checkout` — guest checkout form.
- `/orders/[id]` — private order-status page with token.

Behavior imported from `@store-kit/storefront`:

- cart store with `makePersisted`, cart validation query options
- checkout form state and submit pipeline
- purchase flow and order-status query
- `formatMnt`, locale constants

The template writes its own presentational wrappers. Do not import
`apps/plugged` components.

### 3. Theme plumbing

- `store.json` theme values become CSS custom properties set in the Astro
  layout (`--accent`, `--ink`, `--surface`, `--radius`).
- Tailwind 4 `@theme` maps utilities to the custom properties.
- Type-Google-free: system font stack or one self-hosted Inter variable font.
  Keep the font choice fixed for the template.
- Wordmark renders as styled text. `logoAsset` replaces it when present.

### 4. Template seed

`apps/template-store/data/catalog.seed.json` with a small generic clothing
catalog: six to ten products across two or three categories, size/color
variants, stock, honest placeholder-free descriptions. Media follows the
existing content-addressed contract.

### 5. Tooling allow-list

Remove the `plugged | demo-solid-store` hardcoded allow-list in
`packages/tooling/catalog-seed-target.ts`. Accept any app directory that
contains `store.json` + `data/catalog.seed.json`. Do not special-case
`AMERIK_VITAMIN_INVOICE` in shared validation; move store-specific checks to
store-specific deploy tasks.

## Out of scope

- Admin screens, Better Auth, order lifecycle operations. Owned by the
  separate admin worktree.
- Scraping, provisioning, deploy pipeline. Covered by plan 006.
- Per-store custom domains beyond the development environment.
- DUND or Plugged changes.

## Completion criteria

- `parseStoreConfig` accepts a full branding config and rejects unknown keys.
- `apps/template-store` builds and deploys through the existing guarded
  development flow with its own D1/KV/R2 development resources.
- Changing only `store.json` + seed visibly rebrands the template: wordmark,
  colors, contact links, products.
- A phone browser completes guest checkout to the QPay QR step and to the
  bank-transfer instruction step with the template seed.
- `vp check` and `vp test` pass.

## Risks and controls

| Risk | Control |
| ---- | ------- |
| Config grows into a CMS | Only the fields above. New field requests need a plan edit. |
| Template becomes Plugged restyled | Fresh component files. Shared code only through `@store-kit/storefront`. |
| Theme tokens leak into shared packages | Tokens live in the template app only. `@store-kit/ui` unchanged. |
