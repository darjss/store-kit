# 004: DUND Solid 2 fashion store

## Status

Implementation plan. The first scaffold is part of this change. Full commerce parity is required before launch.

## Decision

Build a side-by-side Solid 2 store in `apps/demo-solid-store`. Keep `apps/plugged` deployable and on Solid 1.

Use the selected design-commit brand: **DUND / ДУНД**. DUND is an Ulaanbaatar capsule wardrobe for daily layering and sharp temperature changes. Treat the name as a working name until legal, trademark, domain, and social-handle checks are complete.

Do not use Uniqlo names, marks, copy, products, photography, layouts, or other intellectual property. DUND must use original products, copy, images, and visual language.

## Product direction

DUND launches with a small wardrobe across these categories:

- Base layers
- Shirts
- Knitwear
- Trousers
- Outerwear

The interface uses Mongolian labels, `mn-MN`, and integer MNT prices. Product facts stay flat: fabric, fit, care, origin, and season. Do not add a generic attribute engine, gender taxonomy, recommendation model, or fake inventory.

Use a garment-inspection visual system:

- Full-body looks
- Flat lays
- Fabric macro photography
- Size-label and care-label typography
- Precise tailoring marks
- Asphalt, saturated cobalt, and coral signal colors

Do not copy Plugged's warehouse-night identity. Avoid cashmere beige, ornamental cultural motifs, editorial-serif clichés, and identical card grids.

## Fixed framework baseline

Pin these versions in `apps/demo-solid-store`:

- `solid-js@2.0.0-beta.26`
- `@solidjs/web@2.0.0-beta.26`
- `@solidjs/router@1.0.0-next.9`
- `vite-plugin-solid@3.0.0-next.16`
- `@dom-expressions/compiler@0.50.0-next.29`
- `vite@8.0.0`
- `vite-plus@0.2.6`

Set `jsxImportSource` to `@solidjs/web`. Use strict TypeScript.

Do not change the workspace Solid 1 catalog. Do not import these browser graphs until real Solid 2 SSR and browser tests prove compatibility:

- `@store-kit/storefront`
- `@store-kit/ui`
- Kobalte
- TanStack Solid Form or Query
- Solid Primitives
- Solar Solid
- Unpic Solid

App-local Solid 2 controls are the safe default. Framework-neutral shared helpers are allowed.

## Turnkey SSR

Use the pinned turnkey setup:

```ts
solid({
  ssr: { app: "src/App.tsx" },
  serverFunctions: { components: true },
})
```

Use the generated client and server entries. Build:

- `dist/client`
- `dist/server/server.js`

The Worker calls the generated `handleRequest(request)` directly and does not buffer its body. Preserve streamed frame and document responses.

The scaffold found a pinned-runtime issue: Router route components loaded through `lazy()` caused a Workerd response stream to remain open without bytes after `handleRequest` returned. Direct route imports stream correctly. Keep direct route imports until an upstream fix is proved in a real Workerd test.

## Router Next

Define route configuration outside JSX with `createRouter`:

- `/`
- `/products`
- `/products/:slug`
- `/checkout`
- `/orders/:id`
- Not found

Use typed paths, plain anchors, and TypeBox through the existing Standard Schema adapter for search parameters.

The Router function child owns one persistent app shell. The shell owns:

- Cart
- Search surface
- Mobile navigation
- Focus restoration for persistent surfaces

Router state owns URLs, navigation, search text, catalog filters, and sorting.

## State ownership

Each value has one owner:

- Router: URLs and filters
- Server frames: public catalog HTML
- Request-owned Solid 2 store in the persistent shell: cart
- Local route state: gallery, selected variant, quantity, and checkout draft
- Actions: mutations
- D1 and shared commerce operations: authoritative money, stock, orders, and payments

Do not mirror one value through frames, Router queries, TanStack Query, and a local store.

Load a versioned DUND cart from `localStorage` only after `onSettled`. Initial SSR and hydration both show an empty cart. Persist only variant identity, quantity, and a non-authoritative display snapshot.

