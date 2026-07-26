# Implementation playbook

This file describes the verified beta shape. Recheck the installed package types and changelogs before implementation.

## 1. Pin the toolchain

Example with pnpm:

```bash
pnpm add solid-js@2.0.0-beta.26 @solidjs/web@2.0.0-beta.26 @solidjs/router@1.0.0-next.9
pnpm add -D vite vite-plugin-solid@3.0.0-next.16 typescript
```

`vite-plugin-solid@3.0.0-next.16` depends on `@dom-expressions/compiler@0.50.0-next.29`. Do not manually force the compiler to a different `next` version without testing compatibility.

Check current tags first:

```bash
npm view solid-js dist-tags --json
npm view @solidjs/web dist-tags --json
npm view @solidjs/router dist-tags --json
npm view vite-plugin-solid dist-tags --json
npm view vite-plugin-solid@next dependencies peerDependencies --json
```

## 2. TypeScript configuration

Solid 2 moves DOM JSX ownership to `@solidjs/web`.

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@solidjs/web",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "strict": true
  }
}
```

Do not use `jsxImportSource: "solid-js"` from Solid 1 examples.

## 3. Turnkey Vite configuration

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

Important distinctions:

- `ssr: true` enables SSR compilation but expects authored entries and a server.
- `ssr: {}` enables turnkey SSR with generated entries and a web-standard production handler.
- `serverFunctions: true` enables server functions.
- `serverFunctions: { components: true }` also enables experimental component results.

With generated entries, the plugin installs:

- the server-function endpoint;
- server result transforms;
- document frame rendering;
- frame bootstrap code;
- the client frame installer;
- streaming SSR;
- production client and server builds.

Prefer generated entries for the first prototype.

## 4. Minimal application

```tsx
// src/App.tsx
import { Loading } from "solid-js";
import { dynamic } from "@solidjs/web";

import { getGreeting } from "./greeting";

export default function App() {
  const Greeting = dynamic(() => getGreeting("world"));

  return (
    <Loading fallback={<p>Loading…</p>}>
      <Greeting emphasis={(props) => <strong>{props.children}</strong>} />
    </Loading>
  );
}
```

```tsx
// src/greeting.tsx
export async function getGreeting(name: string) {
  "use server";

  const generatedAt = new Date().toISOString();

  return (props) => (
    <main>
      <h1>Hello, {name}</h1>
      <p>Rendered at {generatedAt}</p>
      <props.emphasis>Interactive position</props.emphasis>
    </main>
  );
}
```

This example proves compilation and frame transport. It does not prove routing, mutation behavior, stale responses, or deployment.

## 5. Manual entry wiring

Only use manual entries when the generated setup cannot meet a real requirement.

Client:

```tsx
import { hydrate } from "@solidjs/web";
import { installServerComponents } from "@solidjs/web/frames";

import App from "./App";

installServerComponents();
hydrate(() => <App />, document.getElementById("app")!);
```

Server configuration:

```ts
import { configureServerFunctionsServer } from "@solidjs/web/server-functions/server";
import { frameTransformDirectResult, frameTransformResult } from "@solidjs/web/frames/server";

configureServerFunctionsServer({
  transformResult: frameTransformResult,
  transformDirectResult: frameTransformDirectResult,
});
```

Document rendering also needs `ServerComponentPlugin` and `SERVER_COMPONENT_BOOTSTRAP`. Read the installed server-component RFC before authoring this code. Missing one part can cause initial client fetches or failed adoption.

## 6. Cloudflare Worker shape

Keep the Worker adapter minimal:

```ts
import { handleRequest } from "../dist/server/server.js";

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/assets/")) {
      return env.ASSETS.fetch(request);
    }

    return handleRequest(request);
  },
};
```

Adapt asset dispatch to the generated manifest and Cloudflare Workers Assets behavior used by the project. Do not manually recreate frame transforms, hydration scripts, or server-function manifests in the Worker wrapper.

## 7. Router Next shape

Router 1.0 Next uses a factory and route configuration. Treat the installed README as canonical.

```tsx
import { createRouter } from "@solidjs/router";

import Home from "./routes/Home";
import Product from "./routes/Product";

