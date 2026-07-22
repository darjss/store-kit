# Store Kit product and engineering preferences

This document records confirmed preferences and later requirements that are outside the bootstrap plan in `plans/001-bootstrap-foundation.md`.

It is a constraint document, not an implementation plan. Write a focused plan before implementing each major area.

## Product goal

Store Kit supports direct sales to Mongolian store owners.

The product must make it fast to build a credible, working store for a client. It is not a multi-tenant SaaS product. Do not add tenant resolution, shared customer databases, subscription billing, or a platform control plane.

Each store has:

- its own custom storefront
- its own Cloudflare Worker
- its own D1, KV, and R2 resources
- the same shared commerce packages
- the same shared admin interface

The initial product must remain a simple operating store. Do not add enterprise architecture or tests for problems that do not exist.

The platform is Mongolia-only. Use `mn-MN` and `MNT` as shared constants. Do not make locale or currency configurable per store.

## First store

Plugged is the template and first dogfood store.

The old `~/dev/plugged` application is not launched. Move its useful product data and proven behavior into Store Kit through later focused plans. Do not preserve its old structure only because it exists.

Product import is not part of bootstrap. A later catalog plan must define the final product schema before it imports the old data.

## Repository and deployment model

Keep all stores in one repository.

Each store app contains:

- custom Astro pages
- custom layouts
- custom storefront components
- store-specific assets
- deploy-time `store.json`

Shared packages contain:

- database schema and queries
- commerce operations
- Elysia API
- headless storefront behavior
- admin UI
- common UI components
- provisioning tools

A future store command must:

1. validate one store JSON file
2. create the thin store application
3. declare or provision D1, KV, and R2
4. apply migrations
5. seed initial data
6. upload media
7. generate Cloudflare types
8. build and deploy one Worker
9. print the `workers.dev` URL

Secrets must not be stored in `store.json`.

## Code organization

Use this package direction:

```text
db ← commerce ← api
              ↙
storefront → Eden API
admin      → Eden API

ui ← storefront and admin
config → apps and server packages
```

Use these names:

| Name            | Responsibility                                   |
| --------------- | ------------------------------------------------ |
| `queries`       | Reusable Drizzle database access                 |
| `operations`    | Business rules and workflows                     |
| `adapters`      | QPay, Telegram, SMS, and future delivery systems |
| `routes`        | Elysia HTTP endpoints                            |
| `webhooks`      | External HTTP callbacks                          |
| `query-options` | TanStack Query option factories                  |

Do not use MVC folders. Do not add controllers, class-based services, or generic repositories.

Database query files can import the shared server-only `db` directly. Do not pass a database object through every function.

Operations can call multiple query modules. Routes, webhooks, scripts, and future integrations must call operations instead of duplicating business rules.

## API and errors

Use Elysia with AOT disabled and mount it in Astro 7 through `src/fetch.ts`.

Keep a separate `@store-kit/api` package. It owns Elysia, the Eden type, authentication mounts, routes, webhooks, and transport behavior.

Use Better Result throughout expected business workflows.

Expected operation results travel through Eden with Better Result's built-in RPC format:

```ts
Result.serialize(result);
Result.deserialize<Value, Failure>(wireValue);
```

Use plain serializable tagged error unions at the network boundary. JSON does not preserve class prototypes.

Do not create:

- handwritten error translations for every route
- a second API error envelope
- a client error class for expected failures
- a global duplicated error-code registry

A TanStack Query whose function resolves to `Result.err` is still a successful query. Expected commerce failures are matched from `query.data`. `query.isError` represents a transport failure or an unexpected server failure.

User-facing error variants must contain safe messages that the UI can display directly. Do not send stack traces or private provider errors.

## Frontend data behavior

Use Astro pages with Solid islands. Do not convert storefronts into full SPAs.

The shared headless storefront package owns:

- Eden requests
- Result deserialization
- TanStack Query options
- TanStack Form behavior
- cart state
- search and filter behavior
- checkout behavior
- account data behavior