## Selective frames

Use frames for:

- Homepage merchandising
- Catalog results
- Product description and facts

Put gallery and purchase controls in a client slot inside the product frame. Use stable `dynamic()` call sites. Use `$key` with product IDs for repeated slots.

Do not use frames for:

- Cart
- Checkout results
- Payment commands
- Private order status

Server-owned content travels once as HTML. Do not send the same product as frame HTML and a serialized browser record.

Normalize nullable product details to `{}`. Render a clear state when no active purchasable variant exists. Never reveal exact stock. Expose only in-stock, low-stock, or sold-out labels and the allowed action limit.

## Server functions and shared commerce

Put catalog, checkout, order, and payment boundaries in `src/server`. Use function-level or module-level `'use server'` boundaries.

Validate each network argument inside the server boundary with shared TypeBox contracts. Call these shared namespaces directly:

- `commerce.catalog`
- `commerce.cart`
- `commerce.checkout`
- `commerce.orders`
- `commerce.payments`

Convert Better Result values to safe plain tagged transport values. Never return these values to the browser:

- Better Result instances
- Bindings
- Provider bodies
- Database records
- Secrets or tokens

Do not add controllers, repositories, dependency injection, or a second commerce layer.

## External HTTP boundary

Keep Elysia only for these exact routes:

- `POST /api/webhooks/qpay`
- `POST /api/webhooks/telegram`

Worker dispatch order is:

1. Known static assets
2. The two exact webhook paths
3. Turnkey `handleRequest`

Do not place Elysia or Eden between first-party Solid server functions and shared commerce operations. Do not forward all `/api/*` paths to the shared API app.

## Shared domain changes

Reuse `@store-kit/contracts`, `@store-kit/db`, and `@store-kit/commerce`.

Keep:

- TypeID entity IDs
- MNT integer money
- Order-line snapshots
- Simple variant option map
- D1 batch confirmation
- Database-per-store isolation

Generalize the audio-only merchandising tag union to a bounded slug contract. Validate a controlled tag set at each store's server and seed boundaries.

Plugged tags remain valid. DUND owns:

- `workday`
- `off-duty`
- `layering`
- `travel`
- `cold-weather`

Make the order prefix a validated checkout setting. Plugged keeps `PLG`. DUND uses `DND`. Never accept the prefix from a browser request.

Keep QPay bearer tokens in isolate memory only. Preserve expiry, clock skew, concurrent refresh deduplication, invalidation, and one retry after a 401. Never persist QPay bearer tokens to D1 or KV.

Source-export shared packages must use consumer-safe relative imports. Do not leak a package-local `~/` alias into consumers.

## Catalog and search

Preserve:

- Text search
- Category
- Brand
- Featured state
- Sorting
- Controlled use-case filters

Keep filter state in the URL. Direct reload, back, forward, and no-JavaScript filter links must work.

A full-screen typeahead can use a Router GET query because its compact result data is client-consumed. It must not duplicate frame-owned catalog records.

## Variants and gallery

Keep size and color in the existing option map. Preserve:

- SKU
- Variant price
- Compare-at price
- Active state
- Server-side stock
- Variant-linked images
- Shared image fallback
- First active in-stock default
- Sold-out disabling
- Quantity limits
- Accessible gallery announcements

## Checkout parity

Before checkout, revalidate product state, price, and stock through shared commerce. Show inline corrections for missing, inactive, price-changed, and insufficient-stock items.

Preserve guest checkout with:

- Controlled nine-district Ulaanbaatar list
- Khoroo
- Address
- Notes
- Mongolian phone normalization
- One fixed delivery fee
- Server-owned totals
- Recoverable form state
- First-invalid focus
- Customer-safe inline errors

Do not add accounts, nationwide delivery, or a multi-step wizard.

## QPay parity

Preserve:

