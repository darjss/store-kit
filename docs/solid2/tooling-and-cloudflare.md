# Tooling and Cloudflare

## Project commands

```bash
vp dev
vp check
vp lint
vp fmt
vp build
pnpm preview
pnpm deploy
```

The development server uses turnkey Vite SSR. HTML requests must advertise `Accept: text/html`. A plain curl request with `Accept: */*` can fall through to Vite and return 404 even when browser SSR works.

Use this smoke request:

```bash
curl -H 'Accept: text/html' http://localhost:5173/
```

## Vite configuration

```tsx
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    solid({
      ssr: { app: "src/App.tsx" },
      serverFunctions: {
        components: true,
      },
    }),
  ],
});
```

The object form of `ssr` enables turnkey serving. `ssr: true` only enables historical SSR transforms and expects authored entries.

`serverFunctions: { components: true }` enables server functions and experimental component results.

## Generated application shape

There is no `index.html`, client entry, or server entry in application source. The plugin generates:

- the client hydration entry;
- the streaming server entry;
- the HTML document shell;
- hydration bootstrap;
- server-function endpoint handling;
- frame installation;
- the production request handler.

A build creates:

```text
dist/client/
dist/server/server.js
```

The server bundle exports a web-standard `handleRequest(Request)` function.

Do not manually rebuild server-function manifests, frame transforms, bootstrap scripts, or hydration wiring.

## Vite+ role

Vite+ provides the project CLI, formatter, linter, build command, and package workflow. It accepts standard Vite configuration and plugins.

The project also keeps Vite as a direct dependency because `vite-plugin-solid` declares Vite as a peer and imports its APIs.

Vite+ and the direct Vite dependency can resolve different Vite patch versions. Builds currently pass, but inspect both versions when diagnosing plugin behavior.

## Type checking caveat

`vp check` currently proves formatting and linting. Do not assume it performs a complete `tsc --noEmit` pass unless Vite+ type checking is explicitly configured and verified.

When adding a separate typecheck command, account for:

- Node types used by build configuration;
- DOM types used by client modules;
- Cloudflare Worker binding types;
- prerelease package declaration requirements;
- `ESNext.Disposable` declarations used by modern tooling.

Do not hide application errors with broad type assertions.

## Worker adapter

`worker.js` imports the generated handler:

```js
import { handleRequest } from "./dist/server/server.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/assets/")) {
      return env.ASSETS.fetch(request);
    }

    return handleRequest(request);
  },
};
```

Request flow:

```text
/assets/* → Cloudflare static assets
/_server  → generated server-function handler
all pages → generated streaming SSR handler
```

Return the generated response directly to preserve streaming.

## Build before Wrangler

`worker.js` imports `dist/server/server.js`, so Wrangler needs a completed Solid build first. Project scripts enforce this:

```text
preview = vp build && wrangler dev
deploy  = vp build && wrangler deploy
```

Running `wrangler dev` directly from a clean checkout can fail because `dist/server/server.js` does not exist.

## Static assets

The current adapter forwards only `/assets/*` to the `ASSETS` binding. When adding `/favicon.ico`, `/robots.txt`, or root-level public files, update asset handling or use an assets-first configuration.

`run_worker_first: true` sends every request through Worker code before static handling. This is simple for the MVP but can be adjusted when traffic patterns justify it.

## Environment bindings

Add private values to `.dev.vars` and production secrets through Wrangler:

```bash
wrangler secret put FIRECRAWL_API_KEY
```

Keep `.dev.vars.example` synchronized without real values.

Access bindings only from server-only code. Validate required bindings at the boundary and fail with a safe operational error.

## Debugging sequence

When SSR fails:

1. Check the exact pinned package versions.
2. Run `vp build` and inspect both output directories.
3. Request HTML with `Accept: text/html`.
4. Inspect the browser console and Vite terminal.
5. Verify `/_server` reaches generated middleware.
6. Search client chunks for a distinctive server-only string.
7. Test the production handler through Wrangler, not only Vite.
8. Compare behavior with the pinned turnkey example.

## Upgrade process

1. Create a dedicated branch.
2. Record all coupled versions.
3. Read Solid, Web, Router, plugin, and compiler changelogs.
4. Upgrade the coupled set together.
5. Reinstall cleanly if package resolution is suspicious.
6. Run checks and build.
7. Verify initial SSR and direct reload.
8. Verify no initial frame refetch.
9. Verify actions and no-JavaScript forms when present.
10. Verify Cloudflare streaming and rollback capability.

Do not allow automated dependency updates to merge prerelease upgrades without this review.
