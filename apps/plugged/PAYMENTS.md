# Environment and local preview

Copy `.dev.vars.example` to the ignored `.dev.vars` file. The example uses the stable local
application URL `https://plugged.localhost` and keeps local media on the same origin.

Start a development preview from the workspace root:

```sh
vp exec portless proxy start
vp exec portless trust
vp run db:migrate:plugged:local
PLUGGED_MEDIA_BUCKET=<development-r2-bucket> vp run catalog:media:plugged:development
vp run db:migrate:plugged:development
PLUGGED_MEDIA_BUCKET=<development-r2-bucket> vp run catalog:seed:plugged:development
vp run plugged:dev
vp run plugged:route
vp exec portless doctor
```

Open `https://plugged.localhost`. Astro owns the background server lifecycle. The route task reads
the current port from `astro dev status` and registers the explicit `plugged` Portless alias.

Stop the server and remove its route when the preview is complete:

```sh
vp run plugged:dev:stop
vp exec portless alias --remove plugged
```

## Provider configuration

From `apps/plugged`, set these Worker secrets before you use provider-backed checkout:

```sh
vp run plugged:secret-names:development
```

The task prints the environment-specific interactive `wrangler secret put` commands without
reading or writing values. Set `DEPLOYMENT_ENV`, `PUBLIC_APP_URL`, `PUBLIC_MEDIA_BASE_URL`, and
`QPAY_BASE_URL` in `wrangler.jsonc` for the target environment. Use the QPay sandbox URL until the
real merchant check is complete.

Register `/api/webhooks/telegram` with Telegram and use the same `TELEGRAM_WEBHOOK_SECRET` as the webhook secret token. QPay and Telegram checks need real sandbox or bot credentials. Local database checks do not replace these provider checks.