- Invoice creation
- QR data
- Bank deep links
- Provider-side verification
- Customer refresh
- Webhook refresh
- One retry after a 401
- Validated provider responses
- Bank-transfer fallback when QPay setup fails

Resolve checkout idempotency before launch. The current shared flow creates a provider invoice before local order persistence. Add an idempotent checkout key or a recoverable pending-order sequence so a D1 failure does not leave repeated orphan invoices.

## Bank-transfer parity

Preserve:

- Bank instructions
- `I sent the payment` claim
- One durable claimed state
- Telegram staff notification
- Confirm and reject inline buttons
- Allowed-admin checks
- Callback answers
- Message editing
- Repeat-safe callbacks

Add an atomic notification claim before the QPay paid-order Telegram call. The current nullable message-ID check can send duplicate staff notifications under concurrent retries.

## Private order status

Keep the order ID in the route. Put the plaintext access token in the URL fragment for first entry. After hydration:

1. Move the token to route-scoped session storage.
2. Remove the fragment.
3. Keep the token out of query keys, analytics, logs, and persistence.

Render no personally identifiable information during SSR.

Preserve:

- Line snapshots
- Totals
- Delivery details
- Order and payment labels
- Help copy
- Wrong-token rejection

Poll every five seconds only while the order is nonterminal and payment is `pending` or `claimed`. Stop in background tabs and terminal states. Preserve manual order refresh, manual QPay refresh, bank-claim feedback, transport retry, and the paid-but-short-stock staff-action state.

## Repeat-safe money and stock

Preserve the D1 atomic batch that:

- Conditionally claims payment
- Decrements each variant once
- Prevents negative stock
- Marks payment paid
- Confirms the order

Repeated QPay and Telegram callbacks are stock no-ops. A paid QPay order with insufficient stock remains `new` and triggers urgent staff handling.

## Accessibility and mobile

Keep:

- Persistent four-action bottom navigation
- Safe-area padding
- Full-height cart and search surfaces
- At least 44 by 44 pixel targets
- Visible focus
- Skip link
- Semantic headings
- Keyboard traps and focus restoration
- Live announcements
- 320 pixel checkout support
- Reduced motion
- Loading, transport, empty, and error states

## Resources

Provision isolated DUND resources:

- Dedicated Worker and application domain
- Dedicated APAC D1 database
- Dedicated R2 bucket and media domain
- Dedicated CACHE KV namespace
- Dedicated Worker secrets

Do not attach Plugged domains or reuse Plugged bindings. The database is the tenant isolation boundary. Do not add tenant columns.

Apply shared migrations. Seed only DUND products and checkout settings.

Use immutable, content-addressed R2 keys. Public image URLs go directly to the media domain through Cloudflare Image Transformations. The storefront Worker has no public R2 read route or media proxy.

CACHE KV has one explicit store-local owner. It is available for a later approved cache or authentication feature. It must not store QPay bearer tokens.

Store QPay and Telegram credentials as Worker secrets. Validate only these variables:

- `DEPLOYMENT_ENV`
- `PUBLIC_APP_URL`
- `PUBLIC_MEDIA_BASE_URL`
- `QPAY_BASE_URL`

Keep secrets out of `store.json`, seed data, HTML, frame slot data, responses, and logs.

## Cache policy

Keep CDN documents, server data, and client data as separate cache owners.

For public `/`, `/products`, and `/products/:slug` documents:

```text
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400
```

Do not publicly cache complete frame responses until the pinned protocol is proved safe.

Fingerprinted assets and immutable media objects get long-lived immutable caching.

Use `private, no-store` or `no-store` for:

- Checkout
- Private order status
- Payment operations
- Server-function mutations
- Webhooks

## Delivery phases

### Phase 1: isolated scaffold

- Add exact framework pins.
- Add strict TypeScript, Tailwind 4, turnkey SSR, server functions, and frames.
- Add the persistent shell.
- Add working home, catalog, and product routes.
- Add checkout, order, and not-found route boundaries.
- Add original DUND seed data and store settings.
- Add thin Worker and isolated Wrangler configuration.
- Add real SSR, server-function, frame, server-only, and local D1 tests.

