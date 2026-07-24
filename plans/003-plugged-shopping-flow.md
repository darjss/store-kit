# Build the Plugged shopping flow

## Objective

Turn the catalog foundation into the first complete Plugged shopping experience.

This plan must deliver:

- a custom Plugged storefront for mobile social traffic
- filterable newcomer use cases
- product listing and product detail pages
- variant selection and variant-specific images
- a browser-persisted guest cart
- guest checkout for Ulaanbaatar delivery
- QPay and manual bank transfer
- safe, repeatable payment confirmation and stock changes
- a private guest order-status page
- internal Telegram notifications for paid orders and bank-transfer claims
- real local D1, R2, Worker, and browser verification

The final stack must let a customer discover a product, choose a variant, add it to the cart, submit checkout, choose a payment method, and see the resulting order state.

Do not build customer accounts, admin screens, discounts, reviews, wishlists, delivery tracking, inventory reservations, a CMS, or a general payment framework in this plan.

## Confirmed product decisions

### Audience and language

- The primary customer is a curious newcomer to portable audio.
- Storefront navigation and commerce copy use Mongolian.
- Product names and common audio terms can remain in English where that is natural.
- The first catalog must present IEMs and DACs clearly; DAC remains a primary
  category. Reserve one broad future Accessories destination without implying
  stock. Do not promote Eartips as a homepage category or merchandise
  standalone cables.
- Plain-language fit labels appear before dense specifications.

### Visual direction

- Use a loud, chaotic, underground streetwear direction.
- Use full maximalism rather than a restrained ecommerce template.
- Extend the existing Plugged logo language instead of copying its exact palette everywhere.
- Use distressed black, dirty off-white, and signal orange as anchors.
- Add a small compatible set of strong colors, such as electric cobalt, warning red, or acid yellow-green.
- Use clean product cutouts inside chaotic compositions.
- Use hard cuts, poster slams, snapping panels, and ticker motion.
- The homepage starts with a chaotic product wall, not a conventional single-product hero.
- Product prices, stock, options, and purchase actions must remain clear despite the maximalist composition.

Copy the approved Plugged logo into `apps/plugged` as a store-owned asset. Do not reference files from the old `~/dev/plugged` application at runtime.

### Catalog and discovery

- Keep a permanent product catalog.
- Give featured releases high-impact drop treatment.
- Navigate by newcomer use cases as well as product type.
- Launch with these use-case slugs:
  - `first-iem`
  - `bass`
  - `vocals`
  - `gaming`
  - `daily-carry`
- Show stock as `In stock`, `Low stock`, or `Sold out` without exact quantities.

### Mobile behavior

- Optimize first for customers arriving from Instagram and TikTok on mobile.
- Use persistent bottom navigation.
- Open the cart as a full-height sheet.
- Continue checkout on a dedicated page.

### Checkout

- Use a browser-persisted guest cart.
- Revalidate price, active state, and stock on the server.
- Support Ulaanbaatar delivery only.
- Use one fixed delivery fee.
- Support QPay and manual bank transfer at launch.
- Reduce stock only when payment is confirmed.
- Show customer updates on a private order-status page.
- Staff can contact the supplied phone number when needed.

The payment-confirmation stock rule in this plan supersedes the earlier “decrease stock when an order is created” preference in `docs/product-preferences.md`. Update that document when implementing this plan.

## Constraints

- Keep Astro pages server-rendered. Use Solid only for interactive islands.
- Do not convert the store into a client-side SPA.
- Keep remote catalog and checkout data in TanStack Solid Query.
- Keep the guest cart in one module-scoped native Solid store.
- Persist the cart with `makePersisted` from `@solid-primitives/storage`.
- Keep cart-sheet visibility in a separate non-persisted signal.
- Never read or mutate persisted browser state during server rendering.
- Use Eden for Store Kit API calls.
- Use Ky only for QPay and Telegram HTTP calls.
- Use Better Result and plain tagged errors for expected commerce failures.
- Keep `Result.err` as TanStack Query data.
- Use modern TypeBox for shared runtime schemas and Drizzle schema generation. Keep Elysia's transitive legacy TypeBox isolated inside API route definitions until Elysia supports modern TypeBox.
- Build Better Result queries with the shared `resultQueryOptions()` factory so transport and deserialization behavior is not repeated.
- Do not use `as any`.
- Do not add mocks, stubs, fake adapters, placeholder tests, or tests that only prove test setup.
- Add packages with `vp add` or another Vite+ package command. Do not manually add package dependencies to `package.json`.
- Prefer the smallest direct implementation with no repositories, controllers, classes, dependency injection, event bus, or generic provider framework.

## Zaidan component baseline

Use [Zaidan](https://zaidan.carere.dev/) as a source registry, not as an npm component package. Add source-owned components to `packages/ui` with the shadcn CLI. Do not hand-copy component code from the documentation.

Use this selected baseline:

- primitive: Kobalte
- style: Vega
- base color: neutral
- theme: neutral
- font and heading font: Inter
- radius: default
- menu accent: subtle

Keep the generated components structurally neutral. Plugged owns the loud storefront colors, borders, textures, typography scale, and motion through app-level tokens and classes. Do not turn shared components into Plugged-only components.

Run the CLI from `packages/ui`. Add a package-local `@/*` alias to `./src/*`, and configure `components.json` with `src/styles.css` plus this registry:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "kobalte",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {
    "@zaidan": "https://zaidan.carere.dev/r/{style}/{name}.json"
  }
}
```

Initialize and apply the selected design-system files with the CLI:

```sh
cd packages/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add \
  @zaidan/font-inter \
  @zaidan/neutral \
  @zaidan/style-vega