Store apps own all storefront presentation.

Export named TanStack option factories directly:

```ts
export const productDetailOptions = (slug: string) => queryOptions({ ... });
```

Do not create one global nested query object.

Use a module-scoped native Solid `createStore` for cart state shared between separate Astro islands. Persist the guest cart with `makePersisted` from `@solid-primitives/storage`. Keep cart drawer visibility in a separate, non-persisted Solid signal.

Do not use Nano Stores. The project uses only Solid islands, and the Nano Stores `$` accessor convention is not desired. Never mutate module-scoped cart state during server rendering.

## UI foundation

Use Tailwind CSS 4.

Use the Zaidan SolidJS registry with:

- Kobalte primitives
- Vega style
- neutral base color
- neutral theme
- neutral chart color
- Inter body font
- Inter heading font
- default radius
- subtle menu accent

Zaidan copies components into the repository. Customize the copied components and tokens when the shared admin needs a better theme.

Use Solar icons through the Solid package. Use Unpic for storefront product images.

The shared admin has one consistent interface for all stores. Store data and feature availability can change, but the admin layout must not fork per store.

## Content management

Do not integrate a full CMS initially.

EmDash overlaps with the planned database, admin, content model, authentication, and Cloudflare infrastructure. Reconsider it only if the store needs general editorial pages or a real block editor.

Build a small content feature in the shared admin.

A later content plan should cover:

### Store settings

A small settings record for:

- contact information
- social links
- default delivery information
- bank transfer instructions
- checkout help text
- order confirmation text

### Named content entries

Use simple named slots for banners and promotional content. A content entry can contain:

- key
- title
- text
- R2 image key
- link
- enabled state
- sort order

The custom storefront decides how each key is presented. Do not build a generic page builder.

Brand identity, infrastructure, and the storefront theme remain deploy-time configuration managed by the developer.

Catalog, delivery fees, contact data, checkout copy, banners, and merchandising are editable in admin.

## Catalog

The initial catalog must support normal products and simple variants for clothing and similar stores.

A variant can contain:

- SKU
- display name
- option values such as size and color
- price
- optional compare-at price
- stock quantity
- active state

A simple serialized option map is acceptable:

```ts
{
  size: "M",
  color: "Black"
}
```

Do not build an enterprise option and attribute engine.

Use Drizzle's built-in Valibot schema generation through `drizzle-orm/valibot`. Do not install `drizzle-valibot`.

Discount codes and promotional pricing are later features.

## Inventory

Keep inventory per variant.

Initial behavior:

- check available stock during order creation
- decrease stock when an order is created
- restore stock when an order is cancelled
- let an admin edit stock directly

Do not add an inventory ledger, reservation service, warehouse model, or event sourcing initially.

A later order plan must make repeated payment and cancellation actions safe so Telegram callbacks or payment callbacks do not change stock twice.

## Checkout and customer accounts

Guest checkout is required. A customer must be able to place an order without an account.

Customers can optionally sign in with phone OTP. Signed-in customers can see past orders and reuse their information.

If a customer signs in, attach eligible orders to the customer account. Do not require sign-in before checkout.

## Authentication

Better Auth is the selected authentication library.

Current desired surfaces are:

- customer phone OTP
- admin Google and email sign-in
- admin access only for manually approved users
- KV as Better Auth secondary storage

The user originally preferred two Better Auth instances for stronger separation between customer and admin authentication. A single instance with separate login surfaces, roles, and an `approved` field is a simpler alternative. This is not settled. Do not choose one or two instances without confirmation during the authentication plan.

Regardless of instance count, admin access must require a database-controlled approval field. Do not trust the login provider alone.

## Payments

Initial payment methods:

- QPay
- manual bank transfer

Use a small payment adapter architecture that can accept another provider later. Do not build a generic payment framework.

### QPay

The expected flow is:

1. create an order
2. create a QPay invoice
3. show the QR code and payment links
4. process QPay confirmation
5. mark the payment as paid
6. move the order to its confirmed state
7. send a new-order Telegram notification

