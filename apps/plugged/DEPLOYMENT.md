# Plugged environments and deployment

Catalog media is always read from a remote R2 custom domain. The production origin is fixed at
`https://plugged.storekitcdn.darjs.dev/`. Development must use a separate remote bucket and custom
domain; it may never fall back to the production origin. The Astro Worker has no public R2 read
binding or media route.

## Required Wrangler configuration

Deployment tasks require an explicit `env.development` or `env.production` entry in
`wrangler.jsonc`. They stop before Wrangler runs unless the selected environment has:

- a unique Worker `name`
- `DB` with both `database_name` and `database_id`
- `CACHE`, `AUTH_KV`, and Astro's `SESSION` binding with IDs
- `DEPLOYMENT_ENV`, `PUBLIC_APP_URL`, `PUBLIC_MEDIA_BASE_URL`, and `QPAY_BASE_URL` variables

Wrangler variables and bindings are non-inheritable between environments, so declare every item in
each environment. Use the real values returned by Cloudflare; do not invent IDs or leave
auto-provisioning placeholders. The development media URL must be its development R2 custom-domain
origin. The production media URL must be:

```jsonc
"PUBLIC_MEDIA_BASE_URL": "https://plugged.storekitcdn.darjs.dev/"
```

Connect each bucket to its custom domain in R2 **Settings → Custom Domains**. Keep the development
and production domains on their matching buckets. Uploaded catalog objects receive
`Cache-Control: public, max-age=31536000, immutable`; configure the domain's Cloudflare cache policy
to cache the catalog image types.

For local development, copy `.dev.vars.example`, set `DEPLOYMENT_ENV=development`, and provide the
remote development custom-domain origin. An empty value intentionally fails validation.

## Reliable local browser runtime

Astro 7.1.3 with `@astrojs/cloudflare` 14.1.4 currently fails while matching dynamic server routes
in `astro dev`. A request that considers `products/[slug].astro` returns `require is not defined`
from `workers/runner-worker/index.js:107` through
`NonRunnablePipeline.getComponentByRoute`. Static island-only routes can still return 200. The same
source builds and runs in local Wrangler. This is the Cloudflare SSR dependency-optimizer failure
tracked in [withastro/astro#16248](https://github.com/withastro/astro/issues/16248); Astro's current
Cloudflare guide also states that CommonJS dependencies can fail in the development `workerd`
environment and recommends built local preview for production-like checks. The storefront routes
used server catalog imports before the warehouse-night redesign, so that redesign did not introduce
the runtime category.

Use the built Worker for browser QA until the upstream development runner is fixed. Start from a
clean local database when you need repeatable catalog and checkout behavior:

```sh
rm -rf apps/plugged/.wrangler/state
vp run db:migrate:plugged:local
vp run catalog:seed:plugged:local
PLUGGED_LOCAL_MEDIA_BASE_URL=https://plugged-dev.storekitcdn.darjs.dev/ \
  vp run plugged:browser:start
vp run plugged:browser:health
```

`plugged:browser:start` builds Astro, starts Wrangler with `--local`, disables remote bindings, and
writes an explicit development-only environment file under ignored `.astro/`. It rejects the
production media origin and requires a development R2 custom domain. It does not load provider
credentials or access production D1 or KV resources.

Manage the background Worker with:

```sh
vp run plugged:browser:status
vp run plugged:browser:logs
vp run plugged:browser:stop
```

The supported local URL is `http://127.0.0.1:4321`.

## Development release

Set the exact remote development bucket name for every media or deploy command:

```sh
vp run plugged:generate-types
PLUGGED_MEDIA_BUCKET=plugged-development-media vp run catalog:media:plugged:development
vp run db:migrate:plugged:development
PLUGGED_MEDIA_BUCKET=plugged-development-media vp run catalog:seed:plugged:development
vp run plugged:secret-names:development
PLUGGED_MEDIA_BUCKET=plugged-development-media vp run plugged:deploy:dry-run:development
PLUGGED_MEDIA_BUCKET=plugged-development-media vp run plugged:deploy:development
PLUGGED_SMOKE_URL=https://<development-worker-host>/ \
  PLUGGED_MEDIA_BASE_URL=https://plugged-dev.storekitcdn.darjs.dev/ \
  vp run plugged:smoke:development
```

The secret-name task only prints interactive `wrangler secret put` commands. It never reads or
writes secret values. Required names are:

- `QPAY_USERNAME`
- `QPAY_PASSWORD`
- `QPAY_INVOICE_CODE`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_USER_ID`

The smoke task checks the system and catalog routes, direct R2 image access, responsive Cloudflare
transformation output, object cache headers, and the absence of the removed Worker media route.

## Production release

Production commands require both `--env production` internally and an operation-specific
confirmation. Run them only after development smoke passes:

```sh
PLUGGED_PRODUCTION_CONFIRMATION=production:migrate \
  vp run db:migrate:plugged:production

PLUGGED_MEDIA_BUCKET=<production-r2-bucket> \
  PLUGGED_PRODUCTION_CONFIRMATION=production:<production-r2-bucket> \
  vp run catalog:media:plugged:production

PLUGGED_MEDIA_BUCKET=<production-r2-bucket> \
  PLUGGED_PRODUCTION_CONFIRMATION=production:<production-r2-bucket> \
  vp run catalog:seed:plugged:production

vp run plugged:secret-names:production

PLUGGED_MEDIA_BUCKET=<production-r2-bucket> \
  PLUGGED_PRODUCTION_CONFIRMATION=production:deploy \
  vp run plugged:deploy:production

PLUGGED_SMOKE_URL=https://<production-worker-host>/ \
  PLUGGED_MEDIA_BASE_URL=https://plugged.storekitcdn.darjs.dev/ \
  vp run plugged:smoke:production
```

Never commit `.dev.vars`, secret values, provider responses, or Wrangler logs.

## Rollback

List Worker versions with `vp exec wrangler versions list --env <environment>` and restore an
explicit version:

```sh
PLUGGED_ROLLBACK_VERSION=<development-version-id> vp run plugged:rollback:development

PLUGGED_ROLLBACK_VERSION=<production-version-id> \
  PLUGGED_PRODUCTION_CONFIRMATION=production:rollback \
  vp run plugged:rollback:production
```

D1 migrations are backed up by Cloudflare before apply. A Worker rollback does not reverse D1 or
R2 changes, so use D1 Time Travel or a reviewed forward migration when data rollback is required.

## References

- [Unpic Astro images](https://unpic.pics/img/astro/),
  [Solid images](https://unpic.pics/img/solid/), and
  [Cloudflare provider](https://unpic.pics/providers/cloudflare/)
- [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [R2 public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/) and
  [Worker rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
