# Plugged aggregate review fixes

## Scope

Address the accepted comments from aggregate PR #14 after PR #15. Use one new stacked follow-up PR based on `plugged/10-standard-env`.

Do not include the visual redesign in this PR. Select and implement the new visual direction separately.

## Feedback decisions

| # | Review location | Verdict | Action |
|---|---|---|---|
| 1 | `CheckoutForm.tsx:47-57` — use a toast | Keep | Keep blocking domain failures as persistent inline alerts. They contain corrective actions and must not disappear. Reserve toasts for transient success or non-blocking status. |
| 2 | `CheckoutForm.tsx:47-56` — generic error component | Confirmed with ownership split | Move reusable form-error visibility, submit-attempt state, error summary, and domain-error actions into storefront. Keep the visual alert primitive in UI. Plugged supplies Mongolian copy, Tailwind classes, and store-specific action labels. Remove the component-local generic error-state logic. |
| 3 | `CartSheet.tsx:140-167` — move validation logic to storefront | Confirmed | Move cart validation query state, snapshot refresh, corrections, transport state, and checkout gating into a headless storefront controller. |
| 4 | `CartSheet.tsx:249-260` — keep only styling in Plugged | Partly | Leave Plugged markup, Mongolian copy, and Tailwind composition in the app. Move reusable state and commands to storefront. Do not move store art direction into the package. |
| 5 | `product-image.ts:1-3` — re-exported image type | Confirmed | Remove `ProductImageMetadata = PublicImage`. Import `PublicImage` directly where needed. Keep only the layout configuration and its layout-key type. |
| 6 | `ProductImage.astro:21-30` — why Astro `Image` | Confirmed | Use the official Unpic-backed image path for every catalog image. Remove the local `/media` and plain `<img>` branch. Development uses the remote R2 custom domain too. |
| 7 | `ProductImage.tsx:15-26` — raw `<img>` fallback | Confirmed | Remove the raw `<img>` fallback. All environments receive remote custom-domain URLs and use Unpic Solid with Cloudflare transformation. |
| 8 | `ProductPurchase.tsx:69-78` — move logic to storefront | Confirmed | Move selected variant, quantity clamping, image selection, cart command, and announcements into a headless storefront purchase controller. Keep the product page layout and Tailwind in Plugged. |
| 9 | `StoreSearch.tsx:27-39` — move logic to storefront | Confirmed | Move query text, debounce, query options, result state, and focus-return behavior into a headless storefront search controller. Keep dialog rendering and store copy in Plugged. |
| 10 | `packages/api/src/media.ts:7-21` — direct CDN domain | Confirmed | Remove request-dependent local media URLs. Every environment constructs catalog URLs from the remote R2 custom domain. Remove the Astro Worker `/media` read route and its runtime R2 read path. Use a remote development R2 bucket and custom domain for development and tests. |
| 12 | `qpay.ts:5-6` — split errors by domain | Confirmed | Split the full commerce error god file by every current domain, not only the two examples: catalog, cart, checkout, orders/private status, payments, QPay, and Telegram. Keep a tiny barrel only if it improves imports without merging ownership back into one file. |
| 13 | `catalog/operations.ts:49-50` — re-exports | Confirmed | Remove convenience type re-exports from the operations module. Consumers must import shared errors from contracts and filters from their owning schema package. |
| 14 | `checkout/operations.ts:30-43` — normalization | Keep | Normalize again at the server trust boundary. The browser is untrusted and may bypass the form. Frontend normalization can improve UX, but it cannot replace server normalization. Validate and persist the same normalized object. |
| 15 | `checkout/operations.ts:91` — phone prefix check in frontend | Partly | Put the normalized Mongolian phone rule in the shared checkout contract so TanStack Form and the API use it. Keep server enforcement because callers can bypass the frontend. Remove the duplicate handwritten regex after shared-schema validation covers the normalized value. |
| 16 | `checkout/operations.ts:93` — handwritten validation paths | Confirmed | Keep `InvalidCheckoutDetails` as a Better Result domain error, but generate structural field issues from the shared schema instead of manually writing `/customer/phone`. Keep a small explicit issue only for semantic rules such as duplicate variant IDs. |
| 17 | `checkout/operations.ts:104-113` — pattern matching | Partly | Extract cart-line validation. Use `dismatch` when the missing, inactive, and insufficient-stock branches are clearer as three named cases. Do not replace simple booleans with pattern matching. |
| 18 | `checkout/operations.ts:114-118` — return an object from a function | Confirmed | Add a small helper that validates one authoritative cart line and returns its corrections. Keep database reads and orchestration in `createCheckoutOrder`. |
| 19 | `payments/operations.ts:178-185` — positive feedback | Approved | No change. Preserve this Better Result mapping style. |
| 20 | `payments/operations.ts:312-323` — positive feedback | Approved | No change. Preserve this pattern-matching flow. |
| 21 | `commerce/src/errors.ts:3-23` — contracts versus domain files | Confirmed with boundary | Split all factories by domain: catalog, cart, checkout, orders/private status, payments, QPay, and Telegram. Keep browser-visible error types in matching contracts modules. Keep server-only provider failures in matching commerce error modules. Do not expose provider internals to the frontend. |

## Implementation order

### 1. Fix shared validation and error ownership

