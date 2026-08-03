# template-store

The reference storefront app. Every cloned customer store starts as a copy of
this app. The demo deployment uses a fictional own-brand catalog and the
"Өнгө" store personality.

## Identity source

`store.json` in this directory is the single identity source. It controls
name, tagline, colors, typography voices, radius, footer copy, and the
announcement strip. `@store-kit/config` validates the file at render time.

## Local development

1. `vp run db:migrate:template-store:local` — apply migrations to local D1.
2. `vp run catalog:seed:template-store:local` — seed the demo catalog and
   upload media to the development R2 bucket.
3. `wrangler dev --port 8793` in this directory, then open
   <http://localhost:8793>.

## Deploy (development)

Cloud resources exist for the demo deployment:

- Worker `template-store-demo` on
  <https://template-store-demo.storekit.darjs.dev>
- D1 `template-store-development`
- R2 bucket `template-development-media` served from
  <https://template-store.storekitcdn.darjs.dev>
- KV namespaces `template-store-cache`, `template-store-auth`,
  `template-store-session`

Deploy with `pnpm build && npx wrangler deploy` from this directory. The
Astro-generated deploy config has no environment support, so this app uses
flat top-level configuration (unlike plugged's `env` block).

Seed resources for the development environment:

```sh
TEMPLATE_STORE_MEDIA_BUCKET=template-development-media \
  node --experimental-strip-types packages/tooling/catalog-seed.ts \
  --environment development --only media --app template-store
```

Replace `--only media` with `--only data` to seed the database, or remove it
entirely for media + data. Production seeding requires
`TEMPLATE_STORE_PRODUCTION_CONFIRMATION=approve-template-store-production`.

To clone this app for a customer: see `docs/design/storefront-directions.md`
and `plans/006-clone-pipeline.md`.
