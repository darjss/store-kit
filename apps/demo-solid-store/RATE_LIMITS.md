# ДУНД rate limits

The ДУНД Worker uses six isolated Cloudflare Rate Limiting bindings.

| Binding | Protected server function | Limit |
| --- | --- | --- |
| `CHECKOUT_RATE_LIMITER` | Checkout | 6 per minute |
| `PRIVATE_STATUS_RATE_LIMITER` | Private order status | 60 per minute |
| `BANK_CLAIM_RATE_LIMITER` | Bank-transfer claim | 6 per minute |
| `QPAY_REFRESH_RATE_LIMITER` | Private QPay refresh | 12 per minute |
| `SEARCH_RATE_LIMITER` | Typeahead search | 30 per minute |
| `CART_RATE_LIMITER` | Cart validation | 60 per minute |

`apps/demo-solid-store/wrangler.jsonc` provisions each binding with a separate account-local namespace ID. Wrangler provides deterministic local simulations for development and Worker tests.

The limits use the Cloudflare-provided client address as the key. They are permissive, location-local abuse controls. They are not accounting controls.

QPay and Telegram webhooks do not use these bindings. Provider retries must continue to reach the repeat-safe webhook operations.
