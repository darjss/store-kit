---
name: solidjs-2-beta
description: Build and review Solid 2 beta applications with correct async computations, owner-based reactivity, Router 1.0 Next, core server functions, actions, SSR, and experimental frame-streamed server components. Use whenever code imports Solid 2 prereleases, `@solidjs/web`, `@solidjs/router@next`, `vite-plugin-solid@next`, uses `"use server"`, returns components from server functions, migrates from Solid 1, or needs server/client ownership decisions for a Solid 2 application.
---

# Solid 2 beta

Solid 2 is not Solid 1 with renamed imports. Its async, scheduling, effects, stores, router, server functions, and DOM ownership changed. Treat the installed prerelease as the source of truth.

## Process

### 1. Lock the baseline

Before editing, inspect:

- `package.json` and the lockfile;
- exact `solid-js`, `@solidjs/web`, `@solidjs/router`, and `vite-plugin-solid` versions;
- plugin dependencies and peer ranges;
- project instructions;
- deployment runtime;
- existing state, router, form, and remote-data owners.

Read [`../../../docs/solid2/README.md`](../../../docs/solid2/README.md), [`../../../docs/solid2/store-kit-notes.md`](../../../docs/solid2/store-kit-notes.md), and the inspected commits in [`../../../docs/solid2/sources.md`](../../../docs/solid2/sources.md). If installed versions differ, read their changelogs and types before using the pinned examples.

**Complete when:** every framework package has an exact known version and every affected data or state category has one named owner.

### 2. Select the architecture branch

Use the smallest branch that meets the product requirement:

- **Client branch:** local reactivity and client rendering only.
- **SSR branch:** initial server rendering without server components.
- **Data branch:** Router `query()` or one selected client cache owns reusable client-consumed remote data.
- **Server-function branch:** typed RPC, forms, mutation, redirects, or server-only work.
- **Frame branch:** substantial server-owned HTML contains persistent client-owned positions.

Do not add frames only to fetch ordinary client-owned data. Do not add a query cache only to transfer initial server-rendered content.

When choosing or reviewing architecture, read [`../../../docs/solid2/architecture.md`](../../../docs/solid2/architecture.md), [`../../../docs/solid2/decision-guide.md`](../../../docs/solid2/decision-guide.md), and the active implementation plan.

**Complete when:** server inputs, server-owned HTML, client-owned positions, URL state, mutation state, and cache ownership are explicit.

### 3. Load the authoritative branch reference

Read the complete relevant sources before implementation:

- **Any Solid 1 migration:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid/documentation/solid-2.0/MIGRATION.md`.
- **Async computations or loading:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid/documentation/solid-2.0/05-async-data.md`.
- **Actions or optimistic updates:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid/documentation/solid-2.0/06-actions-optimistic.md`.
- **Server functions:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid/documentation/solid-2.0/10-server-functions.md`.
- **Server components:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid/documentation/solid-2.0/11-server-components.md`, then `/home/darjs/dev/scratchpad/solidv2-research/upstream/dom-expressions/docs/server-components.md`.
- **Frame protocol or framework integration:** also read `/home/darjs/dev/scratchpad/solidv2-research/upstream/dom-expressions/docs/frame-streams-rfc.md`.
- **Router work:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/solid-router/README.md` and its current `CHANGELOG.md` entries.
- **Vite SSR, generated entries, or deployment:** `/home/darjs/dev/scratchpad/solidv2-research/upstream/vite-plugin-solid/README.md` and `/home/darjs/dev/scratchpad/solidv2-research/upstream/vite-plugin-solid/examples/turnkey/`.

Use [`../../../docs/solid2/sources.md`](../../../docs/solid2/sources.md) to verify the pinned commits and find matching examples.

**Complete when:** implementation choices match the installed version and no copied example comes from Solid 1 or Router 0.x.

### 4. Implement through owners

Apply all rules in the concept reference below. Keep the change local. Preserve accessors across component and context boundaries. Validate every network input in the server-function body. Keep platform integration thin.

For setup and deployment patterns, read [`../../../docs/solid2/implementation-playbook.md`](../../../docs/solid2/implementation-playbook.md) and [`../../../docs/solid2/tooling-and-cloudflare.md`](../../../docs/solid2/tooling-and-cloudflare.md).

**Complete when:** every reactive read has a tracking scope, every side effect has an owner and cleanup, every network boundary validates input, and no server-owned content is mirrored into a client cache without a client requirement.

### 5. Prove the real behavior

Run the project checks and real runtime tests. For frame or router work, include:

- initial SSR source;
- zero unnecessary frame fetches at boot;
- direct deep reload;
- back and forward;
- stale response rejection;
- input, focus, and local-state preservation;
- keyed slot reorder;
- scripted and no-JS forms;
- production streaming;
- absence of server-only code from client chunks.