### Phase 2: real browser proof

- Prove hydration in a supported browser.
- Prove rapid navigation and stale-response rejection.
- Prove keyed slot reorder.
- Prove input, focus, shell, and cart preservation.
- Prove zero frame boot fetches.
- Prove reduced motion and narrow layouts.

### Phase 3: validated cart and checkout

- Complete server-backed cart revalidation.
- Implement the Ulaanbaatar form with shared TypeBox contracts.
- Implement recoverable submit state and accessible errors.
- Add idempotent checkout persistence.

### Phase 4: payments and private status

- Add QPay invoice, refresh, webhook, and 401 retry.
- Add bank-transfer claims and Telegram callbacks.
- Add atomic staff-notification claims.
- Add fragment-to-session private token handling.
- Add visibility-aware polling and terminal-state stopping.

### Phase 5: remote resources and launch proof

- Create dedicated APAC D1, R2, CACHE KV, Worker, domains, and secrets.
- Upload content-addressed original media.
- Apply migrations and remote DUND seed.
- Prove deployed streaming and `MISS` then `HIT` CDN behavior.
- Complete legal and identity checks.

## Required real tests

Tests must exercise real behavior. Do not mock frames, hydration, D1, server-function dispatch, payment confirmation, or webhook retries.

Required coverage:

- Initial SSR source
- Zero frame boot fetches
- Streaming
- Direct routes and no-JavaScript filter links
- Rapid navigation and stale-response rejection
- Keyed slot reorder
- Focus, input, persistent shell, and cart preservation
- Private token handling and no SSR PII
- Checkout corrections and recovery
- QPay and bank-transfer paths
- Repeat-safe webhooks and concurrent notification retry
- D1 payment and stock atomicity
- Reduced motion
- 320 pixel layouts
- Client-bundle privacy
- Dedicated resource bindings
- Deployed cache `MISS` then `HIT`

The scaffold test must use a production build, a real local D1 database, the real seed command, real Workerd, real generated server-function dispatch, and real streamed frame responses.

## Risks and controls

### P1: Solid 1 contamination

The workspace still contains Solid 1 packages. Keep the Solid 2 app isolated. Treat any browser import from the Solid 1 graph as a release blocker.

### P1: framework prerelease behavior

No complete Solid 2 browser proof exists in this repository. Keep Plugged deployable as the rollback path. Do not replace Plugged until the full real-runtime matrix passes.

### P1: Workerd lazy-route stream stall

The pinned stack stalled with Router `lazy()` route components in Workerd. Keep direct imports. Add an upstream reproduction before changing this decision.

### P1: external-payment reliability

Resolve orphan QPay invoice recovery and duplicate Telegram notification claims before payment launch.

### P1: boundary drift

Expose only the two exact webhook paths through Elysia. Test that broad `/api/*` forwarding is unavailable.

### P2: private-token leakage

Do not use the Solid 1 order query layer. Keep the token in a private server-function closure and scoped session storage.

### P2: incomplete public products

Normalize nullable facts and empty variants. Render customer-safe non-purchasable states.

### P2: exact-stock leakage

Never copy Plugged's exact-stock labels into DUND.

### P2: brand clearance

DUND is not cleared. Complete naming, trademark, domain, social-handle, and Mongolian Cyrillic font checks before asset production.

## Completion criteria

DUND can launch only when:

- All exact framework pins remain isolated.
- Plugged remains deployable.
- Home, catalog, product, cart, checkout, payments, and private order status have full commerce parity.
- Server frames and app-owned state follow the ownership rules.
- No Solid 1 browser package enters the bundle.
- No Uniqlo intellectual property is present.
- All network inputs and provider responses are validated.
- Payment and stock operations are repeat-safe.
- Dedicated resources and secrets are in place.
- Real local and deployed verification passes.
- Naming and asset rights are cleared.
