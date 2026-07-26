# Solid 2 architecture

## 1. The unified model

Solid 2 does not treat async data, server calls, server rendering, and client updates as unrelated systems.

The intended flow is:

```text
reactive inputs
  → async computations
  → Loading and Errored boundaries
  → server functions
  → server-rendered HTML or returned values
  → actions and refresh
  → persistent fine-grained client owners
```

This removes much of the glue found in SSR applications:

```text
route loader
  → query cache
  → dehydration
  → JSON script
  → hydration
  → component query
  → client cache invalidation
```

A query cache still has value when the client owns remote state. It is not mandatory only to transfer initial route data from the server to a component.

## 2. Async is part of the reactive graph

Solid 2 computations can return `Promise` or `AsyncIterable` values.

```tsx
import { Loading, createMemo } from "solid-js"

const user = createMemo(() => fetchUser(userId()))

<Loading fallback={<UserSkeleton />}>
  <UserProfile user={user()} />
</Loading>
```

Key consequences:

- `createResource` is removed.
- Async values do not need pervasive `T | undefined` types.
- `<Loading>` structurally owns first readiness.
- A previously committed branch normally remains visible during revalidation.
- `isPending(() => value())` reports a changed answer that is in flight.
- `refresh(value)` re-asks a derived read.
- `affects(value)` can declare that in-flight work will change a value.
- `latest(value)` can inspect in-flight state.

Do not translate Solid 1 resource patterns mechanically. The ownership model changed.

## 3. Server functions are core

A server function uses the function-level directive:

```tsx
export async function getUser(id: string) {
  "use server";

  validateUserId(id);
  return database.users.find(id);
}
```

The compiler extracts the body into the server build and emits a client reference. Server-only imports that become unused are removed from the client output.

The server-function body is the security boundary. Validate all arguments inside it. TypeScript does not validate network input.

Server functions support:

- typed calls;
- plain JSON arguments by default;
- an opt-in rich argument codec;
- streaming results;
- redirects, reloads, and response metadata;
- GET declarations;
- no-JS form submissions;
- single-flight mutation data;
- server-component results.

Use `GET` for declared cacheable reads:

```tsx
import { GET } from "@solidjs/web/server-functions";

export const getUser = GET(async (id: string) => {
  "use server";
  return database.users.find(id);
});
```

Do not place authentication, validation, authorization, or rate limiting only in a wrapper around the function reference. HTTP dispatch calls the registered body. Put server policy inside the body or in global request-handler hooks.

## 4. A server component is a returned function

There is no separate server-component API.

```tsx
export async function getArticle(slug: string) {
  "use server";

  const article = await database.articles.findBySlug(slug);

  return (props) => (
    <article>
      <h1>{article.title}</h1>
      <div>{article.body}</div>

      <props.reactions
        $key={article.id}
        articleId={article.id}
        initialCount={article.reactionCount}
      />

      <footer>{props.children}</footer>
    </article>
  );
}
```

The two call levels have different ownership:

```text
getArticle(slug)
           └─ input sent to the server

return props => JSX
       └─ positions supplied and owned by the client
```

The server owns `article.title` and `article.body`. They travel as HTML.

The client owns `props.reactions` and `props.children`. The server emits marked positions for them but does not control their post-boot state.

## 5. The client uses `dynamic`

```tsx
import { Loading } from "solid-js";
import { dynamic } from "@solidjs/web";

function ArticleRoute(props: { slug: string }) {
  const Article = dynamic(() => getArticle(props.slug));

  return (
    <Loading fallback={<ArticleSkeleton />}>
      <Article
        reactions={(slot) => (
          <ReactionButton articleId={slot.articleId} initialCount={slot.initialCount} />
        )}
      >
        <ShareButton />
      </Article>
    </Loading>
  );
}
```

`dynamic()` is the consumption surface. The server-function response resolves to a stable component for that reactive owner and call site.

When `slug` changes:

1. The server function runs again.
2. Its component result becomes an HTML frame stream.
3. The existing boundary receives the new stream.
4. Server-owned HTML morphs in place.
5. Client-owned slot ranges remain opaque to the morph.
6. Existing client state survives when identity is unchanged.
7. Late chunks from stale response versions are rejected.

Two mounted call sites remain independent even when they call the same function.

## 6. Single-copy transport

The architecture has a strict goal:

```text
server-owned visible content → HTML
client-required values       → data records
same value                    → not both for the same role
```

Example:

```tsx
<props.comment commentId={comment.id}>
  <p>{comment.text}</p>
</props.comment>
```

The client needs `comment.id`, so it travels as data. The text is server-owned content, so it travels as HTML.

This is possible because the runtime owns the full async and rendering graph. It can identify:

- content consumed by server rendering;
- values required by client positions;
- initial HTML that the client can adopt;
- content hidden by a client wrapper during SSR;
- values that must remain available for a later client mount.

