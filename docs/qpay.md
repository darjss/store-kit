# QPay configuration

The store uses QPay Merchant V2. Set these Worker secrets from `apps/plugged`:

```sh
vp exec wrangler secret put QPAY_USERNAME
vp exec wrangler secret put QPAY_PASSWORD
vp exec wrangler secret put QPAY_INVOICE_CODE
```

Set `QPAY_BASE_URL` and `PUBLIC_APP_URL` for each Wrangler environment. Use the QPay sandbox base URL until the merchant check is complete. Use `apps/plugged/.dev.vars.example` only as a list of local secret names. Keep real values in the ignored `.dev.vars` file.

Rotate a credential by running its `wrangler secret put` command again, and then revoke the old merchant credential in QPay. Redeploy or restart local development after rotation so that isolates discard cached access tokens.

The adapter sends Basic authentication only to the token endpoint. It keeps the bearer token in isolate memory with an expiry skew and deduplicates concurrent refreshes. It invalidates the rejected token and retries one request after a 401. It never stores tokens in D1 or KV.

Invoice creation uses the stable order number as QPay's `sender_invoice_no`. It does not automatically retry invoice POST requests for network or server failures. A callback is not proof of payment. The webhook fetches the payment from QPay and requires a paid response before it confirms the order.

Provider response bodies and credentials stay inside the adapter. External payloads are validated before use. Returned errors contain only safe customer messages and never include URLs, tokens, credentials, or provider bodies.

Official reference: <https://developer.qpay.mn/mn/docs/merchant?version=2.0.0>
