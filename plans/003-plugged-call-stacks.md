# Plugged shopping flow: technical companion

This document maps the implementation in `003-plugged-shopping-flow.md`. It is not implementation. Names marked **existing** are in the current source. Names marked **planned** are proposals.

## Package ownership

| Package | Ownership |
| --- | --- |
| `apps/plugged` | Astro SSR pages, Solid island mounting, Plugged copy and assets, Cloudflare bindings, API mounting, and public R2 media-base configuration |
| `@store-kit/db` | Drizzle tables, relations, modern TypeBox schemas, direct D1 queries, atomic payment and stock batch |
| `@store-kit/commerce` | Catalog, cart, checkout, order, and payment operations; QPay and Telegram outbound adapters |
| `@store-kit/api` | Elysia routes, legacy `t` request coercion, Better Result serialization, webhook acknowledgements |
| `@store-kit/storefront` | Eden client, `resultQueryOptions`, query and mutation modules, request-safe QueryClient factory, browser guest cart owner |
| `@store-kit/tooling` | Validated Plugged catalog and checkout-settings seed input |
| `@store-kit/ui` | Shared accessible UI primitives only; no Plugged business state or theme ownership |

Dependency direction:

```text
apps/plugged -> storefront -> api -> commerce -> db
apps/plugged -----------------> commerce -> db   (Astro SSR only)
tooling ---------------------------------> db
apps/plugged -> ui
```

The browser uses `storefront -> Eden -> api`. Astro SSR calls commerce directly. It must not call its own `/api` routes.

## Existing foundation

```ts
// existing: @store-kit/db/queries
listPublishedProducts(filters?: ProductListFilters)
findPublishedProductBySlug(slug: string)
listPublishedCategories()
listBrands()

// existing: @store-kit/commerce/catalog
listCatalogProducts(filters?: ProductListFilters)
getCatalogProduct(slug: string)
listCatalogCategories()
listCatalogBrands()

// existing: @store-kit/storefront
catalogQuery.findAllProducts(filters?: ProductListFilters)
catalogQuery.findProductBySlug(slug: string)
catalogQuery.findAllCategories()
catalogQuery.findAllBrands()
resultQueryOptions({ queryKey, request })

// existing mount: apps/plugged/src/fetch.ts
/api/*   -> app.handle(request)
/media/* -> handleMediaRequest(request) // remove from the production media path in PR 3
other    -> astro(new FetchState(request))

// planned production mount
/api/* -> app.handle(request)
other  -> astro(new FetchState(request))

// existing Cloudflare bindings
interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  ASSETS: Fetcher
  CACHE: KVNamespace
  AUTH_KV: KVNamespace
}

// planned public media boundary
const mediaUrl = (r2Key: string) => new URL(r2Key, PUBLIC_MEDIA_BASE_URL).toString()
// Example base: https://media.plugged.mn/
```

Connect the public product bucket directly to a Cloudflare R2 custom domain. Product image requests then go from the browser to R2 through Cloudflare Cache without invoking the Astro Worker. Keep R2 keys in catalog, cart, and order data and derive URLs from the deploy-time media base. The `MEDIA` binding remains useful for seed uploads and local development, but the production storefront must not proxy public image reads through `/media/*`. R2 and cache request accounting still applies; Worker invocation accounting does not.

`CatalogProof` currently owns a module-scoped `QueryClient` and uses `client:only`. PR 3 must replace this proof pattern. It must not copy it into the storefront.

## Shared schemas and important types

Modern TypeBox stays in `@store-kit/db/schemas`. Drizzle schema generation also uses modern TypeBox. Elysia's transitive legacy `t` stays inside route files and only coerces HTTP path, query, header, and body input.

