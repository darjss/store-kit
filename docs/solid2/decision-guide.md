# Decision guide

## 1. Start with the product, not the framework

Write one paragraph that answers:

- What does the user create, consume, or share?
- Which route is the viral loop?
- Which state must survive navigation?
- Which data is public?
- Which data is private?
- Which features must work without JavaScript?
- Which parts need live client interaction?
- What is the expected launch lifetime: one weekend, several months, or a long-term product?

Do not choose server components only because they are new.

## 2. Fast decision matrix

Score each statement from 0 to 2:

- `0`: false
- `1`: partly true
- `2`: strongly true

### Solid 2 server-component fit

| Question                                                     | Score |
| ------------------------------------------------------------ | ----: |
| The product has several interactive routes.                  |       |
| Navigation should preserve local state.                      |       |
| Most route content can render on the server.                 |       |
| Small client controls need to sit inside server content.     |       |
| Server-only code or private data access matters.             |       |
| The initial route should render without a client data fetch. |       |
| No-JS forms or progressive enhancement matter.               |       |
| The owner accepts prerelease API changes.                    |       |
| The owner can avoid incompatible Solid 1 UI packages.        |       |
| The owner can add browser tests for framework behavior.      |       |

Interpretation:

- `16–20`: Strong Solid 2 server-component candidate.
- `11–15`: Build a one-day vertical prototype before deciding.
- `6–10`: Prefer a simpler Solid SPA, SSR app, or Astro.
- `0–5`: Server components are probably unnecessary.

### Astro fit

| Question                                                            | Score |
| ------------------------------------------------------------------- | ----: |
| The product is mainly content or landing pages.                     |       |
| Interactive widgets are independent.                                |       |
| Full-page navigation is acceptable.                                 |       |
| Static generation or complete-document caching covers most traffic. |       |
| Mature integrations matter more than persistent app state.          |       |
| The project needs an established component ecosystem now.           |       |
| Most behavior can use forms and links.                              |       |
| The product might be discarded after the experiment.                |       |

A high Astro score does not forbid Solid. It means frames may add more risk than value.

## 3. Choose among three practical architectures

### Option A: Astro plus Solid 1 islands

Choose this when:

- routes are mostly complete documents;
- interactive areas are small and independent;
- full document caching is a major advantage;
- the app can tolerate island prop serialization;
- mature integrations are important;
- the idea needs the fastest reliable launch.

Main risks:

- awkward server-data handoff to islands;
- duplicated data for hydrated props;
- separate Solid owner roots;
- state recovery across MPA navigation;
- pressure to add a client router later.

### Option B: Solid 2 client application with SSR and server functions

Choose this when:

- persistent routing and shared client state matter;
- server components add little value;
- most route data is client-owned;
- a conventional JSON/query cache is acceptable;
- you still want to test Solid 2 async and Router Next.

Main risks:

- loader or query data can be duplicated during SSR hydration;
- more render code enters the client bundle;
- route data needs a caching and invalidation owner.

This is a useful middle option. Solid 2 does not require frames.

### Option C: Solid 2 SSR, Router Next, server functions, and frames

Choose this when:

- server content and client interaction are deeply interleaved;
- navigation must preserve client state;
- single-copy route content is valuable;
- server-only rendering reduces the client bundle;
- the owner accepts experimental transport risk.

Main risks:

- unstable wire and APIs;
- fewer ecosystem packages;
- difficult framework-level bugs;
- limited public examples;
- cache behavior needs deliberate design.

## 4. Weekend-project recommendation

For an owner who accepts beta risk, use Solid 2 when the project itself exercises the architecture. The learning has value even if the product does not become viral.

Do not use the complete experimental stack when the first version is only:

```text
landing page
+ one form
+ one result page
```

Astro or a small server-rendered Solid app will ship faster.

Use frames when the viral product has a flow such as:

```text
feed or gallery
→ detail route
→ interactive creation or editing
→ share route
→ reactions, comments, or saved state
```

That flow benefits from persistent state and server/client composition.

## 5. Risk budget

Accepting beta risk should mean accepting specific work:

- Pin exact package versions.
- Commit the lockfile.
- Upgrade intentionally, not automatically.
- Read changelogs before every upgrade.
- Keep framework integration code small.
- Avoid broad UI dependency graphs.
- Add direct reload, navigation, and hydration tests.
- Keep a known-good branch before upgrades.
- Expect to inspect generated output and framework source.
- Report minimal reproductions upstream.

It should not mean accepting:

- missing validation;
- weak authentication;
- lost user submissions;
- inaccessible forms;
- no error handling;
- no deployment rollback;
- unmeasured performance claims.

## 6. Ecosystem decision

Before choosing Solid 2, list every required browser package.

Classify each dependency:

1. Framework-neutral and browser-safe.
2. Solid 2 compatible.
3. Solid 1 coupled but replaceable with a native element.
4. Solid 1 coupled and requires a local implementation.
5. Blocking dependency with no practical replacement.

Use this order:

1. Compatible upstream package.
2. Browser-native element.
3. Small app-local component.
4. Upstream compatibility contribution.
5. Temporary tested fork with a deletion plan.

Do not fork an entire UI system for a weekend project.

## 7. Data ownership decision

For each data source, name one owner.

| Data                   | Recommended owner                             |
| ---------------------- | --------------------------------------------- |
| Public route content   | Server component or Router query              |
| Local draft            | Client signal/store                           |
| Persisted user setting | Client store plus explicit persistence        |
| Mutation workflow      | `action()` plus server function               |
| Optimistic projection  | `createOptimistic` or `createOptimisticStore` |
| URL parameters         | Router                                        |
| Form state             | Native form or one chosen form owner          |
| Shared server cache    | Server cache layer, not client state          |

Do not stack a Router query, an async memo, a TanStack query, and a local store around the same value.

## 8. Caching decision

Frames do not remove network latency. Decide separately:

- Can the initial document be cached?
- Can public reads use GET?
- Can underlying server data be cached safely?
- Which mutations require fresh primary data?
- What invalidates each cache key?
- Can stale data be displayed while a final mutation validates authority?

Router `query()` declares GET transport for server-function reads in the current Next release. Server-component calls and frame responses need explicit verification before shared CDN caching. The response includes identity and transport records. Cache the underlying public data unless frame-response cacheability has been proven for the exact version.

## 9. Stop conditions

Switch away from Solid 2 frames if the prototype shows any blocking condition:

- Direct reload fails in production.
- Back and forward lose important state.
- Inputs are replaced during navigation.
- No-JS forms cannot preserve errors and values.
- Required UI primitives cannot be made accessible quickly.
- Cloudflare deployment needs a large custom runtime adapter.
- Framework bugs consume more time than product work.
- The route content is so small that frame overhead dominates without an architectural benefit.

Keep Solid 2 but remove frames if only frame transport is blocking. Keep the product architecture reversible.

## 10. Recommended final question

Ask:

> If server components disappeared from Solid tomorrow, would Solid 2 and Router Next still be a good foundation for this product?

If the answer is yes, the experiment has a safe fallback. If the answer is no, the project depends completely on the least stable layer and needs a stronger expected payoff.
