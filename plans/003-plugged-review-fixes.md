# Plugged stacked-PR review fixes

## Objective

Address the Plannotator feedback after merging PRs #5, #6, and #7. Deliver the corrections as three small stacked follow-up PRs.

Keep the implementation small and direct. Improve package boundaries, functional flow, shared UI use, validation, and storefront conventions without adding enterprise architecture.

PRs #5, #6, and #7 are merged. Add this follow-up stack:

```text
master
  └─ PR #8 plugged/04-foundations
       └─ PR #9 plugged/05-commerce-payments
            └─ PR #10 plugged/06-storefront-polish
```

Keep each correction in its lowest new owning PR. Parallel writers can produce isolated commits, but one integrator owns each PR boundary.

## Confirmed conventions from the review

Record these rules in `docs/product-preferences.md`. Add short enforcement rules to `AGENTS.md` where future coding agents must see them.

- Use `~/` aliases for imports inside each package or app. Do not use multi-level relative source imports.
- Expose database access through plain feature namespaces such as `db.query.checkout.insertOrder(...)`.
- Expose commerce behavior through plain feature namespaces such as `commerce.payments.claimBankTransfer(...)`.
- Use separate feature modules for catalog, cart, checkout, orders, and payments. Do not use the vague `shopping` name for unrelated behavior.
- Keep schemas, errors, types, queries, operations, adapters, routes, and webhooks in their correct boundaries.
- Use Dismatch for exhaustive switches over tagged errors, payment methods, and statuses.
- Use Better Result's `map`, `mapError`, `andThen`, and `match` for typed success/failure pipelines.
- Use es-toolkit `flow` to compose reusable pure transformations. Use native array methods and discriminated unions for simple data flow.
- Do not add Effect, ts-pattern, fp-ts, Remeda, or another overlapping functional runtime. Do not replace clear one-condition branches with a functional abstraction.
- Use TypeID for IDs in every database table. Give each entity a stable prefix.
- Use TypeBox to validate external QPay and Telegram response payloads before reading fields.
- Use one configured Ky client per external provider and follow the provider-authentication rules in this plan.
- Use the current TanStack Solid Query `useQuery` API and the shared Better Result query helper. Do not introduce new `createQuery` calls.
- Use TanStack Form for checkout state and validation. Render fields and actions with components from `@store-kit/ui`.
- Add missing Zaidan components through the shadcn registry instead of rebuilding them in an app.
- Use Tailwind for all application styling. Keep CSS files only as Tailwind entry points and definitions required by Tailwind, fonts, tokens, keyframes, or custom utilities.
- Use Unpic with Cloudflare Image Transformations, responsive sources, dimensions, and correct loading priority for storefront product images.
- Use Solar for user-visible icons.
- Put repeated client constants and formatting behavior in small shared modules.
- Browser validation improves UX, but the server must still validate and normalize every checkout request.

## Architectural target

### Client-safe contracts

Add `@store-kit/contracts` as a small browser-safe package.

It owns only schemas and inferred types that have honest consumers in both server and browser code:

- authoritative cart-line input
- persisted cart display snapshot
- cart validation result and corrections
- checkout input
- public order status
- expected cart, checkout, order, and payment error unions
- serialized public payment instructions

It must not import Drizzle, D1, Cloudflare bindings, Elysia, or server adapters.

Database-generated schemas remain in `@store-kit/db`. Move a schema to contracts only when it is a public commerce contract rather than a persistence row shape.

This removes the current database-type leak into `@store-kit/storefront`.

### Database namespace

Export one plain namespace without classes or repositories:

```ts
export const query = {
  catalog: catalogQuery,
  cart: cartQuery,
  checkout: checkoutQuery,
  orders: orderQuery,
  payments: paymentQuery,
};
```

Example use:

```ts
await db.query.checkout.insertOrder(input);
await db.query.payments.findByOrderId(orderId);
```

Each feature query object stays in its own file. Query files import the shared database binding directly.

### Commerce namespace

Export plain operation namespaces:

