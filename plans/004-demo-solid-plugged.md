# Build the Solid 2 Plugged demo

## Objective

Create `apps/demo-solid-plugged` as a side-by-side Solid 2 beta rewrite of `apps/plugged`.

The demo must keep the current customer behavior:

- homepage merchandising;
- catalog search and filters;
- product detail, gallery, variant selection, quantity, and add to cart;
- persistent guest cart and cart sheet;
- checkout with QPay and bank transfer;
- private order status;
- QPay refresh and bank-transfer claim;
- QPay and Telegram webhooks;
- responsive product images;
- the current Plugged visual direction, accessibility, and mobile navigation.

Do not replace or modify the production Astro app during the prototype. The result is a second Cloudflare Worker that uses the same shared database, contracts, and commerce logic.

## Decision

Use this stack:

- Solid `2.0.0-beta.26`;
- `@solidjs/web` `2.0.0-beta.26`;
- Solid Router `1.0.0-next.9`;
- `vite-plugin-solid` `3.0.0-next.16` turnkey SSR;
- core server functions;
- experimental server-component frames;
- a thin Cloudflare Worker adapter;
- Tailwind CSS 4;
- shared `@store-kit/contracts`, `@store-kit/db`, `@store-kit/commerce`, and external `@store-kit/api` webhook routes.

Do not use SolidStart. Do not put Elysia between storefront server functions and commerce operations. Keep Elysia only for external HTTP boundaries such as QPay and Telegram webhooks.

This prototype is an explicit exception to the current Astro-only storefront preference in `docs/product-preferences.md`. Do not change that preference or migrate the production app until the prototype passes the completion criteria.

## Sources

Read these before implementation:

- `docs/solid2/README.md`;
- `docs/solid2/store-kit-notes.md`;
- `docs/solid2/server-components-and-frames.md`;
- `docs/solid2/tooling-and-cloudflare.md`;
- `docs/solid2/prototype-test-plan.md`;
- `/home/darjs/dev/scratchpad/solidv2-research/upstream/vite-plugin-solid/examples/turnkey/`.

The turnkey example is the implementation reference for:

- generated client and server entries;
- `ssr: { app: "src/App.tsx" }`;
- `serverFunctions: { components: true }`;
- `dist/client` and `dist/server/server.js` output;
- the `handleRequest(Request)` production handler;
- frame adoption with zero boot refetch;
- client-slot state and DOM identity preservation;
- server-only code exclusion from client assets.

Do not copy its `any` types or Node server adapter.

## Architecture rules

### Package isolation

The workspace catalog currently points to Solid 1. The new app must pin the complete Solid 2 prerelease group directly in its own `package.json`. Do not change the workspace catalog during the prototype.

Do not import browser components from these Solid 1 packages:

- `@store-kit/storefront`;
- `@store-kit/ui`;
- Kobalte-based UI dependencies.

Use app-local Solid 2 components and native controls. Shared browser-safe contracts remain allowed. Pure helpers can move to a framework-free package when reuse is useful; do not import a broad Solid 1 package only for one helper.

### State ownership

| Value | Owner |
| --- | --- |
| URL, parameters, and search parameters | Solid Router |
| Catalog and product HTML | Server frames |
| Product gallery and selected variant | Client component slot |
| Guest cart | One app-owned Solid 2 store |
| Cart persistence | Browser storage loaded after settlement |
| Checkout draft | Checkout route owner |
| Checkout mutation | Solid action plus server function |
| Order authority | Commerce operations and D1 |
| Private order status | Client-consumed server function |
| Payment mutations | Solid actions plus server functions |
| External webhooks | Existing Elysia API routes |

Do not mirror frame-owned product content into a client query cache. Send client slots only the IDs, prices, stock values, and image metadata they require.

### Frame placement

Use frames selectively:

- homepage product content: frame;
- catalog listing and filter result content: frame;
- product description and facts: frame;
- product purchase UI: client slot inside the product frame;
- cart and checkout drafts: client-owned;
- checkout command results: ordinary server functions;
- private order status: ordinary server functions because the status token remains in the URL fragment and is unavailable during SSR;
- webhooks: ordinary Elysia HTTP routes.

Frames replace Astro's server-owned page markup. They do not replace every client data operation.

## Phase 1: Deploy the empty vertical slice

Create `apps/demo-solid-plugged` with only enough code to prove the platform:

```text
apps/demo-solid-plugged/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc
├── worker.js
├── public/
└── src/
    ├── App.tsx
    ├── Document.tsx
    ├── app/router.ts
    ├── routes/HomePage.tsx
    └── styles/global.css
```

Requirements:

1. Pin the coupled Solid 2 package group.
2. Set `jsxImportSource` to `@solidjs/web`.
3. Configure turnkey SSR with frames enabled from the start.
4. Use Router 1.0 route configuration and plain anchors.
5. Copy the Plugged fonts, logo, textures, and static assets into the new app.
6. Create a minimal Worker that sends static assets to `ASSETS` and all other requests to the generated `handleRequest`.
7. Preserve the generated response stream. Do not buffer or reconstruct it.
8. Deploy a minimal page to a new `workers.dev` Worker before adding database code.

Use a new Worker name such as `demo-solid-plugged`. Do not attach `plugged.mn` or the existing demo custom domain.

Proof:

- local dev serves streamed SSR;
- production build emits `dist/client` and `dist/server/server.js`;
- Wrangler serves the built Worker;
- the deployed page returns HTML and hydrates without errors;
- a small client counter proves hydration;
- a small server function proves `/_server` dispatch;
- client assets do not contain a server-only marker.

## Phase 2: Add Cloudflare resources and seed data

Add only resources required by the implemented behavior:

- `ASSETS` for built client assets;
- a dedicated D1 database bound as `DB`;
- a dedicated KV namespace bound as `CACHE` for QPay token caching;
- public environment variables used by commerce and media;
- QPay and Telegram secrets only before payment features are enabled.

Do not add `AUTH_KV` or `SESSION` until the Solid demo implements authentication or session behavior.

Apply the existing migrations from `packages/db/migrations` to the new D1 database. Extend the tooling seed target so it can seed `apps/demo-solid-plugged` from the existing Plugged catalog seed without duplicating the seed implementation.

Reuse the existing development media custom domain for the first prototype. Product images are public immutable assets and do not require an R2 binding in the storefront Worker. Create a separate media bucket only if isolation becomes a tested requirement.

Proof:

- generated Worker types include `DB`, `CACHE`, and `ASSETS`;
- migrations succeed on an empty local database;
- the catalog seed succeeds twice without duplicate rows;
- the minimal deployed app can call `commerce.system.getStatus` and `commerce.catalog.listProducts` through server functions;
- no provider secret appears in HTML, logs, frame slot data, or client assets.

## Phase 3: Create the server boundary

Add small server-only modules that call shared commerce namespaces directly:

```text
src/server/
├── catalog.tsx
├── checkout.ts
├── orders.ts
└── environment.ts
```

Rules:

1. Validate every server-function argument inside the `"use server"` body with shared TypeBox contracts.
2. Treat TypeScript types as compile-time only.
3. Call `commerce.catalog`, `commerce.checkout`, `commerce.orders`, and `commerce.payments` directly.
4. Convert Better Result values to safe tagged transport values when the browser consumes the result.
5. Handle frame errors on the server before returning a component.
6. Never return database records, provider responses, stack traces, bindings, or Better Result instances to the browser.
7. Keep all request-specific state inside request scope.
8. Validate the runtime environment before the first sensitive operation.

Keep `/api/qpay/*` and `/api/telegram/*` routed to the existing `@store-kit/api` Elysia app in `worker.js`. Route assets first, external API boundaries second, and turnkey `handleRequest` last.

## Phase 4: Build routing and server frames

Create these routes with Router 1.0 configuration:

- `/`;
- `/products`;
- `/products/:slug`;
- `/checkout`;
- `/orders/:id`;
- a not-found route.

Use one persistent application shell containing:

- skip link;
- desktop and mobile navigation;
- footer;
- bottom navigation;
- search trigger;
- cart trigger and cart sheet.

Implement frames in this order:

1. A simple catalog frame with keyed product rows.
2. Product detail frame with a purchase client slot.
3. Homepage merchandising frame.
4. Catalog filters driven by Router search parameters.

Use stable `dynamic()` call sites. Use `$key` for product and repeated slot identity. Keep `<Loading>` close to the frame-dependent region instead of replacing the persistent shell.

Proof for every frame:

- content exists in initial HTML;
- boot makes zero duplicate frame requests;
- direct deep reload works;
- Router navigation updates content;
- stale responses cannot overwrite newer navigation;
- server content appears once, as HTML;
- client slots receive only required data;
- no database or server module reaches a client chunk.

## Phase 5: Port interactive storefront behavior

Implement app-local Solid 2 client features:

- persistent guest cart;
- cart item count;
- full-height cart sheet;
- cart validation;
- product gallery;
- variant image selection;
- quantity limits;
- add-to-cart announcements;
- full-screen search;
- reduced-motion behavior.

Port behavior, not Solid 1 implementation details. Use `onSettled`, Solid 2 stores, draft-first setters, `<Loading>`, and `<For keyed={false}>` where positional identity is intended.

Load cart storage after the client owner settles. Initial SSR and initial hydration must use the same empty-cart view. The persistent app shell means there is one cart owner; do not retain the Astro cross-island singleton workaround.