If a client wrapper does not reveal its server children during initial SSR, the runtime can send that content once as data records. The client can mount it later without another request. This preserves the single-copy rule even when initial client state occludes server content.

## 7. Hydration happens once

The hard rule is:

> Hydration happens at initial boot and never again.

Initial document:

```text
server renders server content
server renders the initial client positions
browser receives complete HTML
client hydrates its positions
frame runtime adopts server-owned regions
```

Later server-component response:

```text
server sends server-owned HTML
server sends client slot arguments
server does not render post-boot client components
client preserves or mounts those positions locally
```

This rule avoids an impossible assumption: after boot, the server cannot know the client component's current local state.

## 8. Boundary and occurrence identity

A server-component boundary belongs to the client call site. Current beta output uses an element similar to:

```html
<dx-frame data-fid="article/getArticle:1" style="display:contents">
  <!-- server content and protected client slots -->
</dx-frame>
```

The exact representation is experimental and can change.

Repeated client slots use positional identity by default. Use `$key` when entity identity must survive insertions or reordering:

```tsx
<For each={comments}>
  {(comment) => (
    <props.comment $key={comment.id} commentId={comment.id}>
      <CommentBody comment={comment} />
    </props.comment>
  )}
</For>
```

Use stable entity keys. Do not use random values or array positions for reorderable records.

## 9. Streaming and stale responses

Frame responses can include records for:

- HTML;
- slots;
- serialized values;
- nested regions;
- async fragments;
- reveal commands;
- completion;
- errors;
- assets.

Each active response has a version. If navigation B starts after navigation A, late chunks from A are rejected after B becomes current. A version change does not itself dispose the resident client owner. Disposal occurs when the Solid owner is removed.

This is essential for fast input changes and route navigation.

## 10. Actions and optimistic state

Use `action()` for mutations. Use optimistic primitives for user-visible intent.

```tsx
import { action, createOptimisticStore, refresh } from "solid-js";

const [todos, setTodos] = createOptimisticStore(() => getTodos(), []);

const addTodo = action(function* (todo: Todo) {
  setTodos((items) => {
    items.push(todo);
  });

  yield saveTodo(todo);
  refresh(todos);
});
```

Solid 2 actions coordinate with transitions. They avoid a separate mutation-state system.

The Router adds:

- query invalidation;
- submissions;
- redirects;
- no-JS flash results;
- single-flight route data after mutations.

## 11. Router 1.0 Next

Router 1.0 Next targets Solid 2. Do not use Router 0.x examples.

The new direction uses a route configuration outside JSX:

```tsx
import { createRouter } from "@solidjs/router";

const Router = createRouter({
  routes: [
    { path: "/", component: Home },
    { path: "/articles/:slug", component: ArticleRoute },
  ],
});
```

The route tree becomes the source for matching and typed paths. The current Next line includes:

- typed path proxies;
- Standard Schema search validation;
- browser, hash, and memory history adapters;
- `query()` cache integration;
- `action()` integration;
- GET transport for server-function queries;
- single-flight mutation data;
- no-JS form handling;
- element claims for links and forms inside server frames.

Router and frame integration is still moving. Read the installed package README and changelog before implementation.

## 12. Vite plugin and deployment

The Vite plugin can generate the SSR entries and request handler:

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

The object form `ssr: {}` enables turnkey SSR. A production build creates:

```text
dist/client/
dist/server/server.js
```

The server bundle exports a web-standard handler:

```ts
import { handleRequest } from "./dist/server/server.js";

export default {
  fetch(request: Request) {
    return handleRequest(request);
  },
};
```

A Cloudflare Worker can serve static assets first and dispatch application requests to this handler. Keep the adapter small.

## 13. Cost model

The official implementation reports approximately:

- 6.5 KB gzip for frame machinery in an app that already uses server functions;
- 0.86 KB for the DOM reconciler inside that machinery;
- zero frame cost when the feature is not imported.

The official Hacker News comparison measured:

| Metric                 |     SSR SPA | Server components |
| ---------------------- | ----------: | ----------------: |
| Initial document       |      7.1 KB |            7.5 KB |
| Inline data scripts    |      3.1 KB |            2.6 KB |
| Client gzip            |     30.9 KB |           37.8 KB |
| Navigation             | 0.7 KB JSON |       2.3 KB HTML |
| Visible content copies |           2 |                 1 |

Server components are not automatically smaller for a small application. Their benefit grows when substantial render logic and content remain server-only, and when persistent client state matters.

## 14. Architectural conclusion

Solid frames are best described as:

> Fine-grained, state-preserving live SSR with typed client positions.

They are not only React Server Components with a different serializer. The primary transport is HTML, the client graph persists, and structural ownership replaces module colouring.