```ts
export const commerce = {
  cart: cartOperations,
  checkout: checkoutOperations,
  orders: orderOperations,
  payments: paymentOperations,
};
```

Example use:

```ts
await commerce.payments.claimBankTransfer(input);
await commerce.checkout.createOrder(input);
```

Do not add service classes, dependency-injection containers, controllers, or generic repositories.

### Feature files

Use this small feature structure where the feature is large enough to need it:

```text
checkout/
  errors.ts
  schemas.ts
  operations.ts

payments/
  errors.ts
  schemas.ts
  operations.ts
```

Do not create one-file folders for tiny features. API routes serialize Results at the HTTP boundary; commerce operations own domain decisions and errors.

## PR #8: Foundations

Implement these changes in `plugged/04-foundations`, based on `master`.

### Contracts and package boundaries

- Add `@store-kit/contracts` with TypeBox and Better Result-safe public contracts.
- Move cart input, persisted display snapshot, cart correction, checkout input, and expected public error schemas into it.
- Update commerce and storefront imports to use contracts instead of database schemas.
- Keep Drizzle table schemas and persistence-only types in `@store-kit/db`.

### Database queries

- Split the current `shopping` query module into cart, checkout, orders, and payments modules.
- Export the `db.query.<feature>.<operation>()` namespace.
- Keep concrete Drizzle operations in query modules.
- Keep business decisions out of database query modules.
- Keep direct database binding imports; do not pass `db` through every function.

### IDs

Install `typeid-js` through the package manager.

Use TypeID for every single-column database primary key, including catalog, configuration, order, and payment tables:

```text
brd     brand
cat     category
prod    product
img     product image
var     product variant
cfg     checkout or store configuration
ord     customer order
line    order line
pay     payment
```

Join tables with natural composite primary keys do not need a synthetic ID.

This store is not in production. Regenerate the schema, seed IDs, foreign-key references, migration, and snapshots together. Do not add UUID compatibility code. TypeBox schemas must validate the expected TypeID prefix at public and seed boundaries.

### D1 batch implementation

Replace handwritten SQL strings with Drizzle query builders wherever Drizzle can express the same conditional update.

The payment confirmation must still use one D1/Drizzle batch so that it:

- uses one Worker-to-D1 binding call
- executes as one D1 transaction
- rolls back the batch on failure
- decrements stock at most once
- never makes stock negative
- allows the integrator to inspect affected-row counts

Use Drizzle `sql` expressions only for atomic predicates or arithmetic that the update builder requires. Do not replace the batch with `Promise.all`; parallel calls are not one atomic transaction.

### Verification

- Generate and inspect the migration.
- Apply it to a fresh local D1 database.
- Seed the real Plugged catalog.
- Verify TypeID prefixes and constraints in D1.
- Verify cross-package contracts compile without server imports in the browser package.
- Verify payment-confirmation query builders still form one D1 batch.

## PR #9: Commerce and payments

Implement these changes in `plugged/05-commerce-payments`, based on `plugged/04-foundations`.

### Commerce module organization

- Replace vague `shopping` operation ownership with cart, checkout, order, and payment features.
- Move checkout schemas and errors out of the operation file when they are reused or make the operation hard to scan.
- Centralize each expected error in its owning commerce feature, not in API routes.
- Keep provider transport errors in adapter modules.

Use precise names:

- `QPayRequestFailed`
- `QPayResponseInvalid`
- `TelegramRequestFailed`
- `BankTransferClaimNotAllowed`
- `PaymentConfirmationFailed`

Do not rename a Telegram transport failure to a bank-transfer error. Telegram is the failing external boundary; bank-transfer errors describe commerce state.

### Functional control flow

Use this small functional vocabulary:

- Dismatch for exhaustive tagged unions and expression-style pattern matching
- Better Result `map`, `mapError`, `andThen`, and `match` for fallible workflows
- es-toolkit `flow` for reusable left-to-right pure function composition
- native `map`, `filter`, `flatMap`, `reduce`, and discriminated-union narrowing for ordinary collections
- a native exhaustive `switch` with a `never` assertion when it is clearer than Dismatch

