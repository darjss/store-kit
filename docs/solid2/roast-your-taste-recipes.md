# Roast Your Taste recipes

These examples show the intended project boundaries. They are starting shapes, not requirements to build every layer now.

## Folder ownership

```text
src/
├── app/                 Router and root composition
├── routes/              Route-level UI
├── film/
│   ├── ingest/          Letterboxd acquisition and parsing
│   ├── evidence/        Pure evidence calculations
│   ├── model.ts         Film-specific normalized types
│   └── report.ts        Pure report assembly
├── server/              Bindings and transport boundaries
└── styles/              Tailwind theme and global base styles
```

Domain modules must not import Solid. A parser test or evidence calculation should be able to run without a renderer or request context.

## Normalize a Letterboxd username

```ts
import * as v from "valibot";

export const letterboxdUsernameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^[a-z0-9_]+$/i, "Enter a valid Letterboxd username."),
  v.maxLength(40),
  v.transform((username) => username.toLowerCase()),
);
```

Parse again inside the server function even when a client form already validates it.

## Start analysis

```tsx
export async function startAnalysis(input: unknown) {
  "use server";

  const username = v.parse(letterboxdUsernameSchema, input);
  const snapshot = await acquireLetterboxdProfile(username);
  const profile = normalizeLetterboxdProfile(snapshot);
  const report = createDeterministicReport(profile);

  return { report };
}
```

For a large crawl, return a job identifier instead of holding one request open.

## Form state

Local input text belongs to a client signal:

```tsx
const [username, setUsername] = createSignal("");

<input
  name="username"
  value={username()}
  onInput={(event) => setUsername(event.currentTarget.value)}
/>;
```

The server result does not belong in a second local store when an action or route computation already owns it.

## Deterministic evidence

Keep calculations pure:

```ts
export const calculateRatingDistribution = (films: readonly FilmRecord[]) => {
  const buckets = new Map<number, number>();

  for (const film of films) {
    if (film.rating === undefined) continue;
    buckets.set(film.rating, (buckets.get(film.rating) ?? 0) + 1);
  }

  return buckets;
};
```

Do not make Firecrawl, database, or model calls from evidence modules.

Use stable deterministic tie breaking when evidence scores match:

```text
score descending
→ evidence type
→ canonical film slug
→ evidence id
```

The same source snapshot and algorithm version must produce the same result.

## Server-owned report view

A persisted report is a good frame boundary:

```tsx
export async function getReportView(reportId: string) {
  "use server";

  const report = await getPublicReport(reportId);

  return (props) => (
    <main>
      <h1>{report.verdict}</h1>
      {report.evidence.map((item) => (
        <props.evidence $key={item.id} evidenceId={item.id}>
          <h2>{item.title}</h2>
          <p>{item.copy}</p>
        </props.evidence>
      ))}
      <props.share reportId={report.id} />
    </main>
  );
}
```

Client slots receive only the values they need.

## Public report route

```tsx
export const ReportPage = () => {
  const params = useParams(paths.film.report);
  const Report = dynamic(() => getReportView(params.id));

  return (
    <Errored fallback={() => <ReportError />}>
      <Loading on={params.id} fallback={<ReportSkeleton />}>
        <Report
          evidence={(slot) => (
            <EvidenceDisclosure evidenceId={slot.evidenceId}>{slot.children}</EvidenceDisclosure>
          )}
          share={(slot) => <ShareButton reportId={slot.reportId} />}
        />
      </Loading>
    </Errored>
  );
};
```

Check installed control-flow callback types before copying an error fallback signature. Beta APIs can change.

## Paid AI report

Use a backend completion, not client token streaming:

```text
confirmed payment webhook
→ select verified evidence
→ create generation job
→ call model on the server
→ validate structured output
→ store completed report
→ expose immutable report route
```

The client displays job state and then the completed artifact. It does not need AI UI hooks or chat state.

Every generated factual claim must reference normalized evidence. Do not send the full raw profile to the model.

## Share card

Store report data once. Render it into:

1. Public HTML.
2. A controlled evidence-card layout.
3. Open Graph image output.
4. Share text.

The model writes constrained copy. Application code owns card layout and image generation.

## Error vocabulary

Use user-actionable expected failures:

- Invalid username
- Profile not found
- Profile is private
- Letterboxd temporarily blocked acquisition
- Firecrawl limit reached
- Not enough rated films
- Analysis timed out

Keep infrastructure details in server logs. Do not show raw provider responses.

## Implementation order

1. Username schema.
2. One captured Firecrawl fixture.
3. Markdown parser.
4. Normalized film records.
5. Rating distribution.
6. Five deterministic evidence items.
7. Basic report route.
8. Real acquisition server function.
9. Better evidence ranking.
10. Public persistence and share card.
11. Analytics.
12. Polar and paid AI.