```

Add only the components used by this shopping flow:

```sh
pnpm dlx shadcn@latest add \
  @zaidan/alert \
  @zaidan/badge \
  @zaidan/button \
  @zaidan/button-group \
  @zaidan/command \
  @zaidan/dialog \
  @zaidan/empty \
  @zaidan/field \
  @zaidan/input \
  @zaidan/native-select \
  @zaidan/radio-group \
  @zaidan/separator \
  @zaidan/sheet \
  @zaidan/skeleton \
  @zaidan/sonner \
  @zaidan/spinner \
  @zaidan/textarea
```

Use them as follows:

| Component | Storefront use |
| --- | --- |
| `Button`, `ButtonGroup` | purchase actions and quantity controls |
| `Badge` | stock and payment states |
| `Sheet` | full-height mobile cart |
| `Dialog`, `Command` | full-screen search |
| `Field`, `Input`, `Textarea`, `NativeSelect` | guest delivery form |
| `RadioGroup` | product options and payment method |
| `Alert` | actionable checkout and payment errors |
| `Empty` | empty cart and no search results |
| `Separator` | checkout and order-summary structure |
| `Skeleton`, `Spinner` | client-triggered search, checkout, and payment loading |
| `Sonner` | generic query and mutation failure notices |

Do not add `Card`, `Drawer`, `Select`, `Tabs`, `Accordion`, or other registry components until a real screen needs them. Build product presentation with store-owned Astro markup so the visual system does not become a generic component-library demo.

The selected Zaidan preset exposes Lucide as its default icon library. Plugged uses Solar Icons. Replace generated user-visible Lucide icons with Solar equivalents. If the generated primitives no longer import Lucide, remove the Lucide dependency. Keep a generated internal icon only when replacing it would add code without changing the customer experience.

Review every CLI diff before accepting overwrites. The CLI may replace the current starter button and shared CSS. Preserve valid Store Kit exports, then export the accepted generated components through `packages/ui/src/index.ts`. Run `vp install`, `vp check`, `vp test`, and the recursive build after generation.

References:

- [Zaidan installation](https://zaidan.carere.dev/installation)
- [Zaidan Astro installation](https://zaidan.carere.dev/installation/astro)

## Rendering and hydration

Use Astro SSR for public storefront documents. Astro first renders every framework component with a `client:*` directive on the server except `client:only`. `client:load` only tells the browser to load the Solid JavaScript immediately and hydrate that server HTML. It does not fetch server data, transfer a TanStack cache, or prevent a client query from running.

Render these parts as Astro HTML without client JavaScript:

- page shell, metadata, and structured data
- navigation links and product links
- homepage product-wall content
- initial product listing
- product name, description, price, primary image, and product facts
- delivery and payment reassurance

Load initial public data in Astro frontmatter. Call the shared commerce read operation directly with the request's Cloudflare bindings because it stays in the Worker bundle and never enters browser output. Do not make a network request from the Worker back to its own public API only to render HTML.

Handle the server-side `Result` before rendering. Return the correct not-found or failure response, then pass only the successful plain data value and a server load timestamp to a hydrated island. Astro must receive serializable props; do not pass Better Result instances, functions, database objects, or bindings into the browser.

Use the smallest initial-data path:

1. Fetch once in Astro frontmatter.
2. Render the public content as Astro HTML.
3. Pass the same plain data to the interactive Solid island.
4. Let the island use that prop directly when it does not need remote refetching.
5. If the island needs TanStack invalidation or refetching, spread the matching `catalogQuery` options into `useQuery` and provide `Result.ok(initialData)`, `initialDataUpdatedAt`, and a short positive `staleTime`. This prevents a fresh SSR response from causing an immediate duplicate browser request.

Do not add TanStack Query only to mirror an immutable prop. Use it when the island owns ongoing remote state. Keep search results, checkout requests, payment refreshes, and mutations in TanStack Query because they run or change after hydration.

Do not implement full TanStack `dehydrate()` and `hydrate()` for the first storefront. Astro islands are separate Solid roots, the dehydrated state needs explicit serialization, and Better Result values need another serialization boundary. Props plus `initialData` are simpler for one product or list. Reconsider cache dehydration only when one large island has several nested prefetched queries that cannot be passed cleanly as props.

Create QueryClient instances through a shared `createStorefrontQueryClient()` factory that contains the global `QueryCache.onError` policy and query defaults. Call the factory inside each island root so every server render and browser island owns its client. Never place a QueryClient instance in module scope because a Cloudflare Worker can reuse that module across requests. Do not assume QueryClient context crosses Astro island roots.

Hydrate only immediate interactive owners:

- product variant selection and add to cart: `client:load`
- bottom navigation cart action and cart sheet: `client:load`
- full-screen search: `client:load`
- checkout form and payment controls: `client:load`
- below-fold heavy interaction: `client:visible` with a small root margin
- nonessential controls: `client:idle` with a timeout

Keep the browser cart hydration-safe. Server and initial client HTML start from an empty cart state. The module-scoped cart store is the explicit browser-owned seam between separate Astro islands. Load persisted cart data after the client owner mounts, then reveal the derived count and cart contents without moving the page layout. Never put request-specific or user-specific server data in a module-scoped store.

Prefer normal links and GET query parameters for catalog filters. Add a Solid filter island only when it improves the mobile interaction without replacing Astro navigation.

References:

- [Astro framework components and hydration](https://docs.astro.build/en/guides/framework-components/)
- [Astro data fetching](https://docs.astro.build/en/guides/data-fetching/)
- [TanStack Solid Query hydration](https://tanstack.com/query/v5/docs/framework/solid/reference/hydration)

## Cloudflare latency and caching

Use the new Workers Cache rather than hand-rolling an HTML cache with `caches.default` or KV.

Enable it in the Plugged Wrangler configuration:

```jsonc
{
  "cache": {
    "enabled": true,
  },
}
```

Keep the default version-isolated cache. Do not enable `cross_version_cache` initially. A deployment must not continue serving HTML generated by an older Worker version.

Workers Cache runs before the Worker, uses a tiered cache by default, collapses concurrent misses, and follows response cache headers. This makes it a good fit for identical SSR catalog pages.

Use different browser and edge policies:

```text
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400
```

Apply a short edge policy to:

- `/`
- `/products`
- `/products/:slug`
- public catalog GET APIs
- category and brand GET APIs

The cache key keeps the normalized product-list query string, so each filter URL receives the correct document. Do not vary public pages by cookies, cart contents, device, or user agent.

Use `private, no-store` for:

- cart validation
- checkout
- private order status
- payment refresh and claim routes
- all authenticated or future admin responses
- any response that sets a cookie

`POST` and webhook requests are not cacheable, but still return explicit `no-store` headers.

Connect the public product bucket to a dedicated R2 custom domain such as `media.plugged.mn`. Build image URLs from the stored R2 key and a deploy-time public media base. The browser must request production product images directly from that domain so image traffic does not invoke the Astro Worker. Keep the `MEDIA` binding for seed uploads and local development; remove `/media/*` from the production read path.

Enable Cloudflare Cache on the R2 custom domain. Use long immutable caching for Astro fingerprinted assets and R2 product media only when object keys change whenever bytes change. Never overwrite an existing public media key with different bytes while it has an immutable cache policy.

Reference: [Cloudflare R2 public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains).

Use `Cf-Cache-Status` to verify `MISS`, `HIT`, and `UPDATING` behavior on a deployed preview or production Worker. Local workerd cannot prove the global tiered cache.

Keep catalog TTLs short at first. Checkout always revalidates price, active state, and stock against D1, so a briefly stale public catalog response cannot authorize a stale purchase.

Place the D1 primary in the APAC region for the Mongolia-only store. Do not add the D1 Sessions API or read-replication bookmarks until deployed measurements show uncached reads need them. Workers Cache should remove most public read traffic before Worker and D1 execution.

## Stack structure

Implement this plan as three dependent pull requests.

```text
master
  └─ plugged/01-shopping-domain
       └─ plugged/02-checkout-payments
            └─ plugged/03-storefront
```

### PR 1: Shopping domain

- filterable product use cases
- order, order-line, payment, and checkout-settings tables
- generated TypeBox schemas and migrations
- headless browser guest-cart state
- server cart validation and order queries

### PR 2: Checkout and payments

- checkout and payment operations
- QPay adapter and webhook
- bank-transfer claim flow
- Telegram staff notifications and confirmation callback
- checkout, payment, and order-status API routes
- real D1 and provider-boundary verification

### PR 3: Plugged storefront

- Plugged visual system and assets
- homepage product wall
- product listing and detail pages
- filters, variant selection, and image behavior
- bottom navigation and cart sheet
- checkout and payment UI
- private order-status page
- complete mobile browser and runtime verification

Each pull request uses the previous branch as its base. Do not merge an earlier pull request only to start the next one.

## Catalog merchandising extension

### `product.use_cases`

Add a dedicated JSON text column to `product`:

| Column | Type | Rules |
| --- | --- | --- |
| `use_cases` | JSON text | required string array, defaults to `[]` |

Use this type:

```ts
export type ProductUseCase =
  | "first-iem"
  | "bass"
  | "vocals"
  | "gaming"
  | "daily-carry";
```

Validate input against this controlled set. Keep the database representation as a JSON array. Use D1 JSON functions for the public `useCase` filter.

Do not add use-case or product-use-case tables during this MVP. The Plugged catalog is small, and the labels are a fixed store presentation concern.

Add `useCase?: ProductUseCase` to public product-list filters and stable query keys. Keep the existing direct category and brand filters.

### Product type and use-case roles

- `category` remains the product type, such as IEM, DAC, or the future broad
  Accessories destination.
- `use_cases` contains customer-oriented guidance.
- `details` remains display-only product facts.
- Do not filter arbitrary `details` properties.

Add Mongolian presentation labels in the Plugged app, not the shared database package.

## Shopping schema

Use four new tables. Keep all money as integer MNT amounts.

### `checkout_settings`

Use one row per isolated store database.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text | primary key; fixed value `default` |
| `delivery_fee_mnt` | integer | required, non-negative |
| `bank_name` | text | required |
| `bank_account_name` | text | required |
| `bank_account_number` | text | required |
| `checkout_help_text` | text | optional |
| `order_confirmation_text` | text | optional |
| `updated_at` | integer timestamp | required |

Seed the initial Plugged values through a validated store-owned seed input. Do not place bank details or editable delivery fees in `store.json`.

Do not build the settings admin screen in this plan.

### `order`

Use a non-reserved SQL table name if needed to avoid quoting a keyword, while keeping the exported domain name clear.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text | primary key |
| `number` | text | required, unique, customer-facing |
| `status_token_hash` | text | required, unique |
| `status` | text | `new`, `confirmed`, `preparing`, `delivering`, `completed`, or `cancelled` |
| `customer_name` | text | required |
| `customer_phone` | text | required Mongolian phone input |
| `district` | text | required |
| `khoroo` | text | required |
| `address` | text | required |
| `delivery_notes` | text | optional |
| `subtotal_mnt` | integer | required, non-negative snapshot |
| `delivery_fee_mnt` | integer | required, non-negative snapshot |
| `total_mnt` | integer | required, non-negative snapshot |
| `created_at` | integer timestamp | required |
| `updated_at` | integer timestamp | required |

Generate the customer-facing order number in the application. Keep it short enough to read over the phone while retaining a unique database constraint.

Generate a cryptographically random status token. Store only its SHA-256 hash. Return the plaintext token once to the checkout client and use it to authorize later guest status reads.

Do not expose order details through a route that accepts only the order ID or order number.

### `order_line`

Order lines are immutable purchase snapshots.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text | primary key |
| `order_id` | text | required foreign key, cascade on destructive order deletion |
| `product_id` | text | optional reference for internal lookup |
| `variant_id` | text | optional reference for internal lookup |
| `product_name` | text | required snapshot |
| `variant_name` | text | required snapshot |
| `sku` | text | required snapshot |
| `options` | JSON text | required snapshot |
| `image_r2_key` | text | optional snapshot |
| `unit_price_mnt` | integer | required, non-negative snapshot |
| `quantity` | integer | required, positive |
| `line_total_mnt` | integer | required, non-negative snapshot |

Do not read current product names or prices to render an existing order. Use the snapshots.

### `payment`

Keep one payment row per order during the MVP.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | text | primary key |
| `order_id` | text | required foreign key, unique |
| `method` | text | `qpay` or `bank_transfer` |
| `status` | text | `pending`, `claimed`, `confirming`, `paid`, or `failed`; `confirming` is an internal atomic-batch claim |
| `amount_mnt` | integer | required, non-negative snapshot |
| `provider_invoice_id` | text | optional, unique when present |
| `provider_payment_id` | text | optional, unique when present |
| `claimed_at` | integer timestamp | optional |
| `telegram_message_id` | text | optional; used to edit the bank-claim confirmation message |
| `paid_at` | integer timestamp | optional |
| `created_at` | integer timestamp | required |
| `updated_at` | integer timestamp | required |

Do not add a payment-event table, refund table, or generic provider configuration table yet.

## Database invariants and indexes

Add checks for:

- valid order status
- valid payment method
- valid payment status
- non-negative order and payment money values
- positive line quantity
- `line_total_mnt = unit_price_mnt * quantity`
- `total_mnt = subtotal_mnt + delivery_fee_mnt`

Add indexes only for implemented queries:

- order number lookup
- private order status lookup by ID and token hash
- order creation time for future admin listing
- payment provider invoice lookup
- payment status lookup if used by confirmation code

Keep payment and stock confirmation inside one `D1Database.batch()` transaction that preserves the same invariants. D1 has no interactive callback transaction for this flow. Its documented batch API runs prepared statements sequentially as one SQL transaction and rolls back the sequence when a statement fails. Use the binding directly or Drizzle's D1 `db.batch()` support; do not plan `db.transaction(async tx => ...)`.

Reference: [Cloudflare D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

## Guest cart

Add the cart owner under `packages/storefront/src/cart`.

### Persisted data

Persist the authoritative line identity plus a small display snapshot:

```ts
type CartLineInput = {
  variantId: string;
  quantity: number;
};

type PersistedCartItem = CartLineInput & {
  productSlug: string;
  productName: string;
  variantName: string;
  options: Record<string, string>;
  imageR2Key: string | null;
  unitPriceMnt: number;
};
```

The display snapshot makes the cart open and update immediately without waiting for a server request. Store the image R2 key, not a deployment URL. Product names, options, images, and last-seen price can be stale and are never authoritative. Project only `{ variantId, quantity }` into cart validation and checkout requests. Validation can refresh in the background after the sheet is visible and must run before checkout creates an order. It replaces display snapshots with current returned values and reports price or availability corrections.

Do not persist stock, line totals, subtotal, delivery fee, total, or availability as sources of truth.

Use one versioned storage key, such as `store-kit:plugged:cart:v1`. A simple reset on an unsupported version is enough. Do not build a migration framework.

### Headless cart and derived state

Build a shared headless `Cart` compound component in `@store-kit/storefront` on top of the Zaidan/Kobalte `Sheet`. It owns cart context, persistence timing, open state, count, quantity commands, focus management, and sheet accessibility. Expose `Cart.Root`, `Cart.Trigger`, `Cart.Content`, `Cart.Items`, and `Cart.Empty`. Plugged supplies product-row markup, copy, and classes through children. Do not put Plugged styling in the shared cart component.

Expose small named functions:

- `addCartItem`
- `setCartItemQuantity`
- `removeCartItem`
- `clearCart`
- `openCart`
- `closeCart`

Derive item count from the cart store. Do not mirror it into another signal.

Rules:

- quantity is a positive integer
- adding the same variant increases its quantity
- the UI can optimistically change local quantity
- checkout validation is authoritative
- sold-out or inactive variants remain visible in the cart with a corrective message until removed
- the local image and last-seen price render immediately, but validation refreshes them before checkout

### Server cart validation

Add one operation and route that accepts the persisted cart shape and returns current purchasable data:

- current product and variant names
- current options
- current unit price
- current image URL/key
- requested quantity
- available quantity status
- line total
- subtotal
- tagged corrections for missing, inactive, or insufficient-stock variants

Cap line count and quantity with small documented limits to protect the public endpoint. Do not build rate-limit infrastructure in this plan.

Expected corrections are data, not thrown transport errors. Include `PriceChanged` with previous and current MNT values so the cart can update its persisted snapshot and show the correction inline.

## Checkout creation

### Input

Validate:

```ts
type CheckoutInput = {
  items: CartLineInput[];
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    district: string;
    khoroo: string;
    address: string;
    notes?: string;
  };
  paymentMethod: "qpay" | "bank_transfer";
};
```

Use a controlled Ulaanbaatar district list in shared checkout validation. Keep khoroo as validated customer input during the MVP. Do not add a national address database.

Normalize Mongolian phone input to one documented local form. Do not require an account, email address, or OTP.

### Operation

`createCheckoutOrder` must:

1. validate and normalize input
2. load current checkout settings
3. load active products and variants
4. reject missing, inactive, sold-out, or insufficient-stock lines
5. calculate all prices and totals on the server
6. create immutable order-line snapshots
7. create a pending payment
8. create a QPay invoice when selected
9. return the private status token and method-specific next action

Do not trust client totals, names, stock, payment amount, or delivery fee.

Expected tagged errors include only failures the customer can act on:

- `CartEmpty`
- `CartChanged` with structured cart corrections
- `InvalidCheckoutDetails` with field paths and safe messages
- `DeliveryUnavailable`
- `PaymentSetupFailed` with whether bank transfer remains available

Render these errors at the action point, not only in a generic toast. Cart corrections stay beside their rows. Checkout field errors map into TanStack Form and focus the first invalid field. Delivery errors stay in the address section. Payment setup errors stay in the payment section with retry or bank-transfer actions. Keep form and cart data for all recoverable failures.

Keep provider diagnostics private. Give each error a safe Mongolian display message and the structured data needed for the app to select the corrective action.

## Payment confirmation and stock

### Shared confirmation operation

Use one operation for both QPay and approved bank transfers:

```text
confirmOrderPayment(orderId, providerReference)
```

It must be safe to call repeatedly.

Use one atomic D1 batch after provider verification:

1. conditionally change the unpaid payment from `pending` or `claimed` to internal `confirming`, only when every order line has enough current stock
2. decrement each variant only while that payment is `confirming`
3. change the payment from `confirming` to `paid` and store its provider reference
4. move the order from `new` to `confirmed`
5. record payment and order timestamps
6. inspect the first statement's affected-row result; if it changed nothing, read the current state and return already-paid or insufficient-stock behavior

All later statements must be conditional on the same payment being `confirming`. This makes a repeated or losing callback a no-op without requiring an interactive transaction callback.

Do not decrement stock twice when QPay retries a webhook or Telegram retries a callback.

Because this plan deliberately has no stock reservations, stock can change between checkout and payment. Handle this real case explicitly:

- bank-transfer confirmation must refuse confirmation when stock is no longer sufficient
- a QPay payment that arrives after stock becomes insufficient remains paid but does not silently create negative stock
- keep the order in `new`
- send an urgent staff Telegram message for manual fulfillment or refund handling

Do not build automated refunds or reservation expiry in this plan.

### QPay adapter

Add one direct adapter under `packages/commerce/src/adapters/qpay.ts`.

It owns only:

- authentication required by the current official QPay API
- invoice creation
- payment verification
- normalized provider responses

Use Ky. Read current official QPay documentation before implementation. Do not infer current endpoints or signatures from the old Plugged code.

Keep credentials in Worker secrets. Add typed environment bindings, documentation, and a startup-safe configuration check. Never put secrets in `store.json`, seed JSON, source code, or PR text.

### QPay webhook and status refresh

Add an Elysia webhook route under `packages/api/src/webhooks`.

- verify all authenticity information supported by QPay
- fetch or verify payment state with QPay before confirming locally
- use the shared idempotent confirmation operation
- acknowledge retries safely
- do not expose provider errors to customers

Add a customer-triggered payment-status refresh only if QPay requires polling for a responsive result. It must verify the private order status token.

### Bank transfer

After order creation, return bank instructions from the snapshotted or current checkout settings.

The customer can select `I sent the payment`. The claim operation:

1. verifies the private order token
2. changes payment from `pending` to `claimed`
3. records `claimed_at`
4. sends a Telegram message with order number, phone, amount, and customer name
5. includes one inline confirmation button

Repeated claims must return the existing claimed state without duplicate Telegram spam. Keep the claim state and Telegram message ID in D1. Do not put this flow in KV: it is durable relational order state, and KV's eventual consistency would create a second source of truth for deduplication.

### Telegram confirmation

Use raw Telegram Bot API calls through Ky:

- `sendMessage`
- `answerCallbackQuery`
- `editMessageText`

The webhook must verify:

- a configured webhook secret
- the allowed admin Telegram user ID
- the callback payload maps to the expected order and payment

The callback calls the same shared payment-confirmation operation. Repeated callbacks must not change stock twice. Always answer valid callback queries, including repeats, so Telegram does not keep the client spinner active.

Send a normal paid-order staff notification after successful QPay confirmation as well.

Do not add a Telegram framework.

## API routes

Use Elysia and Eden inference. Route names can adjust to current package conventions, but keep this surface small:

```text
POST /api/cart/validate
POST /api/checkout
GET  /api/orders/:id/status
POST /api/orders/:id/payment/refresh
POST /api/orders/:id/payment/claim
POST /api/webhooks/qpay
POST /api/webhooks/telegram
```

Private customer order routes require the plaintext status token. Compare its SHA-256 hash with the stored hash using a timing-safe approach available in Workers where practical.

Return serialized Better Results for expected customer-facing outcomes. Webhook acknowledgements can use the provider-required response shape.

Do not add Astro Actions, a second API, handwritten client DTOs, or route-specific error classes.

## Storefront query and mutation options

Add named factories and mutation helpers under `packages/storefront`:

- cart validation options
- product-list options with `useCase`
- checkout mutation
- private order-status options
- QPay status-refresh mutation
- bank-transfer claim mutation

Use Eden-inferred inputs and outputs. Normalize query keys. Never include a plaintext order token in logs, analytics, visible error messages, or server logs. A query key can contain an opaque token only if it is not persisted or exposed through dev instrumentation in production; otherwise key private status data by order ID and keep the token inside the query function closure.

Clear the guest cart only after checkout creates the order successfully. Preserve it when validation or provider setup fails.

## Plugged information architecture

### Routes

```text
/
/products
/products/[slug]
/checkout
/orders/[id]
```

Use query parameters on `/products` for use case, product type, brand, and search. Do not add a client router.

### Homepage

The first viewport is a chaotic product wall.

It should include:

- several real product cutouts at different scales
- visible prices and short fit labels
- direct product links
- one featured-drop treatment
- a compact route into the five use cases

The wall must not be a collection of identical cards. Use asymmetric composition, overlap, hard color fields, and deliberate crops. Keep every product link and price readable.

Below the wall, include only sections that support discovery:

- use-case entry points
- current drop or featured products
- a compact product-type route for IEMs, DACs, and the future broad Accessories
  destination
- delivery and payment reassurance near the first purchase decision

Do not add invented testimonials, fake social proof, fake scarcity, brand counters, generic lifestyle copy, or a long company manifesto.

### Product listing

Support:

- use-case filters
- IEM, DAC, and broad Accessories category filters
- brand filter
- text search
- active filter state in the URL
- clear empty and transport-error states
- a responsive maximalist product composition

The listing can vary card scale and treatment, but product identity, current price, compare-at price, stock status, and primary image must stay scannable.

Do not add pagination controls until seeded catalog size needs them. The API can retain limit and offset.

### Product detail

Server-render the product name, description, price range, primary image, and discoverable metadata through Astro. Use Solid islands for:

- variant selection
- variant image switching
- quantity selection
- add to cart
- cart opening

Behavior:

- choose the first active in-stock variant initially; otherwise choose the first active variant
- changing a variant updates price, compare-at price, stock status, selected options, and images
- show images linked to the selected variant
- fall back to unlinked shared product images when no links exist
- disable add to cart for sold-out variants
- show plain-language use-case labels before technical details
- show `details` as a product-type-aware facts section without building a generic specification engine

Keep the add-to-cart action visible on small screens without hiding page content behind the bottom navigation.

### Bottom navigation

Use four actions:

- Home
- Shop
- Search
- Cart

The cart action shows the derived item count. Respect mobile safe-area insets. Use clear labels and icons. Do not use decorative glassmorphism or a generic floating pill.

Search can open an expressive full-screen surface but must use the existing catalog query. Do not add search infrastructure.

### Cart sheet

Use the Zaidan `Sheet` component generated from its Kobalte registry. Keep its focus management, escape behavior, labels, and portal structure intact while applying Plugged-owned styling.

Show:

- current validated item data
- variant name and options
- quantity controls
- line prices
- corrections for changed or unavailable items
- subtotal
- checkout action

Do not show a final total before adding the server-owned delivery fee at checkout.

### Checkout page

Use a short single-page guest checkout:

1. customer name and phone
2. district, khoroo, address, and optional notes
3. QPay or bank-transfer choice
4. validated order summary and fixed delivery fee
5. submit action

Use TanStack Solid Form with the shared TypeBox checkout schema when the integration stays direct. Validate with TypeBox at submit time if a form adapter would add another schema layer. Do not create a multi-step wizard.

On success:

- QPay shows the QR and supported bank deep links
- bank transfer shows instructions and an `I sent the payment` action
- both lead to the private order-status route

### Order-status page

Use the order ID in the path and keep the private token in session history/state or an intentionally scoped query parameter. Do not render order PII without successful token verification.

Show:

- order number
- order status
- payment method and status
- purchased line snapshots
- total
- payment action when still required
- store confirmation/help text

Do not expose internal provider IDs, Telegram data, or stock-recovery diagnostics.

## Visual system

Create Plugged-owned tokens in the app rather than changing the shared admin theme.

### Palette

Use OKLCH tokens with these roles:

- dirty paper background
- near-black ink
- signal orange inherited from the logo
- one electric cool accent
- one warning or acid accent
- clear success, warning, and error colors

Do not sample every color directly from the logo. Build a compatible full palette and verify WCAG contrast for all commerce text and controls.

### Typography

Choose typography after reviewing real font catalogs.

Voice words:

- abrasive
- photocopied
- kinetic

Use one distinctive display family and one highly readable body family, or one family only if it supports a genuinely strong contrast. Do not default to Inter, Space Grotesk, Syne, or a generic condensed font because the brief says streetwear.

Keep body text in normal case. Reserve uppercase for short labels, prices, navigation, and poster-scale statements.

### Texture and imagery

Use the actual approved distressed logo and deliberate raster texture assets. Product imagery remains clean enough to inspect.

Do not generate fake hand-drawn SVG texture, CSS grid wallpaper, diagonal stripe wallpaper, or decorative noise that harms image performance. Do not put a texture layer over body copy.

### Shape

Favor:

- hard rectangular panels
- occasional cut corners
- full borders or color blocks
- purposeful overlap
- sharp image masks

Avoid:

- large rounded cards
- generic soft shadows
- glass panels
- endless identical product cards

### Motion

Add the framework-neutral `motion` package to `apps/plugged` when the storefront PR starts. Use its JavaScript `animate`, sequence, stagger, and in-view functions from Astro scripts or Solid lifecycle owners.

Do not use `solid-motionone`; its current release wraps an older Motion One API and adds a framework component layer that this Astro-first storefront does not need. Do not add GSAP or Anime.js unless one measured interaction cannot be built clearly with Motion.

Use CSS transitions for simple hover, press, focus, and open-state changes. Use Motion only for:

- first-load product-wall assembly
- cart-sheet entry
- variant image changes
- filter-result transitions
- one controlled ticker
- add-to-cart feedback

Import the smallest Motion entrypoints that provide the required feature. Keep animation code out of the initial bundle for pages that do not use it.

Create animations in `onMount` or an Astro client script. Stop controls and observers during Solid cleanup. Never run DOM animation code during server rendering.

Prefer clip, transform, opacity, and short blur transitions. Use fast ease-out timing. Do not keep the whole page moving continuously.

Every effect must have a reduced-motion alternative. Content must remain visible when animation scripts fail.

## Accessibility and resilience

- Maintain visible keyboard focus.
- Preserve logical heading order despite visual overlap.
- Use semantic links and buttons.
- Give every product image useful alt text.
- Do not encode stock or payment state by color alone.
- Keep touch targets at least 44 by 44 CSS pixels.
- Prevent bottom navigation from covering the final page controls.
- Trap and restore focus correctly in the cart and search sheets.
- Keep checkout usable at 320 CSS pixels wide.
- Format MNT with the shared `mn-MN` locale.
- Show useful loading, empty, expected-error, and transport-error states.
- Keep checkout data when a recoverable submit error occurs.

## Security

- Calculate all money on the server.
- Never trust cart prices or stock from local storage.
- Hash guest status tokens before storage.
- Do not log status tokens, QPay credentials, Telegram secrets, or bank account secrets that are configured as secrets.
- Verify QPay payment state before local confirmation.
- Verify Telegram webhook secret and allowed admin ID.
- Make confirmation operations idempotent.
- Use conditional stock updates to prevent negative inventory.
- Return safe tagged errors without provider response bodies or stack traces.
- Apply practical body, line-count, and quantity limits through validation.

Do not add a broad security framework, custom encryption layer, or rate-limit service in this plan.

## Local development URLs and environment

Use [Portless](https://github.com/vercel-labs/portless) for stable, named local store URLs. Each store
app must have one explicit, unique name:

- Plugged: `https://plugged.localhost`
- future stores: `https://<store-id>.localhost`

Add Portless as a workspace development dependency with the package manager. Do not require a global
installation. Keep the store name explicit in the app development task so a directory rename cannot
silently change its URL.

Keep Astro's required background-server workflow. A Portless wrapper does not keep its route after
Astro moves into the background. Start Astro with `astro dev --background --host 127.0.0.1`, read
its assigned port from `astro dev status`, and register that port with
`portless alias plugged <port>`. Do not replace Astro's background lifecycle with an unmanaged
foreground process.

Start the Portless proxy once per machine and trust its local certificate:

```sh
vp exec portless proxy start
vp exec portless trust
vp exec portless doctor
```

Use `vp exec portless list` to inspect routes and `vp exec portless prune` after an interrupted
session. Do not hard-code Portless-assigned internal ports in source files, environment files, OAuth
callbacks, or tests.

Set the local public application URL to `https://plugged.localhost`. Keep the local media fallback on
the same origin unless a separate media service is under test. Production URLs continue to come from
deployment environment values and the R2 custom domain.

Validate string configuration and secrets with T3 Env. Keep Wrangler-generated binding types
responsible for D1, R2, and KV. Expose TypeBox schemas to T3 Env and TanStack Form through one tested
TypeBox-to-Standard-Schema adapter in the browser-safe contracts package. Do not add separate
form-specific and environment-specific schema adapters.

The local preview process is:

1. create the ignored `apps/plugged/.dev.vars` from `.dev.vars.example`
2. run `vp run db:migrate:plugged:local`
3. run `vp run catalog:seed:plugged`
4. run `vp run plugged:dev`
5. run `vp run plugged:route`
6. verify `https://plugged.localhost`
7. run `vp run plugged:dev:stop` and `vp exec portless alias --remove plugged` when finished

Basic catalog, cart, checkout validation, and local bank-transfer behavior must work without live
provider credentials. Live QPay and Telegram behavior requires real sandbox or production
credentials.

## Real verification

Use real implementations and local Cloudflare resources. Do not use provider mocks.

For QPay and Telegram, separate verification into:

- real local operation and database tests for all code before the outbound boundary
- documented sandbox or test-account checks against the real provider when credentials are available
- no fake provider implementation to make CI green

Minimum database and operation checks:

1. migrate a fresh local D1 database
2. seed catalog and checkout settings
3. validate a normal cart
4. reject an inactive or insufficient-stock variant
5. create a QPay order from current server prices
6. create a bank-transfer order
7. repeat a bank claim without duplicate state or notification intent
8. confirm one payment and decrement stock exactly once
9. repeat confirmation and prove stock does not decrement again
10. run two confirmations against the last unit and prove stock never becomes negative
11. read an order with the correct private token
12. reject order reads with a missing or wrong token
13. prove order lines retain snapshots after catalog values change

Minimum API and browser checks:

1. load the homepage at mobile and desktop widths
2. navigate by each use case
3. filter by product type and brand
4. search for a product
5. open seeded IEM and DAC detail pages and confirm the future Accessories
   destination does not invent product results
6. change variants and verify image fallback behavior
7. add, update, and remove cart items across separate Astro islands
8. reload and confirm browser cart persistence
9. open and close the full-height cart with keyboard and touch controls
10. complete checkout validation with Mongolian customer details
11. create both payment methods
12. verify private status-page access behavior
13. verify reduced motion
14. verify no horizontal page overflow at supported widths
15. verify browser bundles do not contain Drizzle, D1, QPay credentials, Telegram credentials, or server adapters
16. verify primary product content exists in returned HTML before JavaScript runs
17. verify only immediate interactive islands use `client:load`
18. verify a fresh server-loaded product does not trigger an immediate duplicate browser catalog request
19. verify separate SSR requests and separate Astro islands do not share a QueryClient instance
20. verify product images use the R2 custom domain and do not invoke the Astro Worker's `/media/*` path
21. verify each actionable domain error renders its inline correction, field mapping, retry, status, or contact action rather than only a generic toast
22. verify a deployed public page returns `MISS` and then `HIT` through Workers Cache
23. verify private and checkout responses return `BYPASS` or `no-store`

Run the repository gates:

```sh
vp install
vp run @store-kit/plugged#generate-types
vp check
vp test
vp run -r build
```

Also run the new migration, seed, operation integration, and browser verification tasks.

## Implementation sequence

### PR 1: Shopping domain

1. Update `docs/product-preferences.md` with the confirmed payment-time stock rule.
2. Add and validate `product.use_cases`.
3. Add use-case filtering to queries, routes, and storefront options.
4. Add checkout settings, order, order-line, and payment tables.
5. Add generated TypeBox schemas and migrations.
6. Add direct order, payment, and checkout-settings queries.
7. Add the persisted guest-cart owner and cart-sheet signal.
8. Add authoritative cart validation.
9. Prove database checks and cart validation against local D1.

### PR 2: Checkout and payments

1. Add order creation and private token handling.
2. Add the shared idempotent payment-confirmation operation.
3. Add QPay invoice and verification adapter calls.
4. Add bank-transfer claim behavior.
5. Add Telegram notification and confirmation calls.
6. Add checkout, status, claim, refresh, and webhook routes.
7. Add Eden mutation/query helpers.
8. Prove order snapshots, private access, and exactly-once stock changes.
9. Complete real provider sandbox checks when credentials are available.

### PR 3: Plugged storefront

1. Add the approved logo and Plugged app tokens.
2. Select and install the final fonts through an approved delivery method.
3. Configure Zaidan in `packages/ui` and add only the approved components with the shadcn CLI.
4. Add the request-safe `createStorefrontQueryClient()` factory and remove the catalog proof's module-scoped QueryClient.
5. Configure the R2 custom media domain, derive URLs from stored keys, and remove `/media/*` from production image reads.
6. Build the shared store layout and bottom navigation.
7. Build the homepage product wall.
8. Build product listing, filtering, and search.
9. Build product detail and variant-image behavior with Astro-loaded serializable props and TanStack `initialData` only where refetching is useful.
10. Build the shared headless cart sheet, immediate local snapshots, validation refresh, and cart corrections.
11. Build checkout and both payment-method views.
12. Build the private order-status page.
13. Run full browser, runtime, accessibility, bundle, lint, type, test, and build verification.

### PR 4: Standard environment and stable local previews

1. Add one tested TypeBox-to-Standard-Schema adapter to the browser-safe contracts package.
2. Use that adapter for TanStack Form validation and remove the form-specific TypeBox adapter.
3. Add T3 Env for public string configuration and server secrets.
4. Keep D1, R2, and KV bindings in Wrangler-generated environment types.
5. Add Portless as a workspace development dependency.
6. Give Plugged the explicit `plugged.localhost` development route.
7. Document `.dev.vars`, provider credential requirements, local migration, seed, server, route, and
   cleanup commands.
8. Prove the clean local preview through `https://plugged.localhost`.
9. Run adapter behavior tests, environment validation tests, repository checks, builds, and the
   browser smoke path.

## Out of scope

Do not implement:

- customer registration or phone OTP
- customer order history outside the private guest status page
- admin authentication or admin UI
- product editing
- order-management UI
- checkout-settings UI
- discount codes or automatic promotions
- wishlists
- reviews or ratings
- product comparison
- recommendation models
- inventory reservations or expiry timers
- inventory ledger or warehouses
- partial payments
- refunds or automated refund handling
- cash on delivery
- nationwide delivery
- district-based delivery fees
- delivery-provider integration or tracking
- email or SMS notifications
- customer Telegram integration
- a generic CMS or page builder
- a generic payment-provider registry
- analytics or experimentation infrastructure

## Completion criteria

This plan is complete when:

- the three dependent pull requests are open with correct bases
- products can be filtered by the five controlled use cases
- the homepage, listing, and detail pages use the approved Plugged visual direction
- IEMs and DACs have useful newcomer-facing presentation; DAC remains primary,
  and one broad future Accessories destination does not claim unseeded stock
- Eartips are not promoted on the homepage and standalone cables are not
  merchandised
- the guest cart persists across reloads and separate Astro islands
- checkout uses server-owned prices, stock, and delivery fee
- QPay and bank-transfer orders can be created
- private order status requires the correct token
- payment confirmation is safe to repeat
- repeated callbacks never decrement stock twice
- stock never becomes negative
- QPay and Telegram secrets remain server-only
- all real local operation and browser checks pass
- provider sandbox checks pass when credentials are supplied
- all repository gates pass
- no mocks, stubs, fake adapters, placeholder tests, or out-of-scope systems were added
