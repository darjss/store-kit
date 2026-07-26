# Core and reactivity

## Mental model

A Solid component is a setup function. It runs when the component mounts. It does not rerun when a signal changes. Reactive work happens where an accessor is read later: JSX, a memo, an effect compute function, or a callback.

```tsx
import { createSignal } from "solid-js";

export const Counter = () => {
  const [count, setCount] = createSignal(0);

  return <button onClick={() => setCount(count() + 1)}>Count: {count()}</button>;
};
```

The function creates the signal and button once. The `count()` expression updates its text node.

## Imports

```tsx
import {
  Errored,
  For,
  Loading,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createStore,
  onSettled,
  refresh,
  snapshot,
} from "solid-js";

import { dynamic, hydrate, render } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
```

Do not use these Solid 1 imports:

```tsx
import { render } from "solid-js/web";
import { createStore } from "solid-js/store";
```

## Props stay reactive

Read props where they are used.

```tsx
export const FilmTitle = (props: { title: string }) => <h2>{props.title}</h2>;
```

Do not destructure them:

```tsx
// Do not use this in Solid 2.
export const FilmTitle = ({ title }: { title: string }) => <h2>{title}</h2>;
```

A setup-time alias is also a snapshot:

```tsx
// Snapshot: it will not follow later prop changes.
const title = props.title;
```

Use an accessor when a local name helps:

```tsx
const title = () => props.title;
```

## Signals, derived accessors, and memos

Use a signal for a replaceable value:

```tsx
const [username, setUsername] = createSignal("");
```

Use a plain accessor for a cheap derivation used once:

```tsx
const canonicalUsername = () => username().trim().toLowerCase();
```

Use `createMemo` when work is expensive, reused, async, or should shield downstream work through equality:

```tsx
const ratedFilms = createMemo(() => films().filter((film) => film.rating !== undefined));
```

Memos must stay pure. Do not write application state from a memo.

## Scheduling

Solid 2 batches writes by microtask. An immediate read can still return the committed value from before the setter.

```tsx
setUsername("sjrad");
username(); // It can still be the previous committed value here.
```

Usually, this does not matter because JSX and reactive computations update after the batch. Do not scatter `flush()` through application code. Use `flush()` only for a real imperative commit point or a test.

Routine `batch()` calls are also unnecessary because batching is the default.

## Effects

Effects synchronize reactive data with an external system. They are not a way to derive application state.

Solid 2 separates dependency computation from side-effect application:

```tsx
createEffect(
  () => props.title,
  (title) => {
    document.title = title;
  },
);
```

Return cleanup from the apply function:

```tsx
createEffect(
  () => props.reportId,
  (reportId) => {
    const controller = new AbortController();
    subscribeToReport(reportId, controller.signal);
    return () => controller.abort();
  },
);
```

Use `{ defer: true }` when the effect must not apply on its initial run.

Do not use an effect to copy one signal into another:

```tsx
// Wrong: derive this value instead.
createEffect(count, (count) => setDoubled(count * 2));
```

## Lifecycle

Use `onSettled` for the old mount-style lifecycle role:

```tsx
onSettled(() => {
  input?.focus();
  return () => controller.abort();
});
```

Effects do not run during SSR. Browser APIs belong in client lifecycle work, event handlers, or guarded client-only modules.

## Stores

Stores are exported from `solid-js`. Use draft-first updates:

```tsx
const [draft, setDraft] = createStore({ username: "", submitted: false });

setDraft((draft) => {
  draft.username = "sjrad";
  draft.submitted = true;
});
```

Use `snapshot(store)` when an API requires a plain value.

Use a signal instead of a store when the full value is replaced as one unit.

## Control flow

- `<Show>` owns one conditional branch.
- `<For>` uses item identity by default.
- `<For keyed={false}>` uses positional identity and replaces Solid 1 `<Index>`.
- `<Loading>` owns initial async readiness.
- `<Errored>` owns render and async errors.
- `dynamic(source)` creates a stable dynamic component factory.

Use `<For>` for reactive lists rather than `.map()` in rendered JSX.

## Removed or replaced APIs

| Solid 1                               | Solid 2 beta                        |
| ------------------------------------- | ----------------------------------- |
| `solid-js/web`                        | `@solidjs/web`                      |
| `solid-js/store`                      | `solid-js`                          |
| `mergeProps`                          | `merge`                             |
| `splitProps`                          | `omit`                              |
| `unwrap`                              | `snapshot`                          |
| `onMount`                             | `onSettled`                         |
| `Suspense`                            | `Loading`                           |
| primary `ErrorBoundary` role          | `Errored`                           |
| `Index`                               | `<For keyed={false}>`               |
| `createResource`                      | async computation                   |
| `resource.refetch`                    | `refresh(source)`                   |
| `resource.mutate`                     | optimistic signal or store          |
| `createDynamic`                       | `dynamic(source)`                   |
| `startTransition` and `useTransition` | action and async graph coordination |

## Review checklist

- Are changing props read through `props` at the point of use?
- Does each signal have one clear owner?
- Is every memo pure?
- Does every effect synchronize an external system?
- Does acquired external work return cleanup?
- Are browser APIs outside SSR setup?
- Does list identity match the intended behavior?