### Bank transfer

The expected flow is:

1. create an order
2. show bank transfer instructions
3. let the customer claim that payment was sent
4. mark the payment as claimed
5. send a Telegram message with the phone number, amount, and order number
6. include a Telegram inline button to confirm payment
7. process the Telegram callback
8. verify the Telegram webhook secret and allowed admin ID
9. mark the payment as paid
10. move the order to its confirmed state
11. answer the callback and edit the Telegram message to show confirmation

The confirmation callback must be safe to repeat.

Use Ky for direct Telegram Bot API HTTP calls. Do not add a Telegram framework for `sendMessage`, `answerCallbackQuery`, and `editMessageText`.

## Order and payment statuses

Keep order status separate from payment status.

Initial order statuses:

```ts
type OrderStatus = "new" | "confirmed" | "preparing" | "delivering" | "completed" | "cancelled";
```

Initial payment statuses:

```ts
type PaymentStatus = "pending" | "claimed" | "paid" | "failed";
```

Admins choose normal order status changes manually.

Do not add complex delivery tracking initially.

## Delivery

Initial delivery behavior is manual and basic:

- editable delivery fee
- customer address and notes
- basic delivery status through the order status
- no real-time tracking

A store-specific delivery adapter, such as the delivery integration in Vit Store, can be added when a real client requires it.

## Seeding and demos

Do not add scraping infrastructure now.

Use one reusable seed script for development and initial store setup. It must be easy to replace with real onboarding data later.

The demo must be a real working MVP, not a visual mock. The first credible demo should use the same shared commerce code that production stores use.

Plan scraping only when onboarding a store that requires it.

## Approved libraries

These libraries are approved when the corresponding feature uses them:

### Core

- Astro 7
- SolidJS
- Cloudflare Workers adapter and Wrangler
- Elysia and Eden
- Drizzle ORM and Drizzle Kit
- Valibot
- Better Result
- Better Auth
- Tailwind CSS 4

### Solid and client data

- TanStack Solid Query
- TanStack Solid Form
- native Solid signals and stores for shared client state
- `@solid-primitives/storage` for guest-cart persistence
- TanStack Solid Table for real admin tables
- selected Solid Primitives for concrete needs
- Corvu packages required by selected Zaidan components
- Solid Sonner for toast feedback

Do not add TanStack Virtual until real row counts require it.

### Utilities and media

- Dismatch for exhaustive functional switches
- es-toolkit for small general utilities
- Solar icons for Solid
- Unpic for Solid
- Ky for outbound HTTP requests to QPay, Telegram, SMS, and future delivery APIs

Use Eden for calls from the storefront and admin to the Store Kit API. Use Ky only for outbound calls from Store Kit to external services.

### Avoid duplicate categories

Do not add:

- Zod beside Valibot
- Neverthrow beside Better Result
- ts-pattern beside Dismatch
- Lodash or Remeda beside es-toolkit
- Axios or another general HTTP client beside Ky
- Solid Router beside Astro routing
- Astro Actions beside Elysia
- Redux, Zustand, or TanStack Store beside the selected state owners
- a full CMS before a real requirement exists
- an animation package during bootstrap

## Quality expectations

Keep the code elegant, idiomatic, and readable.

Prefer:

- pure functions
- immutable data
- inferred types
- small modules
- direct procedural flows
- schemas as type sources
- one owner for each state category

Avoid:

- heavy OOP
- god files
- speculative abstractions
- generic frameworks built inside the application
- duplicated validation schemas
- duplicated API error shapes
- broad tests for theoretical failures

Tests must exercise real behavior. Never add mocks, stubs, fake implementations, placeholder assertions, or tests that only prove the mock setup. If a useful test cannot run against the real implementation, do not add that test.

Test real financial and stock invariants when those features exist. Do not treat "simple" as permission to make payment confirmation or stock changes unsafe to repeat.
