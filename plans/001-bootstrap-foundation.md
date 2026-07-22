# Bootstrap the Store Kit foundation

## Objective

Convert the Astro starter into a small monorepo foundation for Store Kit.

The bootstrap must prove these boundaries without implementing the store:

- `apps/plugged` is the first store and dogfood application.
- Astro 7 and Elysia run in one Cloudflare Worker.
- Elysia runs with AOT disabled.
- Shared packages have clear dependency directions.
- Better Result can move a typed `Result` through Eden without route-specific error translation.
- Solid code can consume shared TanStack Query option factories.
- Zaidan provides the shared UI foundation.
- Vite+ checks the full workspace.

Do not implement catalog management, checkout, authentication, payments, Telegram approval, deployment automation, or product import in this plan.

## Constraints

- Keep the implementation procedural and functional.
- Do not add classes unless a library requires them.
- Do not use MVC names or structure.
- Do not create generic repository, controller, or service abstractions.
- Do not add tests for imaginary edge cases.
- Add only one contract test when it proves the serialized Result boundary.
- Infer TypeScript types from Drizzle, TypeBox, Elysia, Eden, and Better Result.
- Do not use `as any`.
- Use Vite+ for package management and validation.
- Keep Plugged visually empty during bootstrap. Do not move the old Plugged UI yet.

## Target workspace

```text
store-kit/
├─ apps/
│  └─ plugged/
│     ├─ src/
│     │  ├─ fetch.ts
│     │  ├─ layouts/
│     │  ├─ pages/
│     │  └─ styles/
│     ├─ astro.config.mjs
│     ├─ package.json
│     ├─ store.json
│     └─ wrangler.jsonc
├─ packages/
│  ├─ config/
│  ├─ db/
│  ├─ commerce/
│  ├─ api/
│  ├─ storefront/
│  ├─ ui/
│  ├─ admin/
│  └─ tooling/
├─ plans/
├─ docs/
├─ package.json
├─ pnpm-workspace.yaml
└─ vite.config.ts
```

`admin` and `tooling` can contain only package metadata and an entry point during bootstrap. Do not design their full APIs yet.

## Package boundaries

### `@store-kit/config`

Own the deploy-time store configuration contract.

For bootstrap, define only:

- store ID
- store name
- public base URL

The platform is Mongolia-only. Use `mn-MN` and `MNT` as shared constants, not per-store configuration.

Use TypeBox for the schema and infer the TypeScript type from it.

Do not add catalog, payment, delivery, or theme configuration yet.

### `@store-kit/db`

Own:

- the Cloudflare D1-backed Drizzle client
- Drizzle table schemas
- generated TypeBox schemas
- domain-sized database query files

The database client can import `env.DB` from `cloudflare:workers` and export `db` directly. Query files import that shared server-only client:

```ts
import { db } from "../client";
```

Do not pass `db` through every operation and do not add a `createDatabase(env.DB)` call in routes.

Use Drizzle's built-in TypeBox integration:

```ts
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/typebox";
```

Do not install a separate Drizzle schema package.

Do not create commerce tables during bootstrap. The first real schema belongs to the catalog implementation plan.

### `@store-kit/commerce`

Own business operations and their Result error unions.

Use this naming:

- `queries` for reusable Drizzle access in `@store-kit/db`
- `operations` for business workflows in `@store-kit/commerce`
- `adapters` for external systems
- `routes` and `webhooks` for HTTP in `@store-kit/api`
- `query-options` for TanStack Query factories

During bootstrap, include one small system operation that returns both success and failure variants. Its purpose is to prove the Result transport contract. Keep it separate from future commerce domains.

Errors that cross the network must be plain serializable tagged unions. Do not depend on error prototypes or `instanceof` across JSON.

### `@store-kit/api`

Own:

- the Elysia application
- Elysia routes
- the Eden `App` type
- shared Result transport helpers
- future authentication and webhook mounts

Configure Elysia with:

```ts
new Elysia({ aot: false });
```

The API package depends on `commerce`. It must not contain Drizzle queries or storefront state.

Expose a bootstrap system route that returns:

```ts
Result.serialize(result);
```

Do not map each Result error to a handwritten HTTP error body. Expected operation failures travel as `SerializedResult<T, E>`. Unexpected runtime and transport failures remain real HTTP failures.

### `@store-kit/storefront`

Own headless Solid commerce behavior.

During bootstrap, include:

- the Eden client setup
- one generic Result deserialization helper
- one named TanStack Query option factory for the system route

Export option factories directly:

```ts
export const systemStatusOptions = () => queryOptions({ ... });
```

Do not create one global nested query object.

A resolved `Result.err` is TanStack Query data, not a TanStack Query failure. `query.isError` is reserved for transport and unexpected failures.

### `@store-kit/ui`