Use native controls and small local components first. Do not fork the complete shared UI package during the prototype.

Proof:

- cart survives reload and Router navigation;
- the cart does not leak between SSR requests;
- variant selection updates price, stock, and gallery;
- quantity cannot exceed authoritative visible stock;
- focus and draft input survive frame updates;
- keyed product slots keep client state across reorder;
- mobile navigation and cart remain keyboard accessible.

## Phase 6: Port checkout and order status

### Checkout

Build an app-local Solid 2 checkout form from the shared checkout contract. Keep the current fields, defaults, validation messages, payment choices, and cart-correction behavior.

The submit action must:

1. snapshot the current cart;
2. validate the input inside the server function;
3. call `commerce.checkout.createOrder`;
4. return a safe tagged result;
5. preserve the draft on expected failure;
6. show QPay or bank-transfer instructions on success;
7. link to the private order route with the status token in the fragment.

Do not migrate TanStack Solid Form or TanStack Solid Query into the demo until their Solid 2 compatibility is proven in SSR and the browser. Solid 2 actions and app-local state are the default prototype path.

### Order status

Keep the status token in `location.hash` to preserve the current privacy and caching model. After hydration, call validated server functions for:

- private order lookup;
- status refresh;
- QPay payment refresh;
- bank-transfer claim.

Keep private pages and responses `private, no-store`. Preserve current polling rules, pending labels, expected failure messages, and repeat-safe payment behavior.

Proof:

- real checkout creates a D1 order;
- server authority corrects changed price, inactive variants, and insufficient stock;
- QPay returns real invoice instructions when credentials are configured;
- bank transfer returns configured instructions;
- private status rejects a wrong token;
- repeated payment confirmation does not reduce stock twice;
- bank-transfer claim and Telegram confirmation keep their current behavior.

## Phase 7: Cloudflare caching and deployment

Apply cache policy by ownership:

Public documents:

```text
Cache-Control: public, max-age=0, must-revalidate
Cloudflare-CDN-Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400
```

Private routes, server-function mutations, and webhook responses:

```text
Cache-Control: private, no-store
```

Do not cache complete frame responses publicly until the installed frame protocol and identity semantics are verified. Cache public underlying catalog data or full public documents instead.

Add demo-specific Vite tasks for:

- type generation;
- local migration;
- local seed;
- development migration and seed;
- build;
- Wrangler preview;
- development deploy;
- smoke test;
- rollback.

Do not modify the existing Plugged deployment tasks to point at the Solid Worker.

## Verification matrix

Run the normal repository gates:

```sh
vp install
vp check
vp test
```

Also run app-specific type checking and production build.

Real browser and Worker proof must cover:

- homepage, catalog, product, checkout, order, and not-found direct loads;
- back and forward navigation;
- rapid filter and product navigation;
- zero frame boot refetch;
- streamed SSR through local Wrangler and deployed Cloudflare;
- cart reload and navigation persistence;
- variant, gallery, and quantity behavior;
- checkout expected failures;
- QPay and bank-transfer paths;
- private status token handling;
- repeated payment confirmation;
- webhook signature and admin checks;
- keyboard use, focus preservation, reduced motion, and mobile layout;
- no server-only strings or dependencies in client chunks.

Tests must use real implementations. Do not mock frame transport, hydration, server-function dispatch, D1, payment confirmation, or Router navigation.

## Implementation sequence

Use small reviewable commits:

1. Copy Solid 2 handbook and add Store Kit overrides.
2. Bootstrap turnkey SSR and deploy the empty Worker.
3. Add D1 and KV resources, migrations, seed target, and environment validation.
4. Add Router shell and route placeholders.
5. Add catalog frame and frame runtime tests.
6. Add product frame and purchase slot.
7. Add homepage frame and catalog filters.
8. Add persistent cart, cart sheet, and search.
9. Add checkout actions and result UI.
10. Add private order status and payment actions.
11. Route existing webhooks and run financial invariant tests.
12. Run full local and deployed parity verification.

## Completion criteria

The demo is complete when:

- it deploys as an independent Cloudflare Worker;
- it uses dedicated D1 and CACHE bindings;
- it uses the existing migrations and seed data;
- it calls shared commerce operations directly from server functions;
- external webhooks still use the shared Elysia API;
- all current customer-visible Plugged behavior works;
- public catalog content uses frames without duplicate boot fetches;
- client cart, focus, inputs, and keyed slot state survive frame updates;
- private and mutation responses are not cached publicly;
- real checkout and payment invariants pass;
- the current Astro `apps/plugged` app remains deployable and unchanged;
- the final review records exact prerelease versions and known experimental risks.

Only after this proof should we decide whether to migrate `apps/plugged`, update `docs/product-preferences.md`, or adapt shared UI and storefront packages to Solid 2.
