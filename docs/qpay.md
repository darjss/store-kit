# QPay configuration

The store uses QPay Merchant V2. Set these Worker secrets or variables:

- `QPAY_CLIENT_ID` (secret)
- `QPAY_CLIENT_SECRET` (secret)
- `QPAY_INVOICE_CODE`
- `QPAY_ENVIRONMENT` (`sandbox` or `production`)

Use `vp exec wrangler secret put QPAY_CLIENT_ID` and `vp exec wrangler secret put QPAY_CLIENT_SECRET` from `apps/plugged`. Do not put credential values in Wrangler configuration or source files.

The adapter authenticates with Basic authentication, then uses the access token for invoice creation and payment inspection. QPay does not document a callback signature for Merchant V2. A callback is not proof of payment. The webhook route must pass the invoice ID to `handleWebhook`, which calls `POST /v2/payment/check`, checks the amount, and only then runs the supplied paid-payment hook.

Provider response bodies and credential values stay inside the adapter. Returned errors contain only safe customer messages.

Official reference: <https://developer.qpay.mn/mn/docs/merchant?version=2.0.0>