```ts
// planned: @store-kit/db/schemas
import { Type } from 'typebox'
import type { Static } from 'typebox'

export const productUseCaseSchema = Type.Union([
  Type.Literal('first-iem'),
  Type.Literal('bass'),
  Type.Literal('vocals'),
  Type.Literal('gaming'),
  Type.Literal('daily-carry'),
])
export type ProductUseCase = Static<typeof productUseCaseSchema>

export const cartLineInputSchema = Type.Object({
  variantId: Type.String(),
  quantity: Type.Integer({ minimum: 1, maximum: 10 }),
})
export type CartLineInput = Static<typeof cartLineInputSchema>

export const persistedCartItemSchema = Type.Object({
  variantId: Type.String(),
  quantity: Type.Integer({ minimum: 1, maximum: 10 }),
  productSlug: Type.String(),
  productName: Type.String(),
  variantName: Type.String(),
  options: Type.Record(Type.String(), Type.String()),
  imageR2Key: Type.Union([Type.String(), Type.Null()]),
  unitPriceMnt: Type.Integer({ minimum: 0 }),
})
export type PersistedCartItem = Static<typeof persistedCartItemSchema>

export const paymentMethodSchema = Type.Union([
  Type.Literal('qpay'),
  Type.Literal('bank_transfer'),
])

export const checkoutInputSchema = Type.Object({
  items: Type.Array(cartLineInputSchema, { minItems: 1, maxItems: 20 }),
  customer: Type.Object({
    name: Type.String({ minLength: 1 }),
    phone: Type.String({ minLength: 8 }),
  }),
  delivery: Type.Object({
    district: Type.String(), // Value must be in the shared Ulaanbaatar district set.
    khoroo: Type.String({ minLength: 1 }),
    address: Type.String({ minLength: 1 }),
    notes: Type.Optional(Type.String()),
  }),
  paymentMethod: paymentMethodSchema,
})
export type CheckoutInput = Static<typeof checkoutInputSchema>
```

All amounts use integer MNT fields such as `unitPriceMnt`, `subtotalMnt`, `deliveryFeeMnt`, and `totalMnt`. Do not add another currency type or accept a currency from the client.

```ts
// planned: serializable public and private data
export type StockStatus = 'in-stock' | 'low-stock' | 'sold-out'

export type CartCorrection =
  | { _tag: 'MissingVariant'; variantId: string; message: string }
  | { _tag: 'InactiveVariant'; variantId: string; message: string }
  | {
      _tag: 'InsufficientStock'
      variantId: string
      availableQuantity: number
      message: string
    }
  | {
      _tag: 'PriceChanged'
      variantId: string
      previousUnitPriceMnt: number
      currentUnitPriceMnt: number
      message: string
    }

export type ValidatedCart = {
  lines: ValidatedCartLine[]
  corrections: CartCorrection[]
  subtotalMnt: number
}

export type CheckoutCreated = {
  orderId: string
  orderNumber: string
  statusToken: string
  nextAction: QPayNextAction | BankTransferNextAction
}

export type PaymentConfirmation = {
  orderId: string
  paymentStatus: 'paid'
  orderStatus: 'confirmed' | 'new'
  stockApplied: boolean
  needsStaffAction: boolean
}
```

Expected domain errors are plain tagged data. They are not route-specific classes and are not thrown.

```ts
// planned: @store-kit/commerce
export type CheckoutError =
  | { _tag: 'CartEmpty'; message: string }
  | { _tag: 'CartChanged'; message: string; corrections: CartCorrection[] }
  | {
      _tag: 'InvalidCheckoutDetails'
      message: string
      fields: { path: string; message: string }[]
    }
  | { _tag: 'DeliveryUnavailable'; message: string }
  | { _tag: 'PaymentSetupFailed'; message: string; canUseBankTransfer: boolean }

export type PrivateOrderError =
  | { _tag: 'OrderNotFound'; message: string }
  | { _tag: 'InvalidStatusToken'; message: string }

export type BankTransferClaimError =
  | { _tag: 'BankTransferClaimNotAllowed'; message: string; paymentStatus: string }
  | { _tag: 'InvalidStatusToken'; message: string }

export type PaymentRefreshError =
  | { _tag: 'InvalidStatusToken'; message: string }
  | { _tag: 'PaymentVerificationFailed'; message: string; retryable: boolean }
  | { _tag: 'PaymentMismatch'; message: string }

export type PaymentConfirmationError =
  | { _tag: 'PaymentMismatch'; message: string }
  | { _tag: 'InsufficientStock'; message: string; variantIds: string[] }
  | { _tag: 'PaymentVerificationFailed'; message: string; retryable: boolean }
```

## Planned procedural surface

### Database queries

```ts
// planned: @store-kit/db/queries
listPublishedProducts(filters?: ProductListFilters & { useCase?: ProductUseCase })
findCartVariants(items: CartLineInput[])
findCheckoutSettings()
insertOrderWithLinesAndPayment(input: NewOrderAggregate)
findPrivateOrder(id: string, statusTokenHash: string)
markBankTransferClaimed(orderId: string, claimedAt: Date)
findPaymentByProviderInvoiceId(providerInvoiceId: string)
confirmPaymentAndDecrementStock(input: ConfirmPaymentWrite)
```

