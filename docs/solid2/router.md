# Router 1.0 Next

This project uses `@solidjs/router@1.0.0-next.9`. Do not use examples for Router 0.x.

## Route configuration

The route tree is an immutable module-level application definition:

```tsx
import { createRouter } from "@solidjs/router";
import { HomePage } from "@/routes/HomePage";
import { ReportPage } from "@/routes/ReportPage";

export const Router = createRouter({
  routes: [
    { path: "/", component: HomePage },
    { path: "/film/report/:id", component: ReportPage },
  ],
});

export const { paths } = Router;
```

Mount the returned instance once:

```tsx
<Router>{(props) => <AppShell>{props.children}</AppShell>}</Router>
```

The function child is the persistent root layout.

Do not write:

```tsx
<Router>
  <Route path="/" component={HomePage} />
</Router>
```

## Links

Router Next uses plain anchors:

```tsx
<a href={paths()}>Home</a>
<a href={paths.film.report(report.id)}>Open report</a>
```

There is no Router `<A>` component. Same-origin anchors are claimed and enhanced by the Router. They remain normal links without JavaScript.

Style active and pending state through attributes:

```css
nav a[aria-current="page"] {
  font-weight: 700;
}

nav a[data-pending] {
  opacity: 0.6;
}
```

## Typed paths

The `paths` proxy follows route structure:

```tsx
paths();
paths.film.report("report_123");
```

A path node coerces to a string when passed to `href`, navigation, or redirects.

When routes move into another file, wrap extracted arrays with `defineRoutes`. A plain extracted array widens path literals and weakens inference.

## Instance versus hooks

The shared Router instance contains static application facts:

- `paths`
- `match(url)`
- `routes`
- `config`

Hooks read request or browser-session state:

- `useLocation()`
- `useParams()`
- `useNavigate()`
- `useSearchParams()`
- `useRouteMatches()`
- `useIsRouting()`
- `useBeforeLeave()`

A useful test is: could two simultaneous server requests give different answers? If yes, use a hook rather than reading shared instance state.

## Parameters

```tsx
import { useParams } from "@solidjs/router";
import { paths } from "@/app/router";

export const ReportPage = () => {
  const params = useParams(paths.film.report);
  return <h1>Report {params.id}</h1>;
};
```

Use match filters such as `int` when a path parameter has a constrained runtime type.

## Search parameters

Router Next accepts a Standard Schema validator. Valibot can validate and type search state:

```tsx
import { createRouter } from "@solidjs/router";
import * as v from "valibot";

const search = v.object({
  evidence: v.optional(v.picklist(["all", "ratings", "reviews"]), "all"),
});

const Router = createRouter({
  routes: [{ path: "/film/report/:id", component: ReportPage, search }],
});
```

Use `useSearchParams(paths.film.report)` to get typed reactive values.

## Route code and data preloading

Routes can define `preload`. It runs for initial render, navigation, browser history, and hover/focus preload intent.

Use `lazy()` for route components. Use lazy route subtrees when an entire future court should stay outside the initial bundle.

## Queries

Use `query()` for reusable remote values that the client consumes, deduplicates, and invalidates:

```tsx
import { query } from "@solidjs/router";

export const getReport = query(fetchReport, "report");
```

A query:

- deduplicates during one server request;
- shares hover preload and route entry for a short browser window;
- participates in action revalidation;
- supports back/forward caching;
- uses GET transport when wrapping a server function.

Do not use a Router query only to transfer server-owned visible content into a server component. Use one remote-data owner for each value.

## Router actions and forms

Router actions are URL-addressable POST actions:

```tsx
import { action } from "@solidjs/router";

export const analyzeProfile = action(startAnalysis);

<form action={analyzeProfile} method="post">
  <input name="username" />
  <button type="submit">Put my taste on trial</button>
</form>;
```

Always use `method="post"`.

- `useAction()` invokes an action from scripted client code.
- `useSubmissions()` reads settled submission history, not pending state.
- Solid optimistic primitives own visible speculative state.
- Return expected failure values instead of throwing them.

## Current integration note

Turnkey SSR already routes page requests and server-function calls. Router single-flight data collection and no-JavaScript flash submissions require these server integrations when we add Router actions:

```tsx
createFlightDataCollector(Router);
createNoJSHandler();
```

They are not wired into the current Worker yet because the app has no actions or queries. Do not claim full no-JavaScript action behavior until this integration is implemented and tested.
