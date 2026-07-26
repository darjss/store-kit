# Sources

Last checked: 2026-08-06

## Primary source commits

These commits were inspected locally through BTCA checkouts.

| Repository        | Commit                                     |
| ----------------- | ------------------------------------------ |
| Solid             | `595ec2536ddfda5cf705b6a3e0ab59f899c60f71` |
| dom-expressions   | `8e4da2be86485e98fa06ee7cac3d7896a7c9f62e` |
| Solid Router      | `50aad931dcd8be5d509887fb0d4aacd70f48be66` |
| vite-plugin-solid | `809a9e7f1c5eb008f5ec6bc0b97f38826ffad060` |

## Solid 2 documents

- [Migration guide](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/documentation/solid-2.0/MIGRATION.md)
- [Async data RFC](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/documentation/solid-2.0/05-async-data.md)
- [Actions and optimistic updates RFC](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/documentation/solid-2.0/06-actions-optimistic.md)
- [Server functions RFC](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/documentation/solid-2.0/10-server-functions.md)
- [Server components RFC](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/documentation/solid-2.0/11-server-components.md)
- [`@solidjs/web` changelog](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/packages/solid-web/CHANGELOG.md)

Follow cross-references from the migration guide when implementing other changed behavior such as stores, effects, JSX ownership, control flow, and diagnostics.

## Frame implementation documents

- [Server components implementation guide](https://github.com/ryansolid/dom-expressions/blob/8e4da2be86485e98fa06ee7cac3d7896a7c9f62e/docs/server-components.md)
- [Frame streams RFC](https://github.com/ryansolid/dom-expressions/blob/8e4da2be86485e98fa06ee7cac3d7896a7c9f62e/docs/frame-streams-rfc.md)

These files define the deeper wire and ownership contract. Application code should not depend directly on wire details unless it is implementing framework integration.

## Official examples

- [Server-component Hacker News example](https://github.com/solidjs/solid/tree/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews)
- [Server functions and returned components](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews/src/data.jsx)
- [Client slots and state preservation](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews/src/app.jsx)
- [Client entry](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews/src/entry-client.jsx)
- [Server entry](https://github.com/solidjs/solid/blob/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews/src/entry-server.jsx)
- [SSR SPA comparison](https://github.com/solidjs/solid/tree/595ec2536ddfda5cf705b6a3e0ab59f899c60f71/examples/hackernews-spa)

The Hacker News example uses low-level esbuild wiring to demonstrate that frames do not require Vite or a metaframework. For a new Vite project, prefer the turnkey plugin configuration.

## Router Next

- [Solid Router repository](https://github.com/solidjs/solid-router)
- [Router README at inspected commit](https://github.com/solidjs/solid-router/blob/50aad931dcd8be5d509887fb0d4aacd70f48be66/README.md)
- [Router changelog at inspected commit](https://github.com/solidjs/solid-router/blob/50aad931dcd8be5d509887fb0d4aacd70f48be66/CHANGELOG.md)

The `1.0.0-next` API is different from stable Router 0.x. Search results often return obsolete examples.

## Vite plugin

- [vite-plugin-solid repository](https://github.com/solidjs/vite-plugin-solid)
- [README at inspected commit](https://github.com/solidjs/vite-plugin-solid/blob/809a9e7f1c5eb008f5ec6bc0b97f38826ffad060/README.md)

The inspected plugin documents:

- turnkey `ssr: {}`;
- generated client and server entries;
- `handleRequest(Request)` production output;
- server functions;
- `serverFunctions: { components: true }`;
- native compiler default;
- authored-entry escape hatches.

## npm verification commands

```bash
npm view solid-js dist-tags version --json
npm view @solidjs/web dist-tags version --json
npm view @solidjs/router dist-tags version --json
npm view vite-plugin-solid dist-tags version --json
npm view vite-plugin-solid@next dependencies peerDependencies --json
npm view @dom-expressions/compiler dist-tags version --json
```

Do not infer compatibility only from `next` tags. Check plugin dependencies and peer ranges.

## Related framework sources for comparison

### React Server Components

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

The official Next.js documentation describes the RSC payload as a compact representation of the rendered server-component tree with client placeholders and module references.

### Qwik

- [Qwik resumability](https://qwik.dev/docs/concepts/resumable/)
- [Thinking in Qwik](https://qwik.dev/docs/concepts/think-qwik/)
- [Qwik FAQ](https://qwik.dev/docs/faq/)

Qwik serializes the listeners, framework state, and application state required to resume without eager hydration. It is a related but different solution.

### Marko

- [Why Marko is fast](https://markojs.com/docs/explanation/why-is-marko-fast)

Marko is an important compiler-driven SSR, streaming, and partial-hydration predecessor. Use current Marko documentation if it becomes a serious project alternative.

## Source cautions

- Solid server components are experimental even though they ship in npm packages.
- Exact frame markup is not a stable public application API.
- npm `latest` is not the desired tag for every package in this beta stack.
- The official Solid documentation can move faster than third-party tutorials.
- Router Next can change between patch prereleases.
- A code example that imports from `solid-js/web` is a Solid 1 example unless it explicitly explains a compatibility layer.
