# Solid 2 project handbook

This handbook is a reviewed snapshot of the Solid 2 documentation created for Roast Your Taste. Store Kit uses the same pinned prerelease baseline for `apps/demo-solid-store`, with the overrides in [Store Kit notes](store-kit-notes.md). Use it before general search results, which usually describe Solid 1 or Router 0.x.

## Installed baseline

| Package                     | Version          |
| --------------------------- | ---------------- |
| `solid-js`                  | `2.0.0-beta.26`  |
| `@solidjs/web`              | `2.0.0-beta.26`  |
| `@solidjs/router`           | `1.0.0-next.9`   |
| `vite-plugin-solid`         | `3.0.0-next.16`  |
| `@dom-expressions/compiler` | `0.50.0-next.29` |
| Vite                        | `8.0.0`          |
| Vite+                       | `0.2.6`          |

Do not upgrade one package in this group by itself. Read all relevant changelogs and upgrade the group on a separate branch.

## Read by task

| Task                                                | Read                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| Write a component or local state                    | [Core and reactivity](core-and-reactivity.md)                   |
| Load async data or show pending UI                  | [Async data and actions](async-and-actions.md)                  |
| Add a page or URL                                   | [Router](router.md)                                             |
| Read secrets, call Firecrawl, or mutate server data | [Server functions](server-functions.md)                         |
| Return server-rendered report HTML                  | [Server components and frames](server-components-and-frames.md) |
| Build, preview, deploy, or debug                    | [Tooling and Cloudflare](tooling-and-cloudflare.md)             |
| Apply Store Kit-specific rules                      | [Store Kit notes](store-kit-notes.md)                           |
| Inspect the source project's worked recipes         | [Roast Your Taste recipes](roast-your-taste-recipes.md)         |

The copied research references remain available in this directory:

- [Architecture](architecture.md)
- [Decision guide](decision-guide.md)
- [Implementation playbook](implementation-playbook.md)
- [Prototype test plan](prototype-test-plan.md)
- [Primary sources](sources.md)

## Rules that prevent most mistakes

1. Import DOM APIs from `@solidjs/web`, not `solid-js/web`.
2. Set `jsxImportSource` to `@solidjs/web`.
3. Do not destructure reactive props.
4. Do not use `createResource`, `Suspense`, `onMount`, or `Index`.
5. Use `<Loading>`, async computations, `onSettled`, and `<For keyed={false}>`.
6. A setter is not guaranteed to be visible until the microtask batch commits.
7. Use Router 1.0 route configuration and plain `<a>` elements.
8. Validate every server-function argument inside the `"use server"` body.
9. A server component is a component returned from a server function.
10. Do not depend on `<dx-frame>` or frame wire details in application code.

## Ownership checklist

Before writing a feature, name one owner for each value:

| Value                                | Owner                                |
| ------------------------------------ | ------------------------------------ |
| Current URL and route parameters     | Router                               |
| Local input draft                    | Signal or store                      |
| Initial async readiness              | `<Loading>`                          |
| Reusable client-consumed remote data | Router `query()` or one chosen cache |
| Server-only report HTML              | Server component                     |
| Mutation process                     | Action and server function           |
| Optimistic result                    | Optimistic signal or store           |
| Persisted report                     | Server storage                       |

Do not put the same value in a Router query, a local store, and another query cache without a specific reason.