`confirmPaymentAndDecrementStock` owns the one atomic D1 batch described below. Query modules do not own domain decisions.

### Commerce operations and outbound adapters

```ts
// planned: @store-kit/commerce
validateCart(items: CartLineInput[]): Promise<Result<ValidatedCart, CartValidationError>>
createCheckoutOrder(input: CheckoutInput): Promise<Result<CheckoutCreated, CheckoutError>>
getPrivateOrderStatus(
  orderId: string,
  statusToken: string,
): Promise<Result<PrivateOrderStatus, PrivateOrderError>>
claimBankTransfer(
  orderId: string,
  statusToken: string,
): Promise<Result<BankTransferClaimed, BankTransferClaimError>>
refreshQPayPayment(
  orderId: string,
  statusToken: string,
): Promise<Result<PaymentConfirmation, PaymentRefreshError>>
confirmOrderPayment(
  orderId: string,
  providerReference: ProviderReference,
): Promise<Result<PaymentConfirmation, PaymentConfirmationError>>

// planned: @store-kit/commerce/adapters/qpay.ts; Ky only here
createQPayInvoice(input: QPayInvoiceInput): Promise<Result<QPayInvoice, QPayError>>
verifyQPayPayment(reference: QPayReference): Promise<Result<VerifiedQPayPayment, QPayError>>

// planned: @store-kit/commerce/adapters/telegram.ts; Ky only here
sendBankClaimMessage(input: BankClaimMessage): Promise<Result<TelegramMessage, TelegramError>>
sendPaidOrderMessage(input: PaidOrderMessage): Promise<Result<TelegramMessage, TelegramError>>
answerTelegramCallback(callbackQueryId: string): Promise<Result<void, TelegramError>>
editTelegramMessage(input: TelegramMessageEdit): Promise<Result<void, TelegramError>>
```

No other module uses Ky. D1, Astro self-calls, and Eden calls do not use Ky.

### Storefront state and query modules

```ts
// planned: @store-kit/storefront/cart
export const addCartItem: (item: PersistedCartItem) => void
export const setCartItemQuantity: (variantId: string, quantity: number) => void
export const removeCartItem: (variantId: string) => void
export const clearCart: () => void
export const openCart: () => void
export const closeCart: () => void
export const cartItemCount: () => number
export const cartLineInputs: () => CartLineInput[]

// planned: @store-kit/storefront/cart/components
export type CartItemsProps = {
  children: (item: PersistedCartItem) => JSX.Element
}

export const Cart: {
  Root(props: ParentProps): JSX.Element
  Trigger(props: ParentProps): JSX.Element
  Content(props: ParentProps): JSX.Element
  Items(props: CartItemsProps): JSX.Element
  Empty(props: ParentProps): JSX.Element
}
```

`Cart` is the shared headless commerce component. It owns cart context, open state, count, quantity commands, persistence timing, and the accessible Zaidan/Kobalte `Sheet` behavior. Plugged supplies product-line markup and all visual classes through children. Do not put Plugged colors or product-card markup in `@store-kit/storefront`.

The cart item store is one browser-owned, module-scoped Solid store persisted with `makePersisted` under `store-kit:plugged:cart:v1`. Each item includes a small display snapshot so the cart opens immediately without D1: product and variant names, options, image R2 key, and last-seen unit price. Store the image key, not a deployment URL. These values are display hints only. `cartLineInputs()` projects only `{ variantId, quantity }` for validation and checkout. The sheet uses a separate, non-persisted signal. SSR and first hydration output use an empty cart. Persisted state loads only after mount.

```ts
// planned: @store-kit/storefront/query-options
catalogQuery.findAllProducts(filters?: ProductListFilters & { useCase?: ProductUseCase })
cartQuery.validate(items: CartLineInput[])
orderQuery.findPrivateStatus(orderId: string, getToken: () => string)
checkoutMutation.create()
paymentMutation.refreshQPay()
paymentMutation.claimBankTransfer()

// planned: @store-kit/storefront/query-client
createStorefrontQueryClient(): QueryClient
```

