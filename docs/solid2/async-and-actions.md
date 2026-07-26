# Async data and actions

## Async values are part of the graph

A Solid 2 computation can return a synchronous value, a `Promise`, or an `AsyncIterable`. You do not need `createResource`.

```tsx
import { Loading, createMemo } from "solid-js";

const profile = createMemo(() => fetchProfile(username()));

<Loading fallback={<p>Loading profile…</p>}>
  <Profile profile={profile()} />
</Loading>;
```

The accessor keeps the resolved type. Loading is structural and belongs to the nearest `<Loading>` boundary.

## Initial loading and revalidation

`<Loading>` shows its fallback before the branch is ready for the first time. After content has committed, Solid usually keeps stale content visible while a replacement is in flight.

Use `on` when an identity change should show the fallback again:

```tsx
<Loading on={reportId()} fallback={<ReportSkeleton />}>
  <Report id={reportId()} />
</Loading>
```

Use nested boundaries so one slow section does not block the full page.

## Pending state

`isPending` asks whether the expression it reads has a changed answer in flight:

```tsx
import { Show, isPending } from "solid-js";

<Show when={isPending(() => report())}>
  <span>Updating report…</span>
</Show>;
```

The expression must reach the async value. Reading only an upstream ID does not automatically observe pending work below it.

An initially unresolved value still belongs to `<Loading>`. Keep pending indicators under the boundary that owns the initial read.

## Errors

Use `<Errored>` for async and render failures:

```tsx
import { Errored } from "solid-js";

<Errored fallback={(error) => <p>{error().message}</p>}>
  <Report />
</Errored>;
```

Expected product failures should usually be returned as validated tagged values instead of thrown errors:

```ts
type AnalysisResult =
  | { ok: true; reportId: string }
  | { ok: false; code: "private_profile" | "not_found"; message: string };
```

## Refresh

`refresh(target)` recomputes a refreshable derived source:

```tsx
refresh(report);
```

A bare refresh is quiet. Existing content remains valid, and `isPending` does not become true only because of the refresh.

When in-flight work is known to change a target but the new value is not available yet:

```tsx
affects(report);
refresh(report);
```

Use `affects` to mark pending authority, not as a generic loading flag.

## Actions

Actions coordinate mutation work, optimistic changes, and authority reconciliation.

```tsx
import { action, createOptimisticStore, refresh } from "solid-js";

const [reports, setReports] = createOptimisticStore(() => getReports(), []);

const renameReport = action(function* (id: string, title: string) {
  setReports((reports) => {
    const report = reports.find((report) => report.id === id);
    if (report) report.title = title;
  });

  yield saveReportTitle(id, title);
  refresh(reports);
});
```

Reads belong in async computations. Mutations belong in actions.

## Optimistic state

Use `createOptimistic` for a speculative scalar or object replaced as one value. Use `createOptimisticStore` for granular collection updates.

An optimistic value reverts or reconciles when its action transition settles. It is not authoritative storage.

Separate these concerns:

| Concern                          | Tool                                              |
| -------------------------------- | ------------------------------------------------- |
| Show expected result immediately | Optimistic signal or store                        |
| Mark authority as changing       | `affects()`                                       |
| Ask authority again              | `refresh()`                                       |
| Show submit progress             | Explicit process state or Router submission model |

Do not use `refresh()` as a saving flag.

## Async iterables

Computations can consume an async iterable:

```tsx
const progress = createMemo(async function* () {
  for await (const update of watchAnalysis(jobId())) {
    yield update;
  }
});
```

This can represent server progress, but it does not mean the UI must stream model tokens. Roast Your Taste should treat an AI report as a completed artifact. Job status can stream or poll independently from report content.

## Imperative helpers

- `latest(fn)` reads the in-flight answer when available and otherwise falls back to the committed answer.
- `resolve(fn)` returns a promise for the current non-pending value. It cannot run inside a reactive scope.

Use these narrowly. Normal rendered code should read accessors under structural boundaries.

## Roast Your Taste guidance

For the first Letterboxd analysis:

1. A form action starts analysis.
2. The server returns a report or a job identifier.
3. `<Loading>` owns first readiness.
4. A job status computation owns polling or streaming progress.
5. The completed report becomes immutable authority.
6. Public report HTML should not mirror itself into a client cache unless controls need the source data.