Apply Dismatch to:

- selected payment method
- cart correction variants
- expected checkout errors
- payment confirmation outcomes
- QPay states
- Telegram callback actions

Use Better Result pipelines where they make sequential failure flow clearer. Do not add another functional library or force a pipeline into simple guards.

### Checkout form and validation

Use TanStack Form as the only checkout form-state owner. Connect the shared TypeBox checkout schema through the TanStack Form Standard Schema adapter or the smallest supported TypeBox validator integration. Do not hand-maintain a second client validation definition.

Render checkout controls with `@store-kit/ui` Zaidan components, including Input, Textarea, RadioGroup, NativeSelect when appropriate, Field, and Button. The components must receive TanStack Form values, blur/change handlers, field errors, required state, `aria-invalid`, and `aria-describedby`.

Also validate and normalize the same contract on the server because browser requests are untrusted. The server remains responsible for:

- phone normalization
- required fields
- delivery availability
- cart authority
- price and stock authority
- payment-method availability

Move structural checks into the shared TypeBox checkout schema. Keep only semantic normalization and database-dependent validation in checkout operations.

### API route boundary

- Route handlers call namespaced commerce operations.
- Route handlers serialize Better Result values because serialization is transport behavior.
- Do not move `Result.serialize` into commerce operations.
- Add one tiny API-local response helper only if it removes real repeated serialization without hiding route behavior.
- Do not add handwritten error mappers or a second error envelope.
- Move `/webhooks/qpay` into `packages/api/src/webhooks/qpay.ts`.
- Keep Telegram in `packages/api/src/webhooks/telegram.ts`.

### Ky clients and provider authentication

Create one lazy configured Ky client per provider. Keep credentials in Cloudflare Worker secrets, never in `store.json`, source files, public environment variables, responses, or logs. Commit only `.dev.vars.example` names; keep real `.dev.vars` ignored.

Telegram:

```ts
const telegramClient = ky.create({
  prefixUrl: `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`,
  timeout: 10_000,
  retry: { limit: 1, methods: ["get", "post"] },
});
```

- Telegram requires the bot token in its API path. Never include the final URL in errors or logs because it contains the secret.
- Verify `x-telegram-bot-api-secret-token` before parsing callbacks.
- Verify the configured admin user ID before executing an action.
- Keep callback payloads signed or bound to server-owned order data.

QPay:

- send Basic credentials only to the token endpoint
- keep the bearer access token in an isolate-local memory cache with its expiry and a safety skew
- deduplicate concurrent token refresh with one in-flight promise
- treat the cache as an optimization, never durable state
- attach the current bearer token in a Ky `beforeRequest` hook
- on one 401 response, invalidate the cached token, refresh, and retry once
- never persist QPay access tokens in D1 or KV
- apply explicit timeout and conservative retry rules; never blindly retry a non-idempotent invoice request without its stable order idempotency key

Use separate clients or hooks when token-endpoint and authenticated API behavior differ. Do not create a generic provider framework.

Validate every external response with TypeBox before reading fields. Map invalid payloads to safe adapter errors. Never return or log credentials, bearer tokens, full provider bodies, or Telegram token-bearing URLs. Document secret rotation with `wrangler secret put`.

### Imports

Configure `~/*` to resolve to each package's `src/*`.

Replace package-internal parent traversals in the touched commerce, API, and storefront files. Keep short same-folder `./` imports where they are clearer.

### Verification

- Run real local checkout creation against D1.
- Verify invalid browser-shaped requests are rejected by the server.
- Verify QPay and Telegram payload parsers against documented real response examples without mocked HTTP clients.
- Verify webhook routes call the same commerce operations as status refresh and admin confirmation.
- Verify repeated confirmations decrement stock once.
- Verify route responses still infer through Eden and deserialize through Better Result.

## PR #10: Storefront polish

Implement these changes in `plugged/06-storefront-polish`, based on `plugged/05-commerce-payments`.

### Shared UI components

Replace raw common controls with `@store-kit/ui` components:

