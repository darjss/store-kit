# Store Kit Solid 2 notes

These rules override project-specific choices copied from the Roast Your Taste handbook.

## Baseline

The first demo app is `apps/demo-solid-store`. It implements the selected ДУНД wardrobe direction side by side with `apps/plugged`. Keep `apps/plugged` deployable until the demo passes its full proof matrix.

Use the exact package group recorded in [README](README.md). The workspace catalog still selects Solid 1 for existing applications, so the demo app must pin Solid 2 directly.

## Store Kit choices

- Use shared TypeBox contracts. Do not add Valibot.
- Call `@store-kit/commerce` directly inside server functions.
- Keep Elysia for external QPay and Telegram webhook routes.
- Return safe tagged transport values to client code. Do not return Better Result instances.
- Use the existing Drizzle schema, migrations, TypeIDs, and seed data.
- Keep provider credentials in Cloudflare secrets.
- Keep product media on its R2 custom domain. Do not proxy images through the storefront Worker.

## Solid 1 package boundary

These packages currently target Solid 1 and are not browser dependencies of the Solid 2 demo:

- `@store-kit/storefront`;
- `@store-kit/ui`;
- their Kobalte, TanStack Solid, and Solid Primitives dependencies.

Use app-local Solid 2 components and native controls. Move a framework-free helper to a browser-safe package when reuse is useful. Do not load two Solid runtimes into one client application.

## Frame ownership

Use frames for server-owned homepage, catalog, and product content. Use client components for the cart, gallery interaction, checkout draft, and private order status. A frame is not a replacement for every data call.

Keep server content as HTML. Send a client slot only the data required for its interaction.

## Turnkey reference

Use the pinned example at:

```text
/home/darjs/dev/scratchpad/solidv2-research/upstream/vite-plugin-solid/examples/turnkey/
```

Important files:

- `vite.config.ts` — turnkey SSR and frame configuration;
- `src/frames/FramesApp.tsx` — stable `dynamic()` boundaries;
- `src/frames/data.tsx` — server functions that return components;
- `server.js` — generated `handleRequest` contract;
- `test/run.mjs` — SSR, hydration, server-function, frame, and bundle-leak proof.

Do not copy the example's `any` types or Node adapter. The Cloudflare adapter can call `handleRequest(Request)` directly.

## Plan

The implementation plan is [plans/004-solid2-fashion-store.md](../../plans/004-solid2-fashion-store.md).
