## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Tests

Tests must exercise real behavior. Never add mocks, stubs, fake implementations, placeholder assertions, or tests that only prove the mock setup. If a useful test cannot run against the real implementation, do not add that test.

## Coding conventions

- Read `docs/product-preferences.md` before changing architecture, data flow, commerce, or storefront UI.
- Prefer `~/` for package-local `src` imports only when package tooling safely preserves or
  rewrites it for consumers. Source-export packages must use consumer-safe relative imports.
  Short same-folder `./` imports remain allowed. Do not add multi-level parent imports.
- Use plain feature namespaces for database queries, commerce operations, and TanStack query options.
- Use TypeID with a stable entity prefix for every database entity ID.
- Put browser-safe cross-layer schemas and types in `@store-kit/contracts`. Never import database types into client code.
- Use Dismatch for exhaustive tagged-union matches, Better Result for fallible pipelines, and es-toolkit `flow` for reusable pure composition.
- Use the current TanStack Solid Query `useQuery` API and `useQueryResult`. Do not add new `createQuery` calls.
- Use TanStack Form with shared TypeBox contracts and `@store-kit/ui` Zaidan controls for forms.
- Use Tailwind for all application styling. Do not add ordinary page or component selector blocks.
- Use Unpic with Cloudflare Image Transformations for product images.
- Keep provider credentials in Cloudflare secrets. Validate external responses with TypeBox and never expose secrets, tokens, or raw provider bodies.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
