# QPay configuration

The store uses QPay Merchant V2. Set these Worker secrets from `apps/plugged`:

```sh
vp exec wrangler secret put QPAY_USERNAME
vp exec wrangler secret put QPAY_PASSWORD
vp exec wrangler secret put QPAY_INVOICE_CODE
```

Set `QPAY_BASE_URL` and `PUBLIC_APP_URL` for each Wrangler environment. Use the QPay sandbox base URL until the merchant check is complete. Do not put credentials in Wrangler configuration or source files.

The adapter uses Basic authentication to get an access token. It uses this token to create invoices and verify payments. A callback is not proof of payment. The webhook fetches the payment from QPay before it confirms the order.

Provider response bodies and credentials stay inside the adapter. Returned errors contain only safe customer messages.

Official reference: <https://developer.qpay.mn/mn/docs/merchant?version=2.0.0>