`createStorefrontQueryClient()` contains the shared `QueryCache.onError` and defaults. Each Solid island root calls the factory. Do not store a `QueryClient` in module scope. Query context does not cross Astro island roots.

## Call stacks

### Astro SSR catalog list

```text
GET /products?useCase=bass&category=iem
  -> Astro page frontmatter
  -> listCatalogProducts(filters)                         [direct commerce call]
  -> Value.Parse(productListFiltersSchema, filters)       [modern TypeBox]
  -> listPublishedProducts(filters)
  -> Drizzle -> env.DB
  -> Result.ok(catalog)
  -> Astro handles Result
  -> render Astro HTML list
  -> optional Solid filter owner gets { catalog, loadedAt } serializable props
```

**D1:** Read-only. The current list query may use `db.batch([itemsQuery, countQuery])` to reduce round trips. It does not need a transaction because both reads do not change invariants.

### Astro SSR product detail and Solid `client:load`

```text
GET /products/:slug
  -> Astro page frontmatter
  -> getCatalogProduct(slug)                              [direct commerce call]
  -> findPublishedProductBySlug(slug)
  -> Drizzle -> env.DB
  -> Result.ok(product) | Result.err(ProductNotFound)
  -> Astro maps ProductNotFound to 404 before render
  -> Astro renders product HTML
  -> VariantPicker client:load props = { product: plainProduct, loadedAt }
  -> island creates createStorefrontQueryClient()
  -> useQuery({
       ...catalogQuery.findProductBySlug(slug),
       initialData: Result.ok(plainProduct),
       initialDataUpdatedAt: loadedAt,
       staleTime: shortPositiveTtl,
     })                                                   [only if refetch is useful]
```

Props contain only serializable values. They do not contain `Result`, bindings, Drizzle values, functions, or a QueryClient. If the picker does not refetch, it uses the prop directly and does not use TanStack Query.

**D1:** One read. No batch and no transaction are required.

### Client search

```text
Search island input
  -> debounced catalogQuery.findAllProducts({ query, ...filters })
  -> resultQueryOptions(query key, Eden request)
  -> Eden GET /api/products
  -> Elysia legacy t query coercion                       [route boundary only]
  -> listCatalogProducts(coercedQuery)
  -> modern TypeBox Value.Parse
  -> listPublishedProducts -> D1
  -> Result.serialize(result)
  -> Eden inferred response
  -> resultQueryOptions -> Result.deserialize
  -> TanStack query data = Result.ok | Result.err
  -> Solid UI matches Result status
```

**D1:** Read-only list batch is allowed. No transaction is required.

### Persisted guest cart

```text
Solid island mounts in browser
  -> cart owner starts with [] for SSR and initial hydration
  -> makePersisted loads store-kit:plugged:cart:v1 after mount
  -> addCartItem / setCartItemQuantity / removeCartItem
  -> module-scoped native Solid store updates
  -> makePersisted writes PersistedCartItem[] display snapshots
  -> cart renders immediately from names, options, imageR2Key, and unitPriceMnt
  -> mediaUrl(imageR2Key) derives the current R2 custom-domain URL
  -> cartItemCount and cartLineInputs derive from store
  -> separate island reads the same browser module owner
  -> Cart.Content uses the shared headless Zaidan/Kobalte Sheet behavior
  -> openCart / closeCart updates separate non-persisted signal
```

The local snapshot can be stale. Opening the sheet never waits for validation. Validation may refresh in the background after the sheet is visible and must run before checkout creates an order. Replace display values with current returned line values and show any price or availability correction. Never submit the persisted price, name, image, or total as authoritative checkout input.

**D1:** None until explicit validation. The cart opens and updates from browser state.

### Server cart validation

```text
Cart sheet or checkout
  -> cartQuery.validate(items)
  -> resultQueryOptions
  -> Eden POST /api/cart/validate
  -> Elysia legacy t body coercion
  -> validateCart(items)
  -> modern TypeBox Value.Parse(cart items and limits)
  -> findCartVariants(items) -> D1
  -> calculate current lines, MNT subtotal, and corrections
  -> Result.serialize(Result.ok(validatedCart) | Result.err(domainError))
  -> Eden -> Result.deserialize -> TanStack data -> corrective UI
```

Corrections for missing, inactive, insufficient-stock, and changed-price variants are normal returned data. They are not transport failures. Current returned line data refreshes the persisted display snapshot.