- Input
- Textarea
- RadioGroup
- NativeSelect where native select is intended
- Button
- Sheet
- Dialog
- Alert
- Spinner
- Sonner

Add a missing component through the approved Zaidan shadcn registry only when the screen needs it.

Do not wrap simple semantic HTML that has no matching common component merely to avoid HTML.

### Tailwind-only application styling

Use Tailwind for all application styling:

- layout and spacing
- dimensions and positioning
- borders and radius
- typography and color
- responsive behavior
- focus, disabled, pending, loading, and error states
- Plugged textures, masks, overlays, pseudo-elements, and animation application

The CSS entry may contain only:

- Tailwind imports
- `@theme` design tokens
- `@font-face`
- `@keyframes`
- reusable Tailwind `@utility` definitions for effects that cannot be expressed legibly with built-in or arbitrary utilities
- the smallest required base reset

Apply custom art effects through Tailwind utility classes in markup. Do not keep page/component selector blocks or semantic styling classes such as `slam-button`, `detail-grid`, or `poster-surface`. Shared Zaidan components own their variants; app code composes those variants with Tailwind.

### Shared storefront utilities

Add small client-safe modules for:

- one cached `Intl.NumberFormat` MNT formatter
- cart and private-order storage-key builders
- public media URL construction
- reviewed Mongolian order/payment status labels

Use es-toolkit only where it reduces real utility code, such as clamping quantity. Do not replace native one-line language features only to increase library usage.

### TanStack Query

- Replace new `createQuery` usage with the current `useQuery` syntax selected for this codebase.
- Use `useQueryResult` for Better Result query data.
- Keep query options in `@store-kit/storefront`.
- Add the convention to product preferences and `AGENTS.md`.
- Do not duplicate Result deserialization in components.

### Payment status updates

Keep HTTP polling for the MVP.

Use adaptive polling only while payment is pending or claimed:

- poll every 5 seconds while the page is visible
- stop on paid, failed, or terminal order state
- pause when the document is hidden if TanStack does not already do so
- provide a manual refresh action

Do not add Durable Objects, WebSockets, or PartySocket now. A payment-status Durable Object would add routing, connection lifecycle, state, and deployment complexity for a short-lived page with low traffic. Reconsider push updates only after production measurements show polling is a real problem.

### Images

Build one shared product-image component on Unpic Solid/Astro and a Cloudflare Image Transformations transformer.

- Keep the original asset in R2 behind its custom media domain.
- Generate transformed URLs through Cloudflare's `/cdn-cgi/image/` URL interface so resizing happens at the edge without an application Worker image proxy.
- Request `format=auto`, a measured quality default, `fit=scale-down` or the intentional crop mode, and only the widths each layout needs.
- Emit responsive `srcset` and accurate `sizes` for product wall, listing, cart thumbnail, and product detail layouts.
- Store source width, source height, and meaningful alt text with image metadata. Always emit dimensions or aspect ratio to prevent layout shift.
- Mark only the actual above-the-fold LCP product/hero image as priority. Lazy-load other product images and decode them asynchronously.
- Do not preload an entire product wall.
- Keep decorative CSS textures out of Unpic. Prefer compressed AVIF/WebP assets and do not expose them as content images.
- Continue deriving the source URL from the stored R2 key and `PUBLIC_MEDIA_BASE_URL`.
- Provide a direct R2-source fallback for local development where Cloudflare Image Transformations is unavailable.
- Verify generated candidate widths, cache headers, transferred bytes, LCP priority, CLS, and that image requests do not invoke the Astro Worker.

### Checkout and order UI

- Keep corrected mobile checkout ordering from the final audit.
- Use shared UI fields with required indicators, `aria-invalid`, and `aria-describedby`.
- Preserve entered values on transport or domain failure.
- Render domain errors inline with corrective actions.
- Use generic toast only for unexpected transport failures.
- Map all internal statuses to reviewed Mongolian customer text.
- Keep a direct support action for non-retryable payment states.

### Product purchase