Use [`../../../docs/solid2/prototype-test-plan.md`](../../../docs/solid2/prototype-test-plan.md) for the full matrix. Do not mock frame transport, hydration, navigation, or server-function dispatch.

**Complete when:** the affected behavior passes in the real browser and production-like runtime, and the final report states exact versions and any experimental assumptions.

## Core concept reference

### Owners and tracking

A component is a setup function. It does not rerun for normal updates.

Keep changing prop reads in JSX, memos, effects, or callbacks:

```tsx
function Heading(props: { title: string }) {
  return <h1>{props.title}</h1>;
}
```

Do not destructure reactive props at component setup. Use accessors for derived values. Use effects only to synchronize with external systems.

Solid 2 batches updates by microtask. A setter does not guarantee that an immediate read sees the new committed value. Use `flush()` only for a real imperative commit point or a test.

Effects split compute from apply:

```tsx
import { createEffect } from "solid-js";

createEffect(
  () => props.title,
  (title) => {
    document.title = title;
  },
);
```

Return cleanup from the apply function. Use `onSettled` for the migrated mount lifecycle role.

### Renderer ownership

The web renderer owns JSX and DOM APIs:

```tsx
import { dynamic, hydrate, render } from "@solidjs/web";
```

Use this TypeScript setting:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@solidjs/web"
  }
}
```

Stores now come from `solid-js`. Use draft-first setters and `snapshot()` for plain values.

Do not import new code from:

```text
solid-js/web
solid-js/store
```

Important migration map:

| Solid 1                    | Solid 2 beta                                          |
| -------------------------- | ----------------------------------------------------- |
| `mergeProps`               | `merge`                                               |
| `splitProps`               | `omit`                                                |
| `unwrap(store)`            | `snapshot(store)`                                     |
| path-style store setters   | draft-first setter; `storePath()` only when justified |
| `onMount`                  | `onSettled`                                           |
| `Suspense`                 | `Loading`                                             |
| `ErrorBoundary` async role | `Errored`                                             |
| `Index`                    | `For keyed={false}`                                   |
| `createDynamic`            | `dynamic(source)` factory                             |
| `createResource`           | async computation plus `Loading`                      |
| `resource.refetch`         | `refresh(source)`                                     |
| `resource.mutate`          | optimistic signal/store plus action                   |

`createSignal(fn)` and `createStore(fn, seed)` create derived forms. Do not assume a function argument is stored as a plain value.

Solid 2 removed public `use:` directive and `/*@once*/` JSX patterns. Use `ref` directive factories for owned DOM behavior and `untrack()` only for a deliberate one-time JavaScript read. Use normal `class` and `style` values rather than old namespace syntax.

Development mode rejects writes from an owned reactive computation. Derive values instead of using an effect or memo to write application state. Use the narrow `ownedWrite` escape only for an internal primitive that requires it.

### Async graph

Computations can return `Promise` or `AsyncIterable` values:

```tsx
import { Loading, createMemo } from "solid-js"

const profile = createMemo(() => getProfile(userId()))

<Loading fallback={<ProfileSkeleton />}>
  <Profile profile={profile()} />
</Loading>
```

Use:

- `<Loading>` for initial branch readiness;
- `isPending(() => value())` for a changed answer in flight;
- `refresh(value)` to re-ask a derived read;
- `affects(value)` when in-flight work will change that data;
- `latest(value)` to inspect in-flight state;
- `<Errored>` for async/render error ownership.

Do not add `createResource`, `Suspense`, `startTransition`, or `useTransition` to Solid 2 code.

### Control flow and dynamic components

- `Index` is removed. Use `<For keyed={false}>` for positional identity.
- Default `<For>` uses item identity.
- Use a key function for domain-keyed reconciliation when required.
- `dynamic(source)` returns a stable component factory.
- Function children can receive accessors. Check the exact control-flow API before reading them.

### Server functions

A function-level `"use server"` directive extracts the body into the server build:

```tsx
export async function renameItem(input: unknown) {
  "use server";

  const command = parseRenameItem(input);
  await database.items.rename(command);
  return { ok: true as const };
}
```

Treat arguments as hostile network input. TypeScript types do not validate them.

The function body owns per-function server policy:

- validation;
- authentication;
- authorization;
- logging;
- rate limiting;
- database work.

Wrappers around a reference do not wrap HTTP dispatch. Global concerns belong in server handler hooks.

Use `GET()` for declared cacheable reads. Use plain JSON-compatible arguments unless rich arguments are enabled intentionally. Natural single arguments such as `FormData`, `File`, `Blob`, and strings use their HTTP representation. Rich argument support adds client cost and must be configured deliberately.

Use core response helpers for transport intent:

- `respond(value, init)` carries a value with status, headers, or revalidation metadata;
- `redirect(location, init)` requests navigation;
- `reload(init)` requests refresh without a value.

Expected failures should use plain serializable tagged values. A server-function reference has a self-describing `.url` for native form actions. Prove both scripted and no-JS submission; Router owns flash and submission policy.

### Server components and frames

A server component is a component returned from a server function:

```tsx
export async function getArticle(slug: string) {
  "use server";

  const article = await database.articles.findBySlug(slug);

  return (props) => (
    <article>
      <h1>{article.title}</h1>
      <div>{article.body}</div>
      <props.reactions $key={article.id} articleId={article.id} />
      {props.children}
    </article>
  );
}
```

Use it through `dynamic()`:

```tsx
import { Loading } from "solid-js"
import { dynamic } from "@solidjs/web"

