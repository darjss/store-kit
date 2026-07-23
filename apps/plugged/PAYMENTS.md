# Payment configuration

Set these Worker secrets before you use checkout:

```sh
vp exec wrangler secret put QPAY_USERNAME
vp exec wrangler secret put QPAY_PASSWORD
vp exec wrangler secret put QPAY_INVOICE_CODE
vp exec wrangler secret put TELEGRAM_BOT_TOKEN
vp exec wrangler secret put TELEGRAM_CHAT_ID
vp exec wrangler secret put TELEGRAM_WEBHOOK_SECRET
vp exec wrangler secret put TELEGRAM_ADMIN_USER_ID
```

Set `PUBLIC_APP_URL` and `QPAY_BASE_URL` in `wrangler.jsonc` for the target environment. Use the QPay sandbox URL until the real merchant check is complete.

Register `/api/webhooks/telegram` with Telegram and use the same `TELEGRAM_WEBHOOK_SECRET` as the webhook secret token. QPay and Telegram checks need real sandbox or bot credentials. Local database checks do not replace these provider checks.