**D1:** Read-only. One joined read is preferred. No transaction or batch is required.

### Checkout creation

```text
Checkout form submit
  -> checkoutMutation.create(input)
  -> Eden POST /api/checkout
  -> Elysia legacy t body coercion
  -> createCheckoutOrder(input)
  -> modern TypeBox parse and phone normalization
  -> validateCart(items) + findCheckoutSettings() -> D1 reads
  -> calculate MNT snapshots and status token/hash
  -> if qpay: qpay.createQPayInvoice(...) -> Ky -> QPay
  -> insertOrderWithLinesAndPayment(aggregate) -> D1 atomic batch
  -> Result.serialize
  -> Eden -> mutation Result data
  -> on ok: clearCart(); navigate to private order status
  -> on err: preserve cart and form
```

The operation sends no client price, total, stock, or delivery fee to a write query. For QPay, create the provider invoice before the local atomic write, and return `PaymentSetupFailed` if setup fails. The local write atomically inserts the order, all order-line snapshots, and one pending payment.

**D1:** Reads do not need a transaction. The order, lines, and payment inserts require one atomic D1 batch because partial creation is invalid.

### QPay invoice, refresh, and webhook confirmation

```text
Invoice: createCheckoutOrder
  -> createQPayInvoice -> Ky -> QPay
  -> normalized QPayInvoice -> local order write

Refresh: POST /api/orders/:id/payment/refresh
  -> verify status token hash
  -> verifyQPayPayment -> Ky -> QPay
  -> confirmOrderPayment(orderId, verifiedReference)
  -> atomic payment and stock stack
  -> serialized customer-safe Result

Webhook: POST /api/webhooks/qpay
  -> Elysia validates/coerces provider input
  -> verify supported authenticity data
  -> verifyQPayPayment -> Ky -> QPay
  -> find payment by provider invoice ID
  -> confirmOrderPayment(orderId, verifiedReference)
  -> atomic payment and stock stack
  -> provider-required retry-safe acknowledgement
  -> sendPaidOrderMessage -> Ky -> Telegram             [after confirmed commit]
```

**D1:** Invoice creation uses the checkout write batch. Refresh token lookup and webhook invoice lookup are reads. Only `confirmOrderPayment` requires the atomic stock/payment batch.

### Bank-transfer claim

```text
I sent the payment
  -> paymentMutation.claimBankTransfer()
  -> Eden POST /api/orders/:id/payment/claim
  -> verify private token hash
  -> claimBankTransfer(orderId, token)
  -> conditional D1 update pending -> claimed
  -> if this call changed the row:
       sendBankClaimMessage -> Ky -> Telegram
     else:
       return existing claimed state without a message
  -> Result.serialize -> Eden -> TanStack mutation data -> UI
```

**D1:** A conditional single statement provides idempotency. No transaction or batch is required. Send Telegram only when the update reports a state change. Keep the claim and Telegram message ID in D1 because they are durable relational order state and require consistent deduplication. Do not put bank-transfer claims in KV; KV is eventually consistent and adds a second source of truth.

### Telegram confirm button callback

```text
POST /api/webhooks/telegram
  -> verify Telegram webhook secret
  -> validate allowed admin user ID and callback payload
  -> resolve expected order and payment
  -> confirmOrderPayment(orderId, bankTransferReference)
  -> atomic payment and stock stack
  -> answerCallbackQuery -> Ky -> Telegram               [also on valid repeats]
  -> editMessageText -> Ky -> Telegram                   [when useful]
  -> provider acknowledgement
```

**D1:** Callback lookup is read-only. Confirmation requires the shared atomic batch. Telegram HTTP calls run after the database result and are not part of the D1 atomic operation.

### Private order status

```text
GET /orders/:id page
  -> render no PII until browser supplies the scoped token
  -> orderQuery.findPrivateStatus(id, token closure)
  -> resultQueryOptions
  -> Eden GET /api/orders/:id/status with private token
  -> hash token and compare with stored hash
  -> getPrivateOrderStatus(id, token)
  -> findPrivateOrder(id, tokenHash) -> D1
  -> order and immutable line snapshots
  -> Result.serialize -> Eden -> Result.deserialize
  -> TanStack data -> private status UI
```

The query key uses the order ID, not the plaintext token. The query function closes over the token. Do not log or persist the token in query instrumentation.