const Article = dynamic(() => getArticle(slug()))

<Loading fallback={<ArticleSkeleton />}>
  <Article
    reactions={slot => <ReactionButton articleId={slot.articleId} />}
  >
    <ShareButton />
  </Article>
</Loading>
```

Ownership contract:

```text
server-function arguments → server inputs
returned component props  → client-owned positions
server JSX content         → HTML
client slot arguments      → data records
```

Hard rules:

- There is no `"use client"`.
- There is no `createServerComponent()`.
- Hydration happens only during initial boot.
- Post-boot responses never server-render current client components.
- The same visible server content must not be sent as both HTML and serialized source data.
- A stable `dynamic()` call site preserves the frame boundary.
- The frame morph must treat client slot interiors as opaque.
- `$key` gives repeated slot occurrences domain identity across responses.
- Stale frame versions must not overwrite newer responses.
- Application code must not depend on `<dx-frame>` or wire-marker details.

A client slot can wrap nested server children. This is the key composition pattern, not an edge case.

### Router 1.0 Next

Router 1.0 Next uses route config and a factory:

```tsx
import { lazy } from "solid-js";
import { createRouter } from "@solidjs/router";

export const Router = createRouter({
  routes: [
    { path: "/", component: lazy(() => import("./pages/Home")) },
    { path: "/items/:id", component: lazy(() => import("./pages/Item")) },
  ],
});
```

Render the returned instance as the provider. Its function child is the persistent root layout. Use plain anchors and the typed path proxy.

Do not copy the Router 0.x `<Router>` plus JSX `<Route>` definition API.

Use Router `query()` for reusable cached values consumed by the client. Current Router Next declares GET transport for server-function queries. Use Router actions for submissions, invalidation, redirects, single-flight data, and no-JS policy.

### Actions and optimism

Mutations use `action()`. User-visible speculative state uses `createOptimistic` or `createOptimisticStore`. `refresh()` reconciles with authority.

```tsx
import { action, createOptimisticStore, refresh } from "solid-js";

const [todos, setTodos] = createOptimisticStore(() => getTodos(), []);

const addTodo = action(function* (todo: Todo) {
  setTodos((items) => {
    items.push(todo);
  });

  yield saveTodo(todo);
  refresh(todos);
});
```

Do not use refresh as a saving-state flag. Represent process UI with explicit optimistic state or the Router submission model.

### Vite and platform integration

Prefer the turnkey plugin:

```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solid({
      ssr: {},
      serverFunctions: {
        components: true,
      },
    }),
  ],
});
```

The object form `ssr: {}` generates streaming SSR entries and a production `handleRequest(Request)` handler. With generated entries, frame document wiring is automatic.

Keep platform adapters small. Do not manually recreate manifests, frame transforms, hydration bootstrap, response parsing, identity, or stale-response policy when the plugin owns them.

### Caching

Keep these caches separate:

1. CDN documents and assets.
2. Server data or result cache.
3. Client query cache.

GET server functions and Router queries can use HTTP caching when their semantics allow it. Do not assume complete frame responses are safe to share through a CDN. Cache underlying public data unless the installed frame protocol and identity behavior have been verified.

### Ecosystem compatibility

Assume a Solid 1 package is incompatible until real SSR and browser tests prove otherwise. Type success is not runtime proof.

Preferred order:

1. Compatible upstream package.
2. Native element.
3. Small app-local component.
4. Upstream compatibility fix.
5. Temporary tested fork with a deletion plan.

Do not import a broad Solid 1 component graph into a Solid 2 application.

## Completion standard

A Solid 2 change is not complete until all relevant rules above are satisfied, the installed-version references were checked, real SSR/navigation/form behavior passed, and server-only dependencies were proven absent from the client output.