- Add the normalized phone constraint to the shared checkout schema in `packages/contracts`.
- Use the PR #15 Standard Schema adapter for TanStack Form and API validation.
- Validate the server-normalized checkout object against the same schema.
- Generate field issues from schema errors.
- Keep duplicate cart variants as one explicit semantic issue.
- Split `packages/commerce/src/errors.ts` into domain files:
  - `errors/catalog.ts`
  - `errors/cart.ts`
  - `errors/checkout.ts`
  - `errors/orders.ts`
  - `errors/payments.ts`
  - `errors/qpay.ts`
  - `errors/telegram.ts`
- Split shared public error types into matching contracts modules. Keep server-only provider failures in commerce.
- Remove operation-module type re-exports.

### 2. Simplify checkout cart validation

- Extract one cart-line validation helper from `createCheckoutOrder`.
- Return `CartCorrection[]` from the helper.
- Use named pattern matching only for the three variant states when it is clearer than nested conditions.
- Keep authoritative price, stock, active-state, and delivery checks on the server.
- Preserve the approved Better Result payment flow.

### 3. Move reusable storefront behavior

- Add a headless cart-validation controller in `packages/storefront`.
- Add a headless product-purchase controller in `packages/storefront`.
- Add a headless catalog-search controller in `packages/storefront`.
- Add shared form-error behavior in storefront: touched/submitted visibility, summary data, first-invalid-field focus, transport state, and domain correction actions.
- Keep the visual `Alert`, `FieldError`, and toast primitives in `packages/ui`.
- Move signals, query calls, debounce, correction mapping, snapshot refresh, quantity rules, cart commands, and generic error-state decisions into these controllers.
- Keep Plugged JSX composition, Mongolian copy, Unpic rendering, and Tailwind classes in `apps/plugged`.
- Do not create a styled cross-store checkout component.

### 4. Simplify image ownership and use remote R2 everywhere

- Remove the `ProductImageMetadata` alias.
- Use a remote R2 bucket and custom domain in development, preview, and production.
- Use `https://plugged.storekitcdn.darjs.dev/` as the catalog-media origin, or a separate remote development subdomain if the development bucket is isolated.
- Make `publicMediaUrl` independent of the request host.
- Remove the Astro Worker `/media` route, local URL branch, raw `<img>` fallbacks, and unused runtime R2 read binding.
- Update seed tooling to upload catalog media to the selected remote development R2 bucket explicitly. Do not write to production unintentionally.
- Use official Unpic Astro and Solid paths for every catalog image.
- Configure the custom domain and cache policy in Cloudflare.
- Verify that all image requests go directly to the custom domain and never invoke `/media/*` on the Astro Worker.

### 5. Fix form validation only

- Show a field error only after that field is touched or after submit is attempted.
- Typing in one field must not reveal errors for untouched fields.
- On failed submit, show all relevant errors and focus the first invalid field or error summary.
- Do not polish the current typography or visual design in this PR. The storefront UI will be replaced after a reference direction is approved.

### 6. Deploy and verify Cloudflare resources

- Create or confirm a separate remote development R2 bucket and custom media domain before changing development media URLs.
- Configure the development and production `PUBLIC_MEDIA_BASE_URL` values with their matching custom domains.
- Upload the approved catalog seed media to the remote development R2 bucket. Require an explicit environment or bucket argument so the development command cannot write to production by accident.
- Generate Worker binding types after binding changes.
- Apply remote D1 migrations to the development database, then run the real catalog seed against development resources.
- Configure required Worker secrets with Wrangler. Never commit secret values.
- Build and deploy the Plugged Worker to the development environment.
- Verify Worker routes, D1 reads and writes, remote R2 images, Cloudflare image transformation, cache headers, checkout, private order status, and webhook endpoints on the deployed URL.
- Deploy production only after development verification passes and the target environment is explicit.
- Apply production D1 migrations before the production Worker version that requires them.
- Upload production media and seed data only through an explicit production command and confirmation.
- Run post-deploy smoke checks and keep the previous Worker version available for rollback.

## Verification

Use real behavior. Do not add mocks or fake provider implementations.

- Shared schema accepts normalized valid checkout details and rejects invalid phone, whitespace-only required values, and malformed cart lines.
- Browser and API produce matching field paths from the shared schema.
- Server normalization is applied before validation and persistence.
- Direct API calls cannot bypass phone, cart, price, stock, or delivery validation.
- Duplicate variants return the explicit semantic issue.
- Cart corrections refresh local display snapshots and block checkout until resolved.
- Search debounce, pending, empty, failure, and focus restoration work through the headless controller.
- Product variant selection, image fallback, quantity clamp, cart add, and announcement work through the headless controller.
- Development and production image HTML use the configured remote custom domain and responsive Unpic output.
- HTML and network traces contain no `/media/` catalog requests.
- Remote development seed uploads target the development bucket explicitly and cannot overwrite production by accident.
- Initial checkout shows no validation errors.
- Editing one field shows no errors for untouched fields.
- Submit reveals all invalid fields and moves focus correctly.

Run:

```sh
vp install
vp run @store-kit/plugged#generate-types
vp check
vp test
vp run db:test:integration
vp run test:commerce:integration
vp run -r build
```

Then run a clean local migration, seed, and browser smoke test.

## Non-goals

- Do not implement the new visual direction in this PR.
- Do not move Plugged styling or Mongolian copy into storefront.
- Do not replace actionable domain alerts with toasts.
- Do not trust frontend validation as the server authority.
- Do not expose QPay or Telegram adapter errors to browser contracts.
- Do not add a generic provider or image framework.
- Do not put store-specific copy or styling into shared form-error behavior.
