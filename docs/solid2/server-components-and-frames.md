# Server components and frames

Server components are experimental in this Solid 2 beta. Their API and wire format are outside the Solid 2 stability guarantee.

## What a server component is

A server component is a component function returned from a server function:

```tsx
export async function getReportView(reportId: string) {
  "use server";

  const report = await reportRepository.getPublic(reportId);

  return (props) => (
    <article>
      <h1>{report.verdict}</h1>
      <p>{report.summary}</p>
      <props.share reportId={report.id} />
      {props.children}
    </article>
  );
}
```

There is no:

- `"use client"`
- `createServerComponent()`
- serialized server closure
- second hydration pass

The returned closure executes on the server. Server JSX becomes HTML.

## Client consumption

Use `dynamic()`:

```tsx
import { Loading } from "solid-js";
import { dynamic } from "@solidjs/web";

export const ReportPage = (props: { reportId: string }) => {
  const Report = dynamic(() => getReportView(props.reportId));

  return (
    <Loading fallback={<ReportSkeleton />}>
      <Report share={(slot) => <ShareButton reportId={slot.reportId} />} />
    </Loading>
  );
};
```

Keep the `dynamic()` call site stable. Its reactive owner identifies the resident frame boundary.

## Two function levels

The two call levels have different ownership:

```text
getReportView(reportId)
              └── input sent to the server

return props => JSX
       └── positions supplied and owned by the client
```

Server-function arguments are server inputs. Returned component props are client slots.

## Transport rule

```text
server-owned visible content → HTML
values required by client slots → serialized data
same value → not both for the same role
```

For example, the report verdict can remain HTML-only. A share button needs only `reportId`, so only that identifier crosses as slot data.

Do not pass the full report object into a client slot when the slot needs one identifier.

## Nested server content in a client slot

A client slot can wrap server-owned children:

```tsx
return (props) => (
  <section>
    {report.evidence.map((item) => (
      <props.evidence $key={item.id} evidenceId={item.id}>
        <h2>{item.title}</h2>
        <p>{item.copy}</p>
      </props.evidence>
    ))}
  </section>
);
```

```tsx
<Report
  evidence={(slot) => (
    <CollapsibleEvidence evidenceId={slot.evidenceId}>{slot.children}</CollapsibleEvidence>
  )}
/>
```

The client owns collapse state and DOM inside the wrapper. The server owns the nested heading and copy. A frame update can change the server content without resetting the client wrapper.

## Identity and `$key`

Repeated slots use position by default. Add `$key` when an entity must keep its client state across insertion or reordering:

```tsx
<props.evidence $key={item.id} evidenceId={item.id} />
```

Use stable domain identifiers. Do not use array indexes or random values.

A frame version is a stale-response guard, not component identity. A newer response must not reset the resident client owner.

## Initial render and later updates

Initial boot:

1. The server renders document HTML.
2. Server-owned report content is present in the document.
3. Initial client slots are rendered.
4. The browser hydrates once.
5. The frame runtime adopts server-owned regions.

Later update:

1. A server function returns a new frame stream.
2. Server HTML morphs in place.
3. Client slot interiors remain opaque.
4. Existing client state, focus, and input survive when identity survives.
5. Late chunks from older response versions are rejected.

The server never attempts to render the browser’s current client state after boot.

## Boundaries and loading

Each `dynamic()` call site is an independent boundary. Two mounted call sites calling the same function do not become one component.

Place the boundary under `<Loading>` and `<Errored>` to own initial readiness and failure.

A server function that returns ordinary data remains an ordinary server function. Only a function-valued result engages frame transformation.

## Do not touch the wire format

Application code must not:

- query or modify `<dx-frame>` elements;
- parse frame records;
- write transport markers;
- morph frame DOM manually;
- depend on comment or element marker shape;
- perform another hydration pass.

The exact boundary representation changed during the beta line and can change again.

## Good Roast Your Taste use

Frames fit a persisted public report:

```text
Server-owned HTML
├── summary
├── verdict
├── evidence facts
├── deterministic copy
└── rating distribution labels

Client slots
├── share button
├── evidence disclosure state
├── card format selector
└── future appeal control
```

Frames are less useful for a form that only returns a small JSON status object. Use ordinary server functions for ingestion commands and jobs.

## Completion checklist

Before treating a frame feature as complete, verify:

- report content exists in initial HTML;
- initial boot does not refetch the report component;
- direct deep reload works;
- input, focus, and local disclosure state survive updates;
- keyed evidence keeps identity after reorder;
- stale responses cannot overwrite newer content;
- no server-only module appears in client chunks;
- Cloudflare preserves streaming;
- errors reach the intended boundary.