export const Router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/products/:slug", component: Product },
  ],
});
```

The 1.0 line removes the old component-based Router API. Do not generate new `<Router><Route /></Router>` code from Router 0.x tutorials.

Current Next features include typed path proxies. Use them instead of hand-building paths when practical.

## 8. Read patterns

### Server-only route content

Use a server component when the client does not need the source data:

```tsx
export async function getProfile(username: string) {
  "use server";

  const profile = await database.profile.find(username);

  return (props) => (
    <article>
      <h1>{profile.displayName}</h1>
      <p>{profile.biography}</p>
      <props.follow profileId={profile.id} following={profile.following} />
    </article>
  );
}
```

### Cached reusable reads

Use Router `query()` when the value itself is client-consumed, deduped, or invalidated across routes. Current Router Next makes server-function queries use GET transport.

Do not put the same read in both a server component and a Router query unless the two consumers need separate ownership.

### Client-only remote state

Use one selected query/cache owner. TanStack Query remains valid when its feature set is needed. Do not automatically add it only for SSR handoff.

## 9. Mutation pattern

The body validates network input:

```tsx
export async function renameProject(form: FormData) {
  "use server";

  const id = form.get("id");
  const name = form.get("name");

  if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") {
    return {
      ok: false as const,
      message: "Enter a project name.",
    };
  }

  await database.projects.rename(id, name.trim());

  return {
    ok: true as const,
  };
}
```

Use plain serializable error values for expected failures. Use the project's selected schema library when validation is larger.

Wire mutations through Router or Solid actions so optimistic state, refresh, redirect, and submissions have one owner.

## 10. Progressive forms

Server-function references expose self-describing action URLs. Router Next owns the no-JS submission convention and flash result handling.

Prove all of these behaviors:

- Native form submission with JavaScript disabled.
- Validation result after redirect.
- User-entered values remain available after an error.
- Successful redirect.
- Scripted submission.
- Duplicate submission protection for non-idempotent work.

Do not treat “the form has an action attribute” as sufficient proof.

## 11. Solid 2 rules agents often miss

### Imports

```tsx
// Correct Solid 2 web imports
import { hydrate, dynamic } from "@solidjs/web";

// Correct Solid 2 stores
import { createStore, snapshot } from "solid-js";
```

Do not use `solid-js/web` or `solid-js/store` from Solid 1 examples.

### Reactive reads

Do not destructure reactive props at component setup:

```tsx
// Wrong
function Title({ name }: { name: string }) {
  return <h1>{name}</h1>;
}

// Correct
function Title(props: { name: string }) {
  return <h1>{props.name}</h1>;
}
```

### Batching

Setters become visible after the microtask batch flushes:

```ts
setCount(1);
count(); // can still be the previous committed value
```

Use `flush()` only when imperative code or a test requires an immediate commit.

### Effects

Solid 2 effects split compute and apply:

```tsx
createEffect(
  () => props.title,
  (title) => {
    document.title = title;
  },
);
```

Do not copy Solid 1 effect-derived-state patterns.

### Lifecycle

Use `onSettled` instead of `onMount` for the migrated lifecycle role. Return cleanup when possible.

### Control flow

- `<Loading>` replaces `<Suspense>` for async readiness.
- `<Errored>` replaces the primary `ErrorBoundary` role described by the beta migration guide.
- `Index` is removed. Use `<For keyed={false}>`.
- `dynamic(source)` returns a stable component factory.

### Stores

Prefer draft updates:

```ts
setStore((draft) => {
  draft.profile.name = nextName;
});
```

Use `snapshot(store)` when a plain value is required.

## 12. Dependency rules

Do not assume a package is compatible because its TypeScript declarations compile.

A Solid 1 package can depend on:

- old JSX runtime imports;
- old owner behavior;
- synchronous setter visibility;
- old effect timing;
- `createResource`;
- old control-flow callback shapes;
- old renderer package paths.

Test every critical UI primitive in SSR, hydration, navigation, and cleanup.

For the first prototype, prefer:

- native forms;
- `<dialog>` where suitable;
- native details/summary;
- local popover logic only when needed;
- small project-owned controls;
- no broad copied component registry.

## 13. Cache rules

Separate three caches:

1. CDN document and asset cache.
2. Server-side data/result cache.
3. Client query cache.

They have different owners and invalidation rules.

Do not assume POST frame calls are cacheable. Router `query()` can use GET for data reads, but a server component has frame identity and transport semantics that must be verified before caching complete frame responses. Caching the underlying public data is safer.

## 14. Upgrade process

For every prerelease upgrade:

1. Record current versions.
2. Read Solid, web, Router, plugin, and compiler changelogs.
3. Create a dedicated upgrade branch.
4. Update all coupled packages together.
5. Reinstall from a clean dependency directory if resolution looks wrong.
6. Run type checking and the full browser matrix.
7. Inspect initial network requests.
8. Check direct reload and no-JS forms.
9. Check stale-response behavior.
10. Compare client and response sizes.
11. Keep the previous deployment available for rollback.

Do not use automated dependency updates for these prereleases without manual review.