Own copied and customized Zaidan components and shared design tokens.

Initialize Zaidan as a registry, not an npm runtime package, with these choices:

- primitive: Kobalte
- style: Vega
- base color: neutral
- theme: neutral
- chart color: neutral
- body font: Inter
- heading font: Inter
- radius: default
- menu accent: subtle

Add only the minimum component needed to prove package imports, such as Button. Do not install the full component registry.

Use Tailwind CSS 4. Keep token changes small during bootstrap.

## Application wiring

### Move the starter into `apps/plugged`

Move the current Astro application into `apps/plugged`. Keep the root for workspace configuration.

Delete Astro starter artwork and welcome content. Replace it with a plain foundation page that identifies Plugged and shows the system Result state.

Do not copy the old `~/dev/plugged` product data or UI during this plan.

### Mount Elysia in Astro

Use Astro 7 advanced Fetch routing in `apps/plugged/src/fetch.ts`.

The request flow is:

```text
Cloudflare Worker
  → Astro Fetch state
  → /api/* goes to the shared Elysia app
  → all other paths continue through Astro
```

The Cloudflare adapter must continue to provide static assets, bindings, and Astro rendering.

### Cloudflare bindings

Declare the bindings that the foundation will need:

- `DB` for D1
- `CACHE` for shared cache data
- `AUTH_KV` for future Better Auth secondary storage
- `MEDIA` for R2

Do not implement resource provisioning in bootstrap. Keep Wrangler configuration ready for later automatic provisioning.

Run Wrangler type generation after binding changes.

## Result transport contract

Use Better Result's built-in RPC support.

Server:

```ts
return Result.serialize(result);
```

Client:

```ts
return Result.deserialize<Value, Failure>(response.data);
```

The wire type must be:

```ts
type SerializedResult<Value, Failure> =
  { status: "ok"; value: Value } | { status: "error"; error: Failure };
```

Use plain tagged error data:

```ts
type SystemError = {
  _tag: "SystemUnavailable";
  message: string;
};
```

Do not add:

- a client API error class
- an API error-code registry
- per-route error translators
- duplicate error envelopes
- error prototype hydration

Add one focused test that serializes and deserializes both Result variants and preserves their inferred union. This test proves the cross-package contract. Do not create a broad error test suite.

## Bootstrap dependencies

Install dependencies in the package that owns them. Do not put all runtime dependencies in the workspace root.

Foundation dependencies include:

- Astro and `@astrojs/cloudflare`
- SolidJS and `@astrojs/solid-js`
- Tailwind CSS 4 and `@tailwindcss/vite`
- Elysia and Eden
- Drizzle ORM and Drizzle Kit
- TypeBox
- Better Result
- TanStack Solid Query
- Zaidan-selected Kobalte dependencies

Do not install Better Auth, TanStack Form, `@solid-primitives/storage`, Unpic, Solar icons, Dismatch, es-toolkit, TanStack Table, Ky, QPay code, or Telegram code until a bootstrap file uses them. They remain approved later choices in `docs/product-preferences.md`.

## Implementation sequence

1. Convert the root package into a private workspace.
2. Move the Astro app into `apps/plugged`.
3. Add workspace package manifests and TypeScript configuration.
4. Add `@store-kit/config` with the small `store.json` contract.
5. Add the server-only `@store-kit/db` package and D1 client, without commerce tables.
6. Add the bootstrap operation to `@store-kit/commerce`.
7. Add the Elysia app and serialized Result route to `@store-kit/api`.
8. Add `apps/plugged/src/fetch.ts` and mount `/api/*`.
9. Add `@store-kit/storefront` with the Eden request, Result deserialization, and one query-option factory.
10. Initialize `@store-kit/ui` from the selected Zaidan registry and add one component.
11. Render the foundation state on the Plugged index page.
12. Add empty, valid `admin` and `tooling` package entry points.
13. Generate Cloudflare binding types.
14. Run all workspace validation commands.

## Validation

Run:

```sh
vp install
vp check
vp test
vp run -r build
```

Also run any workspace task added for Wrangler type generation.

Verify locally in the Cloudflare `workerd` runtime:

- the Plugged page renders
- static assets load
- `/api/health` or its system equivalent reaches Elysia
- Elysia runs with AOT disabled
- the page receives and deserializes a successful Result
- the focused contract test proves the error variant
- no server-only package enters the browser bundle

## Completion criteria

The bootstrap is complete when:

- the repository is a valid Vite+ workspace
- Plugged is the first Astro application
- one Worker contains Astro and Elysia
- package dependencies follow the documented direction
- the serialized Better Result contract works through Eden
- TanStack Query consumes a named shared option factory
- the Zaidan UI package works from the Plugged app
- D1, KV, and R2 bindings are typed
- all validation commands pass
- no out-of-scope commerce feature was implemented