**D1:** Read-only. No transaction or batch is required.

### Payment confirmation with exactly-once stock decrement

```text
confirmOrderPayment(orderId, providerReference)
  -> validate verified amount, method, and provider identity
  -> confirmPaymentAndDecrementStock(write)
  -> one D1Database.batch() / Drizzle db.batch():
       1. claim the unpaid payment by changing pending|claimed -> confirming
          only when every order line has enough current stock
       2. decrement each variant only while this payment is confirming
       3. change confirming -> paid and record the provider reference
       4. move order new -> confirmed and set timestamps
  -> inspect the first statement's affected-row result
  -> if payment was already paid:
       read and return existing paid result; do not decrement stock
  -> if bank transfer has insufficient stock:
       every batch statement is a no-op; return InsufficientStock
  -> if verified QPay is paid but stock is insufficient:
       conditionally mark payment paid without decrementing stock
       keep order new
       return { stockApplied: false, needsStaffAction: true }
  -> after commit, send urgent Telegram message for the QPay shortage
```

**D1:** D1 does not expose an interactive callback transaction API for this flow. Its documented `D1Database.batch()` executes prepared statements sequentially as one SQL transaction and rolls back the full sequence if a statement fails. Use that API directly or through Drizzle's D1 `db.batch()` support. Do not plan `db.transaction(async tx => ...)` for D1. The first conditional `confirming` update is the idempotency claim; every later statement is conditional on that state, so a repeated or losing confirmation changes nothing. Repeated QPay webhooks and Telegram callbacks must observe `paid` and return without another decrement. Concurrent attempts against the last unit must allow at most one stock-applying batch and must never make stock negative.

