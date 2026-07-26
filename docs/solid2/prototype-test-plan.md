# Prototype and test plan

The prototype should prove framework behavior with a real vertical slice. Do not build a visual mock that avoids the difficult boundaries.

## 1. Time box

Use this sequence:

### First two hours

- Install exact prerelease versions.
- Enable turnkey SSR, server functions, and components.
- Render one server component.
- Confirm initial SSR contains its content.
- Confirm initial boot makes zero `/_server` component requests.
- Deploy the minimal Worker.

Stop and investigate if the basic deployment requires a large custom adapter.

### First day

- Add Router Next.
- Add one list route and one typed detail route.
- Put a stateful client component inside server content.
- Add one mutation and one no-JS form.
- Add browser tests for reload, navigation, and state preservation.

### Second day

- Add the product's viral path.
- Measure response sizes and client JavaScript.
- Test low-powered mobile conditions.
- Decide whether to continue with frames, continue without frames, or switch to Astro.

## 2. Required vertical slice

Use a real domain entity such as a post, generated result, project, image, poll, or shared artifact.

The slice must include:

```text
home/list route
→ detail route
→ stateful client control inside server content
→ server mutation
→ redirect or refreshed content
→ shareable direct URL
```

Do not replace the real database with a fake repository only to make the test easy. A small real database or real service is better.

## 3. Server-component proof

Implement one component with:

- server-only title and body;
- a direct child slot;
- a render-prop slot with serialized arguments;
- a keyed repeated slot;
- nested server content inside a client wrapper;
- delayed async server content.

Example shape:

```tsx
return (props) => (
  <article>
    <h1>{item.title}</h1>

    <props.toolbar itemId={item.id} />

    {item.comments.map((comment) => (
      <props.comment $key={comment.id} commentId={comment.id}>
        <p>{comment.body}</p>
      </props.comment>
    ))}

    {props.children}
  </article>
);
```

## 4. Initial document tests

Verify with JavaScript enabled and disabled:

- Server content exists in View Source.
- The main heading is visible before client JavaScript executes.
- Initial client slot HTML is present when expected.
- Initial boot does not fetch every server component again.
- The same long server content does not appear in both HTML and serialized frame data.
- Server-only database modules are absent from the client bundle.
- A direct detail URL returns a complete document.
- A 404 returns the correct status and accessible message.
- An async error reaches the intended error boundary.

Automate searches against the actual response body and built client chunks.

## 5. Navigation tests

Test:

- list to detail;
- detail A to detail B;
- back;
- forward;
- repeated quick navigation A → B → C;
- navigation while a slower A response is still streaming;
- query-string changes;
- hash changes if supported;
- direct reload on every public route;
- opening a route in a new tab.

Record whether navigation uses:

- full documents;
- Router queries;
- server-component frame responses;
- cached responses.

Do not infer transport from visual behavior.

## 6. State-preservation tests

Before navigation or refresh:

- type unfinished text into an input;
- focus a control;
- open a disclosure;
- change a local toggle;
- start media if the product uses media;
- create an optimistic record;
- scroll a nested region.

After the server frame updates, verify which state should remain and which state should reset.

The most important test is a client wrapper around nested server content. Its local state must survive a server update into the same keyed occurrence.

Also verify that changing `$key` intentionally resets the associated state.

## 7. Stale-response test

Create deterministic server delays:

```text
item A: 800 ms
item B: 400 ms
item C: 50 ms
```

Navigate A → B → C quickly. C must remain displayed after A and B finish. Late HTML chunks must not overwrite C.

Run the same test for nested async fragments.

This test exercises real framework behavior. Do not mock the frame runtime.

## 8. Mutation tests

Implement one real mutation with:

- network input validation;
- an expected validation failure;
- an unexpected server failure;
- optimistic local state;
- authoritative server write;
- refresh or single-flight response;
- duplicate-submission protection when required.

Verify:

- optimistic state appears immediately;
- successful server data reconciles it;
- failure reverts or clearly marks it;
- unrelated state does not reset;
- redirect metadata is applied;
- refreshed route data does not cause a redundant second request.

Router `1.0.0-next.9` includes a fix for duplicate revalidation after single-flight mutations. Keep a regression test because this area is actively changing.

## 9. No-JS form tests

Disable JavaScript and submit the real form.

Verify:

- server action URL is valid;
- validation executes;
- response uses the expected redirect status;
- validation message appears after redirect;
- safe form values can be restored;
- success redirects correctly;
- cookies have safe flags and bounded size;
- refreshing does not repeat a destructive mutation.

Then repeat with JavaScript enabled and compare behavior.

## 10. Accessibility tests

At minimum:

- keyboard-only route navigation;
- visible focus;
- focus behavior after navigation;
- correct document and route titles;
- heading hierarchy;
- labels and descriptions for forms;
- error announcement;
- pending and success announcement where useful;
- reduced motion;
- dialog focus trap and restoration when dialogs exist;
- no duplicate IDs after frame updates.

A morph that visually preserves a component but loses focus semantics is a failure.

## 11. Performance tests

Measure cold and warm states separately.

### Server and network

- initial TTFB;
- initial document bytes;
- frame response bytes;
- query response bytes;
- server render duration;
- database/cache duration;
- cache hit ratio;
- number of initial requests;
- navigation request count;
- streaming first-chunk time.

### Browser

- client JavaScript raw and gzip size;
- parse and execution time;
- hydration time;
- LCP;
- INP;
- CLS;
- long tasks;
- memory after repeated navigation;
- time until first interaction works.

Test with mobile CPU slowdown and a constrained network. A viral product should not assume a high-end development laptop.

## 12. Bundle privacy tests

Choose a distinctive server-only string and module name. Confirm they do not appear in client chunks.

Check for:

- database driver imports;
- private schema code;
- API secrets;
- server-only validation packages;
- complete source records rendered only as HTML;
- accidental broad imports from server modules.

The compiler boundary is a privacy mechanism, but secrets still require normal review.

## 13. Deployment tests

On the target production runtime, verify:

- generated `handleRequest(Request)` works;
- static assets receive immutable cache headers;
- server routes do not collide with asset routes;
- `/_server` reaches the generated handler;
- streaming is not buffered by the adapter or proxy;
- request context and environment bindings are available in server functions;
- cookies and redirects survive the adapter;
- error responses retain status and headers;
- deployment rollback works.

Local Vite success is not enough.

## 14. Upgrade regression suite

Run this suite after each beta upgrade:

1. Initial SSR content.
2. Zero initial frame refetches.
3. Direct reload.
4. Client slot hydration.
5. Nested server children.
6. Keyed slot reorder.
7. Input and focus preservation.
8. Stale response rejection.
9. Back and forward.
10. Scripted mutation.
11. Single-flight refresh.
12. No-JS form.
13. Error and redirect metadata.
14. Client bundle privacy.
15. Cloudflare streaming deployment.

## 15. Decision report template

After the prototype, write:

```md
# Framework decision

## Product shape

## Versions tested

## Deployment runtime

## What worked

## Framework defects found

## Ecosystem blockers

## Initial performance

## Navigation performance

## Accessibility result

## No-JS result

## Bundle result

## Upgrade and maintenance cost

## Decision

- Solid 2 with frames
- Solid 2 without frames
- Astro with Solid islands
- Other

## Reasons

## Revisit date or trigger
```

The decision should follow measured product behavior, not only architectural preference.