- Clamp quantity with the selected variant's available stock.
- Use `min(10, stockQuantity)` as the visible maximum.
- Clamp again when the selected variant changes.
- Keep server cart validation as final authority.

### Verification

Use the real Astro background server and browser automation.

Check at minimum:

- 320 px, 390 px, 768 px, and desktop widths
- keyboard-only navigation
- 200% text size
- reduced motion
- mobile search dialog
- mobile cart width and actions
- desktop search and cart controls
- product media and variant switching
- checkout required/error states
- QPay and bank-transfer states
- order polling stop conditions
- transport retry behavior
- no raw internal status strings
- no direct database or Cloudflare imports in client bundles
- Unpic output for product images

## Documentation changes

Update `docs/product-preferences.md` to resolve old or conflicting rules:

- payment-time stock decrement is the current rule; remove the old order-creation decrement rule
- public cross-layer contracts belong in `@store-kit/contracts`
- every database entity ID uses a stable TypeID prefix
- feature query and operation namespaces are preferred
- package-local imports use `~/`
- new Solid Query code uses `useQuery` and `useQueryResult`
- checkout uses TanStack Form with shared TypeBox contracts
- common controls come from `@store-kit/ui`
- all application styling uses Tailwind utilities or Tailwind `@utility` definitions
- storefront product images use Unpic with Cloudflare Image Transformations
- Dismatch owns exhaustive tagged switches; Better Result and es-toolkit `flow` own typed pipelines

Add concise corresponding rules to `AGENTS.md`. Keep details in product preferences instead of making `AGENTS.md` large.

## Stack execution order

1. Commit the preference, `AGENTS.md`, and plan updates first on `plugged/04-foundations` so every workflow agent inherits them.
2. Run parallel PR #8 writers for contracts, TypeID/schema/migration/seed, feature namespaces, and import aliases.
3. Integrate, verify, push PR #8, and open it against `master`.
4. Start PR #9 writers from PR #8. Run commerce organization, functional flow, provider adapters/authentication, webhooks, and API boundary work in parallel.
5. Integrate, verify, push PR #9, and open it against PR #8.
6. Start PR #10 writers from PR #9. Run TanStack Form/shared UI, Tailwind conversion, Unpic optimization, and query/runtime corrections in parallel.
7. Integrate, verify, push PR #10, and open it against PR #9.
8. Run correctness, performance, package-boundary, and browser/UI audits in parallel.
9. Apply only concrete fixes to PR #10 or the lowest still-open owning branch when a lower-layer correction is required.
10. Review each new PR manually with Plannotator commands. Do not use the agent-callable Plannotator adapter.
11. Merge PRs #8, #9, and #10 bottom to top after all checks and review comments are resolved.

## Explicit non-goals

Do not add:

- Durable Objects for payment status
- PartySocket or WebSockets
- a generic validation framework
- a generic HTTP-provider framework
- a generic repository layer
- controller or service classes
- frontend-only checkout validation
- duplicate public and persistence schemas without distinct owners
- broad utility wrappers around one-line native code
- a rewrite of the Plugged visual direction
- mocked provider tests

## Completion criteria

- every Plannotator comment is either implemented or explicitly declined above
- PR #8 adds the public contracts boundary, feature namespaces, import aliases, and prefixed TypeID for every database entity
- PR #9 organizes commerce operations, validates provider adapters, handles secrets and tokens safely, and separates webhooks
- PR #10 makes the storefront use shared Zaidan UI, Tailwind-only application styling, current TanStack Query APIs, TanStack Form, and optimized Unpic
- storefront code does not import database-owned client contracts
- checkout remains validated on both client and server
- every database entity ID has its expected TypeID prefix
- payment confirmation remains one atomic D1 batch
- polling stops when it is no longer useful
- checkout has one TanStack Form state owner and uses shared UI fields
- product images produce responsive edge-transformed candidates without Astro Worker image proxying
- product and checkout UI pass real mobile and accessibility checks
- all stack PRs remain independently reviewable
- `vp check`, `vp test`, recursive build, migration, seed, focused API checks, and browser verification pass