Source: [Cloudflare D1 `batch()` documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

## Better Result and transport failure flow

```text
commerce expected failure
  -> Result.err({ _tag, safe fields, message })
  -> API Result.serialize
  -> Elysia response
  -> Eden inferred { data, error }
  -> resultQueryOptions
       data missing / deserialize failure / rejected HTTP -> throw
       valid serialized Result.err                    -> return Result.err
       valid serialized Result.ok                     -> return Result.ok
  -> TanStack Query
       returned Result.err -> query.data -> local UI match by _tag
       thrown transport error -> query.isError + global QueryCache.onError
```

A generic Sonner notice is enough only for a rejected transport or malformed response. Expected domain errors stay in `query.data` or mutation data and render where the customer can fix the problem:

| Domain result | Specific UI handling |
| --- | --- |
| `ProductNotFound` | Astro returns 404. Client navigation shows a full not-found state with a link back to the catalog. |
| `MissingVariant` | Keep the cart row visible, mark it unavailable, and provide `Remove`. Do not show checkout for that row. |
| `InactiveVariant` | Keep the row visible with its name and image, disable quantity increase, and provide `Remove`. |
| `InsufficientStock` | Show available quantity beside the row and provide `Reduce to available` or `Remove`. |
| `PriceChanged` | Show old and current MNT prices on the row, update the local snapshot, and recalculate the displayed subtotal. Checkout always uses the current value. |
| `CartEmpty` | Show the headless cart empty state and a `Shop products` action. Do not use a toast. |
| `CartChanged` | Show the correction panel above the order summary and focus its heading. Keep customer form values. |
| `InvalidCheckoutDetails` | Map each returned path to its TanStack Form field error and focus the first invalid field. Also show the safe summary message. |
| `DeliveryUnavailable` | Show an inline address-section error and preserve every field. |
| `PaymentSetupFailed` | Show an inline payment-section error with `Retry`; offer `Use bank transfer` when `canUseBankTransfer` is true. Preserve the order form and cart. |
| `OrderNotFound` or `InvalidStatusToken` | Render the same privacy-safe order-not-found screen. Do not reveal whether the order ID exists. |
| `BankTransferClaimNotAllowed` | Refresh the order state and show the current payment status beside the claim action. If already claimed, treat it as success and show `Awaiting approval`. |
| `PaymentVerificationFailed` | Keep the payment pending view. Show `Try again` only when `retryable` is true; otherwise show store contact guidance. |
| `PaymentMismatch` | Do not expose provider details. Show a persistent `Contact the store` payment state and send staff diagnostics to logs or Telegram. |
| QPay paid with `needsStaffAction: true` | Show a persistent paid-but-reviewing fulfillment state with store contact details. Never reduce this to a transient toast. |
| already-paid repeat | Return the existing `Result.ok` paid state and navigate or refresh the status page. It is not an error. |

The backend supplies customer-safe Mongolian `message` values and structured fields needed for these actions. The Plugged app owns layout and action labels. Provider response bodies, stack traces, token values, and internal IDs remain private. Webhooks return provider-required acknowledgement shapes and do not expose Better Result internals.

## Astro and Cloudflare boundary rules

```ts
// planned: apps/plugged Astro frontmatter pattern
const result = await listCatalogProducts(filters) // direct, same Worker bundle
if (result.status === 'error') return Astro.redirect('/error') // map as required
const loadedAt = Date.now()
const catalog = result.value // plain serializable data only
```

- `apps/plugged/src/fetch.ts` mounts Elysia at `/api` and Astro for documents. Production product images use the R2 custom domain and do not pass through this Worker.
- Commerce and DB get `DB` through the existing `cloudflare:workers` environment seam. QPay and Telegram add typed secret bindings to `Env` during PR 2.
- `MEDIA` remains available for seed uploads and local development. Browser and persisted cart data contain an R2 key, never an `R2Object` or hard-coded deployment URL.
- Configure the R2 custom domain with Cloudflare Cache and immutable headers for content-addressed keys. See [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains).
- Public catalog pages and GET routes use Workers Cache headers. Cart, checkout, status, claim, refresh, and webhook routes use `private, no-store` or explicit `no-store`.
- Do not pass `Env`, `D1Database`, `R2Bucket`, `Result`, or a QueryClient to an island.

## Transaction and batch summary

| Flow | Requirement |
| --- | --- |
| Catalog list | Read batch for items plus count is allowed; no transaction |
| Product detail | No transaction or batch |
| Cart validation | No transaction or batch |
| Checkout reads | No transaction or batch |
| Order + lines + pending payment creation | Atomic D1 batch required |
| Bank claim | One conditional update; no transaction or batch |
| Private status | No transaction or batch |
| Payment + stock + order confirmation | One atomic D1 `batch()` transaction with a conditional `confirming` claim |
| QPay paid with insufficient stock | Atomic payment-only state change required; no stock update |
| QPay and Telegram HTTP | Outside D1 transaction or batch |

## Real behavior verification

Tests use migrated local D1, real Drizzle queries, the mounted Elysia app, and a real browser. They do not use mocks, stubs, fake providers, or placeholder assertions.

- Prove schema checks, current-price cart validation, immutable line snapshots, token-protected status, repeated claims, repeated confirmations, and concurrent last-unit confirmation against local D1.
- Prove Eden serialization and deserialization through the real Elysia route surface.
- Prove SSR HTML contains catalog and product content before JavaScript.
- Prove `client:load` receives serializable initial data and does not make an immediate duplicate request.
- Prove cart persistence, immediate snapshot rendering, validation refresh, and headless cart sharing across real Astro islands in a browser.
- Prove production media URLs target the R2 custom domain and do not request `/media/*` from the Astro Worker.
- Prove each actionable domain error renders its inline correction, field mapping, retry, status, or contact action instead of only a generic toast.
- Use real QPay and Telegram sandbox or test accounts when credentials exist. Keep provider checks separate when credentials do not exist; do not replace them with fakes.

## Implementation order

### PR 1: `plugged/01-shopping-domain`

1. Add use cases, shopping tables, modern TypeBox schemas, migrations, and store-owned seed validation.
2. Add direct DB queries, cart state, cart validation, and catalog `useCase` support.
3. Prove real local D1 behavior.

### PR 2: `plugged/02-checkout-payments`

1. Add checkout creation, private tokens, and atomic payment confirmation.
2. Add Ky-based QPay and Telegram boundaries, bank claim behavior, and webhooks.
3. Add Elysia routes and Eden-inferred storefront query and mutation modules; prove real local and provider behavior.

### PR 3: `plugged/03-storefront`

1. Add the request-safe QueryClient factory, Astro SSR catalog pages, serializable island initial data, and direct R2 custom-domain media URLs.
2. Add product, search, the shared headless cart, checkout, payment, and private status UI.
3. Run real mobile browser, accessibility, cache, bundle, check, test, and build verification.

No step adds customer accounts, auth, admin, CMS, discounts, or a generic payment framework.
