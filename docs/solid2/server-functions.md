# Server functions

A server function is a normal function whose body contains `"use server"`. The compiler extracts that body into the server build and replaces client use with a typed network reference.

## Basic form

```tsx
import * as v from "valibot";

const usernameSchema = v.pipe(v.string(), v.trim(), v.regex(/^[a-z0-9_]+$/i), v.maxLength(40));

export async function analyzeLetterboxd(input: unknown) {
  "use server";

  const username = v.parse(usernameSchema, input);
  return startLetterboxdAnalysis(username);
}
```

The directive belongs inside the function. A module-level directive can mark every supported export in a dedicated server module.

## The security boundary

Treat arguments as hostile network input. TypeScript does not validate them.

Every sensitive function body must own:

1. Input decoding and validation.
2. Authentication when required.
3. Authorization when required.
4. Rate limiting when required.
5. Logging or auditing.
6. Database and provider work.
7. A safe serializable result.

A wrapper around a server-function reference does not protect direct HTTP dispatch. Put policy inside the extracted body or in a global server-handler hook.

## Client and server builds

Server-only imports used exclusively by the extracted body are removed from the client build:

```tsx
import { env } from "cloudflare:workers";

export async function scrapeProfile(input: unknown) {
  "use server";

  return fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(v.parse(requestSchema, input)),
  });
}
```

This protects bundle privacy, but it is not authentication. Anyone can call the registered HTTP function unless the function enforces policy.

## Arguments

A single natural web argument can use its direct HTTP representation:

- `string`
- `FormData`
- `File`
- `Blob`

Other arguments use plain JSON by default. Plain JSON does not preserve `Date`, `Map`, `Set`, typed arrays, or cyclic references.

Prefer simple validated input records. Do not enable rich arguments unless the feature needs them and accepts the client bundle cost.

## Expected failures

Return tagged values:

```ts
type StartAnalysisResult =
  | { ok: true; reportId: string }
  | {
      ok: false;
      code: "invalid_username" | "profile_not_found" | "profile_private";
      message: string;
    };
```

Do not send raw provider errors, stack traces, credentials, or database records to the browser.

## GET reads

Declare a cacheable read with `GET`:

```tsx
import { GET } from "@solidjs/web/server-functions";

export const getPublicReport = GET(async (id: string) => {
  "use server";

  return reportRepository.getPublic(id);
});
```

Undeclared functions use POST. GET puts arguments in the URL and allows normal HTTP cache semantics. It does not add cache headers automatically.

## Response intent

Use helpers from `@solidjs/web`:

```tsx
return respond(report, {
  status: 201,
  headers: { "cache-control": "private, no-store" },
});
```

```tsx
return redirect(`/film/report/${report.id}`);
```

```tsx
return reload({ revalidate: "reports" });
```

- `respond` carries a value plus HTTP metadata.
- `redirect` requests navigation.
- `reload` requests refresh without an application value.

Use `isResponseEnvelope()` when code must inspect an envelope. Do not rely on `instanceof`.

## Server-function references

A compiled reference is callable and exposes transport identity, including `.id` and `.url`. The URL supports native form actions and bound arguments.

No-JavaScript submission policy still belongs to Router or framework integration. A URL existing does not prove that validation errors, redirects, and restored form state work correctly without JavaScript.

## Request context

The turnkey runtime provides request-event scope. Server code can read the current event through the installed server-function runtime APIs. Keep Cloudflare binding access in small server-only modules rather than importing environment bindings throughout the domain.

Recommended boundary:

```text
server function
→ validate network input
→ read request context and bindings
→ call framework-free domain function
→ map result to safe transport value
```

## Firecrawl guidance

Use plain server-side `fetch` first. It keeps the Worker surface small and avoids Node-only SDK assumptions.

- Set a request timeout.
- Limit pages and total credits.
- Validate Firecrawl responses before parsing.
- Store or hash the acquired snapshot when reproducibility matters.
- Make parsing and evidence calculation deterministic from that snapshot.
- Never expose `FIRECRAWL_API_KEY` to a client module or slot argument.
