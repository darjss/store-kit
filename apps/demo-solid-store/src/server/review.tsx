'use server'

import type { Element } from 'solid-js'

import benchmark from '~/benchmark/solid2-vs-plugged.json'

interface ReviewFrameProps {
  lab: () => Element
}

const flowSteps = [
  {
    title: 'Direct SSR',
    old: [
      'GET /products/:slug',
      'Astro route + commerce',
      'Complete HTML document',
      'Solid islands start',
    ],
    next: [
      'GET /products/:slug',
      'Turnkey Router SSR',
      'Shell + frame HTML stream',
      'Hydrate once + adopt',
    ],
    note: 'Both return useful HTML. DUND also establishes one long-lived client tree and adopts frame regions without a boot frame request.',
  },
  {
    title: 'Browser boot / adoption',
    old: [
      'Parse document',
      'Start client:load chrome',
      'Mount client:only route island',
      'Restore cart',
    ],
    next: [
      'Parse document',
      'Hydrate Router shell',
      'Adopt <dx-frame> regions',
      'Restore cart after settle',
    ],
    note: 'Plugged creates separate Solid roots. DUND hydrates once; the frame wire markers are runtime details, not application APIs.',
  },
  {
    title: 'Client navigation',
    old: ['Anchor click', 'New document request', 'Replace document', 'Recreate island owners'],
    next: [
      'Claimed anchor click',
      'Router keeps shell',
      '/_server route work',
      'Apply route + restore focus',
    ],
    note: 'Plugged uses normal multi-page navigation. DUND uses Router Next and must test history, stale responses, scroll, and focus itself.',
  },
  {
    title: 'Frame update',
    old: [
      'No frame protocol',
      'Fetch full document',
      'Browser replaces page',
      'Storage recovers durable state',
    ],
    next: [
      'Reactive frame input changes',
      'Frame stream starts',
      'Server DOM morphs',
      'Client regions stay opaque',
    ],
    note: 'A frame update is ownership-aware HTML transport. It does not make the request free, and it is not a second hydration pass.',
  },
  {
    title: 'Mutation / action',
    old: ['Client-only form', 'TanStack form/query', 'Eden API request', 'Invalidate client cache'],
    next: [
      'Router POST action',
      'Validated server function',
      'Commerce operation + D1',
      'Submission result / refresh',
    ],
    note: 'Both call the same commerce authority. DUND removes Eden from first-party calls, but accepts prerelease action integration work.',
  },
] as const

const ownershipRows = [
  {
    surface: 'Home',
    oldServer: 'Astro page + commerce owns initial content',
    oldClient: 'StoreChrome island only',
    nextServer: 'getHomeFrame owns merchandising HTML',
    nextClient: 'Router shell owns cart/search',
    authority: 'D1 catalog through commerce.catalog',
  },
  {
    surface: 'Catalog',
    oldServer: 'Astro URL parse + complete results document',
    oldClient: 'Chrome search island',
    nextServer: 'getCatalogFrame owns results and filter HTML',
    nextClient: 'Router owns URL; client slot preserves disclosure/focus',
    authority: 'URL + D1 catalog',
  },
  {
    surface: 'Product',
    oldServer: 'Astro owns heading, facts, and serialized island props',
    oldClient: 'client:only ProductPurchase owns gallery/selection',
    nextServer: 'getProductPage returns purchase data; details stay framed',
    nextClient: 'ProductPurchase mounts under CartProvider',
    authority: 'D1 product/stock; local selection is a draft',
  },
  {
    surface: 'Cart',
    oldServer: 'No customer cart during SSR',
    oldClient: 'Module Solid store + localStorage',
    nextServer: 'No customer cart during SSR',
    nextClient: 'Persistent-shell CartProvider + localStorage',
    authority: 'Browser draft; commerce revalidates price/stock',
  },
  {
    surface: 'Checkout',
    oldServer: 'Astro shell; Elysia/Eden reaches commerce',
    oldClient: 'client:only TanStack Form + Query',
    nextServer: 'Validated submitCheckout server function + Router action',
    nextClient: 'Route store owns field draft and optimistic pending',
    authority: 'Commerce + D1 own totals, idempotency, and order',
  },
  {
    surface: 'Order status',
    oldServer: 'Private shell only; no PII in SSR',
    oldClient: 'Client-only TanStack query/polling owner',
    nextServer: 'Private server functions return safe snapshots',
    nextClient: 'Route owns fragment token, polling, and action state',
    authority: 'D1 order/payment; token moves to sessionStorage',
  },
] as const

const benchmarkRoutes = ['home', 'catalog', 'product'] as const
const benchmarkTargets = ['dund', 'plugged'] as const
const benchmarkFormFactors = ['mobile', 'desktop'] as const
const benchmarkTransitions = ['homeCatalog', 'catalogProduct'] as const

const benchmarkLabels = {
  routes: {
    home: 'Home',
    catalog: 'Catalog',
    product: 'Product',
  },
  targets: {
    dund: 'DUND',
    plugged: 'Plugged',
  },
  formFactors: {
    mobile: 'Mobile',
    desktop: 'Desktop',
  },
  transitions: {
    homeCatalog: 'Home → catalog',
    catalogProduct: 'Catalog → product',
  },
} as const

const formatMilliseconds = (value: number) =>
  value >= 1_000 ? `${(value / 1_000).toFixed(2)} s` : `${Math.round(value)} ms`

const formatBytes = (value: number) =>
  value >= 1_048_576 ? `${(value / 1_048_576).toFixed(2)} MiB` : `${(value / 1_024).toFixed(1)} KiB`

const formatScore = (value: number) => Math.round(value).toString()
const formatCls = (value: number) => value.toFixed(3)

const measuredAt = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
}).format(new Date(benchmark.measuredAt))

const excludedHttpSamples = benchmarkTargets.reduce(
  (targetTotal, target) =>
    targetTotal +
    benchmarkRoutes.reduce((routeTotal, route) => {
      const result = benchmark.http[target][route]
      return routeTotal + result.warm.excludedCount + (result.cacheBusted?.excludedCount ?? 0)
    }, 0),
  0,
)

const excludedLighthouseRuns = benchmarkTargets.reduce(
  (targetTotal, target) =>
    targetTotal +
    benchmarkRoutes.reduce(
      (routeTotal, route) =>
        routeTotal +
        benchmarkFormFactors.reduce(
          (formFactorTotal, formFactor) =>
            formFactorTotal + benchmark.lighthouse[target][route][formFactor].excludedRuns,
          0,
        ),
      0,
    ),
  0,
)

const matrixRows = [
  [
    'Initial HTML',
    'Complete Astro document for public routes.',
    'Turnkey SSR document with Router shell and inline frame HTML.',
    'Both can paint useful public content before client JavaScript.',
  ],
  [
    'Island / client-only behavior',
    'Separate Solid 1 roots. Product, checkout, and order status use client:only.',
    'One Solid 2 tree. Client components can sit beside or inside server-owned regions.',
    'Plugged has stronger local isolation; DUND has stronger shared ownership.',
  ],
  [
    'Navigation',
    'Browser requests and replaces complete documents.',
    'Router Next intercepts eligible anchors and changes route state.',
    'DUND adds SPA-like continuity and more navigation failure modes.',
  ],
  [
    'Persistent shell / state',
    'Layout HTML is recreated. Cart data survives through module storage + localStorage.',
    'Router function child, CartProvider, search, and cart remain mounted.',
    'Persistence is useful only for state that should actually survive.',
  ],
  [
    'Server bundle isolation',
    'Astro frontmatter and server packages stay in the Worker bundle.',
    '"use server" extraction removes body-only imports and server JSX from clients.',
    'Both require bundle scans; compiler boundaries are not authorization.',
  ],
  [
    'Data serialization',
    'Island props serialize client-required product records; client-only has no SSR island HTML.',
    'Frame-visible content is HTML; only client-required values become data. Product purchase is a current exception/workaround.',
    'Single-copy is a transport goal, not a blanket claim for every route.',
  ],
  [
    'Actions',
    'Shared headless storefront uses TanStack owners and Eden API calls.',
    'Router POST actions invoke validated server functions directly.',
    'Both end at shared commerce; DUND has fewer first-party transport layers.',
  ],
  [
    'Caching',
    'Public complete documents declare a 60 s Cloudflare CDN policy.',
    'Frame documents revalidate in the browser but are no-store at the shared CDN; frame responses are private/no-store.',
    'DUND deliberately gives up current document CDN hits until frame safety is proved.',
  ],
  [
    'Focus / history',
    'Native document navigation supplies normal browser focus/history reset behavior.',
    'App code restores main focus and filter focus; Router owns back/forward behavior.',
    'The persistent model needs explicit accessibility regression tests.',
  ],
  [
    'Testing requirements',
    'Unit/component tests plus Astro build; browser MPA behavior remains important.',
    'Built Worker, real D1, hydration, zero-boot-fetch, frame transport, stale routes, focus, actions, and bundle scans.',
    'The experimental stack carries a materially larger proof matrix.',
  ],
  [
    'Complexity / tradeoff',
    'Mature integrations and simpler document mental model; more separate client roots and handoff.',
    'Unified async/server/client ownership; pinned prereleases, local controls, and upstream workarounds.',
    'Neither choice dominates. Route shape and risk budget decide.',
  ],
] as const

function PathLabel(props: { children: Element }) {
  return (
    <p class="m-0 border-b border-white/20 bg-ink px-4 py-2 font-mono text-xs font-semibold break-all text-amber">
      {props.children}
    </p>
  )
}

function CodeBlock(props: { label: string; children: Element }) {
  return (
    <figure class="min-w-0 overflow-hidden border-2 border-ink bg-ink text-white">
      <figcaption>
        <PathLabel>{props.label}</PathLabel>
      </figcaption>
      <pre class="overflow-x-auto p-4 text-[0.78rem] leading-6 tab-2 sm:text-sm">
        <code>{props.children}</code>
      </pre>
    </figure>
  )
}

function DiagramTrack(props: { items: readonly string[]; tone: 'old' | 'next' }) {
  return (
    <ol class="grid gap-2 sm:grid-cols-4">
      {props.items.map((item, index) => (
        <li
          class={
            props.tone === 'old'
              ? 'relative flex min-h-20 items-center border-2 border-ink bg-white p-3 text-sm font-bold sm:after:absolute sm:after:top-1/2 sm:after:-right-3 sm:after:z-2 sm:after:-translate-y-1/2 sm:after:bg-white sm:after:px-1 sm:after:text-cobalt sm:after:content-["→"] last:sm:after:hidden'
              : 'relative flex min-h-20 items-center border-2 border-cobalt bg-cobalt p-3 text-sm font-bold text-white sm:after:absolute sm:after:top-1/2 sm:after:-right-3 sm:after:z-2 sm:after:-translate-y-1/2 sm:after:bg-white sm:after:px-1 sm:after:text-cobalt sm:after:content-["→"] last:sm:after:hidden'
          }
        >
          <span class="mr-2 text-xs opacity-70">0{index + 1}</span>
          {item}
        </li>
      ))}
    </ol>
  )
}

function EvidenceCard(props: {
  kind: 'Measured' | 'Pinned fact' | 'Architectural expectation'
  title: string
  value: string
  detail: string
}) {
  const measured = props.kind === 'Measured'
  return (
    <article class="min-w-0 border-t-3 border-ink py-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span
          class={
            measured
              ? 'inline-flex min-h-7 items-center bg-cobalt px-2 text-xs font-bold text-white'
              : 'inline-flex min-h-7 items-center border border-ink px-2 text-xs font-bold text-ink'
          }
        >
          {props.kind}
        </span>
        <strong class="text-2xl font-extrabold text-cobalt">{props.value}</strong>
      </div>
      <h3 class="mt-4 text-xl font-extrabold">{props.title}</h3>
      <p class="mt-2 text-sm leading-relaxed text-ink/70">{props.detail}</p>
    </article>
  )
}

function BenchmarkSummaryCard(props: {
  eyebrow: string
  title: string
  value: string
  detail: string
}) {
  return (
    <article class="min-w-0 border-2 border-ink bg-white p-5 shadow-[6px_6px_0_var(--color-ink)]">
      <p class="text-xs font-extrabold tracking-[0.12em] text-cobalt uppercase">{props.eyebrow}</p>
      <p class="mt-4 text-[clamp(1.6rem,4vw,2.5rem)] leading-none font-extrabold wrap-break-word">
        {props.value}
      </p>
      <h3 class="mt-4 text-lg font-extrabold">{props.title}</h3>
      <p class="mt-2 text-sm leading-relaxed text-ink/65">{props.detail}</p>
    </article>
  )
}

function HttpResultCards() {
  return (
    <div class="grid gap-3 lg:hidden">
      {benchmarkTargets.flatMap(target =>
        benchmarkRoutes.map(route => {
          const result = benchmark.http[target][route].warm
          return (
            <article class="min-w-0 border-2 border-ink bg-white p-4">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h4 class="text-lg font-extrabold">
                  {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]}
                </h4>
                <span class="text-xs font-bold text-cobalt">n={result.validCount}</span>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ['DNS', formatMilliseconds(result.metrics.dnsMs.median)],
                  ['TCP', formatMilliseconds(result.metrics.tcpMs.median)],
                  ['TLS', formatMilliseconds(result.metrics.tlsMs.median)],
                  ['TTFB', formatMilliseconds(result.metrics.ttfbMs.median)],
                  ['Download', formatMilliseconds(result.metrics.downloadMs.median)],
                  ['Total', formatMilliseconds(result.metrics.totalMs.median)],
                  ['Wire', formatBytes(result.metrics.transferredBytes.median)],
                  ['Decoded', formatBytes(result.metrics.decodedBytes.median)],
                ].map(([label, value]) => (
                  <div class="min-w-0 border-t border-ink/20 pt-2">
                    <dt class="text-xs font-bold text-ink/55">{label}</dt>
                    <dd class="mt-1 font-extrabold wrap-break-word">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        }),
      )}
    </div>
  )
}

function HttpResultTable() {
  return (
    <div class="hidden border-2 border-ink lg:block">
      <table class="w-full table-fixed border-collapse text-left text-xs xl:text-sm">
        <caption class="sr-only">Median warm HTTP response timings and transferred bytes</caption>
        <thead class="bg-ink text-white">
          <tr>
            {[
              'Target / route',
              'DNS',
              'TCP',
              'TLS',
              'TTFB',
              'Download',
              'Total',
              'Wire',
              'Decoded',
            ].map(heading => (
              <th class="p-3 font-extrabold wrap-break-word" scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {benchmarkTargets.flatMap(target =>
            benchmarkRoutes.map(route => {
              const result = benchmark.http[target][route].warm
              return (
                <tr class="border-b border-ink/20 align-top last:border-b-0">
                  <th class="bg-surface p-3 font-extrabold" scope="row">
                    {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]}
                    <span class="mt-1 block text-[0.68rem] font-semibold text-ink/55">
                      n={result.validCount}
                    </span>
                  </th>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.dnsMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.tcpMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.tlsMs.median)}
                  </td>
                  <td class="p-3 font-extrabold wrap-break-word text-cobalt">
                    {formatMilliseconds(result.metrics.ttfbMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.downloadMs.median)}
                  </td>
                  <td class="p-3 font-extrabold wrap-break-word">
                    {formatMilliseconds(result.metrics.totalMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatBytes(result.metrics.transferredBytes.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatBytes(result.metrics.decodedBytes.median)}
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

function LighthouseResultCards(props: { formFactor: (typeof benchmarkFormFactors)[number] }) {
  return (
    <div class="grid gap-3 lg:hidden">
      {benchmarkTargets.flatMap(target =>
        benchmarkRoutes.map(route => {
          const result = benchmark.lighthouse[target][route][props.formFactor]
          return (
            <article class="min-w-0 border-2 border-ink bg-white p-4">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h4 class="text-lg font-extrabold">
                  {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]}
                </h4>
                <span class="text-xs font-bold text-cobalt">n={result.validRuns}</span>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {[
                  ['Performance', formatScore(result.metrics.performance.median)],
                  ['FCP', formatMilliseconds(result.metrics.fcpMs.median)],
                  ['LCP', formatMilliseconds(result.metrics.lcpMs.median)],
                  ['Speed index', formatMilliseconds(result.metrics.speedIndexMs.median)],
                  ['TBT', formatMilliseconds(result.metrics.tbtMs.median)],
                  ['CLS', formatCls(result.metrics.cls.median)],
                  ['Accessibility', formatScore(result.metrics.accessibility.median)],
                  ['Best practices', formatScore(result.metrics.bestPractices.median)],
                ].map(([label, value]) => (
                  <div class="min-w-0 border-t border-ink/20 pt-2">
                    <dt class="text-xs font-bold text-ink/55">{label}</dt>
                    <dd class="mt-1 font-extrabold wrap-break-word">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        }),
      )}
    </div>
  )
}

function LighthouseResultTable(props: { formFactor: (typeof benchmarkFormFactors)[number] }) {
  return (
    <div class="hidden border-2 border-ink lg:block">
      <table class="w-full table-fixed border-collapse text-left text-xs">
        <caption class="sr-only">
          {benchmarkLabels.formFactors[props.formFactor]} Lighthouse median results
        </caption>
        <thead class="bg-ink text-white">
          <tr>
            {[
              'Target / route',
              'Performance',
              'FCP',
              'LCP',
              'Speed index',
              'TBT',
              'CLS',
              'A11y',
              'Best practices',
            ].map(heading => (
              <th class="p-3 font-extrabold wrap-break-word" scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {benchmarkTargets.flatMap(target =>
            benchmarkRoutes.map(route => {
              const result = benchmark.lighthouse[target][route][props.formFactor]
              return (
                <tr class="border-b border-ink/20 align-top last:border-b-0">
                  <th class="bg-surface p-3 font-extrabold" scope="row">
                    {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]}
                    <span class="mt-1 block text-[0.68rem] font-semibold text-ink/55">
                      n={result.validRuns}
                    </span>
                  </th>
                  <td class="p-3 text-lg font-extrabold text-cobalt">
                    {formatScore(result.metrics.performance.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.fcpMs.median)}
                  </td>
                  <td class="p-3 font-extrabold wrap-break-word">
                    {formatMilliseconds(result.metrics.lcpMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.speedIndexMs.median)}
                  </td>
                  <td class="p-3 wrap-break-word">
                    {formatMilliseconds(result.metrics.tbtMs.median)}
                  </td>
                  <td class="p-3">{formatCls(result.metrics.cls.median)}</td>
                  <td class="p-3">{formatScore(result.metrics.accessibility.median)}</td>
                  <td class="p-3">{formatScore(result.metrics.bestPractices.median)}</td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

function NavigationResultCards() {
  return (
    <div class="grid gap-3 lg:hidden">
      {benchmarkTargets.flatMap(target =>
        benchmarkTransitions.map(transition => {
          const result = benchmark.navigation[target][transition]
          return (
            <article class="min-w-0 border-2 border-ink bg-white p-4">
              <h4 class="text-lg font-extrabold">
                {benchmarkLabels.targets[target]} · {benchmarkLabels.transitions[transition]}
              </h4>
              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <div class="border-t border-ink/20 pt-2">
                  <dt class="text-xs font-bold text-ink/55">Median update</dt>
                  <dd class="mt-1 font-extrabold">
                    {formatMilliseconds(result.durationMs.median)}
                  </dd>
                </div>
                <div class="border-t border-ink/20 pt-2">
                  <dt class="text-xs font-bold text-ink/55">Median requests</dt>
                  <dd class="mt-1 font-extrabold">{result.requestCount.median}</dd>
                </div>
                <div class="border-t border-ink/20 pt-2">
                  <dt class="text-xs font-bold text-ink/55">Median wire</dt>
                  <dd class="mt-1 font-extrabold">{formatBytes(result.transferredBytes.median)}</dd>
                </div>
                <div class="border-t border-ink/20 pt-2">
                  <dt class="text-xs font-bold text-ink/55">Transport</dt>
                  <dd class="mt-1 font-extrabold">
                    {result.fullDocumentCount === result.sampleCount
                      ? 'Document'
                      : 'Router / frame'}
                  </dd>
                </div>
              </dl>
            </article>
          )
        }),
      )}
    </div>
  )
}

function NavigationResultTable() {
  return (
    <div class="hidden border-2 border-ink lg:block">
      <table class="w-full table-fixed border-collapse text-left text-sm">
        <caption class="sr-only">Warm app-navigation benchmark results</caption>
        <thead class="bg-ink text-white">
          <tr>
            {['Target / transition', 'Update', 'Requests', 'Wire', 'Transport', 'State'].map(
              heading => (
                <th class="p-3 font-extrabold wrap-break-word" scope="col">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {benchmarkTargets.flatMap(target =>
            benchmarkTransitions.map(transition => {
              const result = benchmark.navigation[target][transition]
              const state = benchmark.navigation[target].state
              return (
                <tr class="border-b border-ink/20 align-top last:border-b-0">
                  <th class="bg-surface p-3 font-extrabold" scope="row">
                    {benchmarkLabels.targets[target]} · {benchmarkLabels.transitions[transition]}
                    <span class="mt-1 block text-xs font-semibold text-ink/55">
                      n={result.sampleCount}
                    </span>
                  </th>
                  <td class="p-3 font-extrabold text-cobalt">
                    {formatMilliseconds(result.durationMs.median)}
                  </td>
                  <td class="p-3">{result.requestCount.median}</td>
                  <td class="p-3">{formatBytes(result.transferredBytes.median)}</td>
                  <td class="p-3">
                    {result.fullDocumentCount === result.sampleCount
                      ? 'Complete document'
                      : 'Router / frame work'}
                  </td>
                  <td class="p-3 leading-relaxed">
                    Shell node {state.shellNodePersisted ? 'persisted' : 'recreated'}; cart draft{' '}
                    {state.cartItemCountAfterFlows > 0 ? 'remained' : 'did not remain'}.
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

export async function getArchitectureReviewFrame() {
  return (props: ReviewFrameProps) => (
    <main id="main-content" tabindex="-1" class="overflow-x-clip bg-white text-ink">
      <header class="border-b-3 border-ink bg-amber px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]">
        <div class="mx-auto max-w-360">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink pb-4">
            <p class="m-0 font-bold text-cobalt">DUND engineering review / Solid 2 beta.26</p>
            <p class="m-0 text-sm font-semibold">Repository baseline: 3734212</p>
          </div>
          <div class="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h1 class="max-w-[13ch] text-[clamp(3rem,8vw,5.75rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-balance">
                Two storefronts. Two ownership models.
              </h1>
              <p class="mt-6 max-w-[68ch] text-lg leading-relaxed sm:text-xl">
                Review the current Plugged Astro/Solid 1 architecture against DUND's Solid 2 Router,
                server functions, and experimental frames. This page describes the code that is
                deployed now—not an idealized framework demo.
              </p>
            </div>
            <div class="border-3 border-ink bg-white p-5 shadow-[10px_10px_0_var(--color-cobalt)]">
              <p class="font-bold text-cobalt">Review stance</p>
              <p class="mt-2 text-lg font-extrabold">Frames are a different ownership tradeoff.</p>
              <p class="mt-3 text-sm leading-relaxed text-ink/70">
                They are not automatically faster, smaller, simpler, or more cacheable. Compare
                measured behavior before choosing the next store architecture.
              </p>
            </div>
          </div>
          <div class="mt-8 flex flex-wrap gap-3">
            <a
              class="inline-flex min-h-12 items-center bg-ink px-5 font-bold text-white no-underline"
              href="https://dund.darjs.dev"
              target="_blank"
              rel="noreferrer"
            >
              Open live DUND ↗
            </a>
            <a
              class="inline-flex min-h-12 items-center bg-cobalt px-5 font-bold text-white no-underline"
              href="https://storekit.plugged.darjs.dev"
              target="_blank"
              rel="noreferrer"
            >
              Open live Plugged ↗
            </a>
            <a
              class="inline-flex min-h-12 items-center border-2 border-ink bg-white px-5 font-bold text-ink no-underline"
              href="/products"
            >
              Back to DUND capsule
            </a>
          </div>
        </div>
      </header>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(3rem,7vw,6rem)]"
        aria-labelledby="overview-title"
      >
        <div class="mx-auto max-w-360">
          <h2
            id="overview-title"
            class="max-w-[18ch] text-4xl leading-none font-extrabold sm:text-6xl"
          >
            Architecture at one glance
          </h2>
          <div class="mt-8 grid border-3 border-ink lg:grid-cols-2">
            <article class="min-w-0 border-b-3 border-ink bg-surface p-[clamp(1rem,3vw,2rem)] lg:border-r-3 lg:border-b-0">
              <p class="font-bold text-cobalt">Plugged · Astro 7 + Solid 1 islands</p>
              <h3 class="mt-3 text-3xl font-extrabold">Documents with independent controls</h3>
              <pre class="mt-6 overflow-x-auto border-y border-ink/25 py-4 text-sm leading-7">
                <code>{`request URL
  → Astro route/frontmatter
  → commerce + D1
  → complete HTML document
  → separate Solid islands
  → Eden / TanStack for client data`}</code>
              </pre>
              <p class="mt-5 max-w-prose leading-relaxed">
                Public route content is server-owned per document. Product purchase, checkout, and
                order status are client-only islands. The cart is shared through a module-scoped
                browser store and localStorage, not through one page owner tree.
              </p>
            </article>
            <article class="min-w-0 bg-white p-[clamp(1rem,3vw,2rem)]">
              <p class="font-bold text-cobalt">DUND · Solid 2 + Router Next + frames</p>
              <h3 class="mt-3 text-3xl font-extrabold">One shell around live server HTML</h3>
              <pre class="mt-6 overflow-x-auto border-y border-ink/25 py-4 text-sm leading-7">
                <code>{`request URL
  → turnkey Router SSR
  → server function / commerce
  → HTML frame stream
  → persistent client shell
  → action + authoritative refresh`}</code>
              </pre>
              <p class="mt-5 max-w-prose leading-relaxed">
                The Router child, cart, and shell have persistent client owners. Home, catalog, and
                product facts can stay server-owned HTML. Client controls own explicit positions or
                mount beside a frame when they need a stable app context.
              </p>
            </article>
          </div>
        </div>
      </section>

      {props.lab()}

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="flows-title"
      >
        <div class="mx-auto max-w-360">
          <div class="max-w-4xl">
            <h2 id="flows-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
              Five request flows
            </h2>
            <p class="mt-5 max-w-[70ch] text-lg leading-relaxed text-ink/70">
              Read each row from left to right. Blue nodes are DUND's server/frame path; white nodes
              are Plugged's document/island path.
            </p>
          </div>
          <div class="mt-9 divide-y-3 divide-ink">
            {flowSteps.map(flow => (
              <article class="py-8">
                <div class="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
                  <div>
                    <h3 class="text-2xl font-extrabold">{flow.title}</h3>
                    <p class="mt-2 text-sm leading-relaxed text-ink/65">{flow.note}</p>
                  </div>
                  <div class="grid min-w-0 gap-4">
                    <div>
                      <p class="mb-2 text-sm font-bold">Plugged</p>
                      <DiagramTrack items={flow.old} tone="old" />
                    </div>
                    <div>
                      <p class="mb-2 text-sm font-bold text-cobalt">DUND</p>
                      <DiagramTrack items={flow.next} tone="next" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        class="bg-ink px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)] text-white"
        aria-labelledby="sources-title"
      >
        <div class="mx-auto max-w-360">
          <h2 id="sources-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
            Source map and actual seams
          </h2>
          <p class="mt-5 max-w-[70ch] text-lg leading-relaxed text-white/70">
            These are curated excerpts from the current repository. Line labels refer to commit
            3734212 before this review route was added. No Worker resource IDs or provider values
            are included.
          </p>

          <div class="mt-9 grid gap-5 lg:grid-cols-2">
            <CodeBlock label="apps/plugged/src/pages/products/[slug].astro · L8–16, L67">
              <span class="text-amber">const</span> result = <span class="text-coral">await</span>{' '}
              commerce.catalog.getProduct(Astro.params.slug ??{' '}
              <span class="text-amber">&quot;&quot;</span>){'\n'}
              <span class="text-amber">const</span> product = result.value
              {'\n'}
              <span class="text-amber">const</span> purchaseProduct = {'{'} ...product, images: ...{' '}
              {'}'}
              {'\n\n'}&lt;<span class="text-coral">ProductPurchase</span> product={'{'}
              purchaseProduct{'}'}
              {'\n'} <span class="text-amber">client:only</span>=&quot;solid-js&quot; /&gt;
            </CodeBlock>
            <CodeBlock label="apps/demo-solid-store/src/routes/ProductPage.tsx · L49, L86–108">
              <span class="text-amber">const</span> product = createMemo(() =&gt;
              getProductPage(params.slug))
              {'\n'}
              <span class="text-amber">const</span> ProductDetails = dynamic(() =&gt;
              {'\n'} getProductDetailsFrame(params.slug))
              {'\n\n'}&lt;<span class="text-coral">ProductPurchase</span> product={'{'}
              props.data.product{'}'} /&gt;
              {'\n'}&lt;<span class="text-coral">ProductDetails</span> /&gt;
            </CodeBlock>
            <CodeBlock label="apps/plugged/src/layouts/Layout.astro · L68–78">
              &lt;slot /&gt;
              {'\n'}&lt;footer&gt;...&lt;/footer&gt;
              {'\n'}&lt;<span class="text-coral">StoreChrome</span>{' '}
              <span class="text-amber">client:load</span> /&gt;
            </CodeBlock>
            <CodeBlock label="apps/demo-solid-store/src/App.tsx · L8–17">
              &lt;<span class="text-coral">Router</span>&gt;
              {'\n'} {'{'}props =&gt; ({'\n'} &lt;<span class="text-coral">CartProvider</span>&gt;
              {'\n'} &lt;<span class="text-coral">AppShell</span>&gt;{'{'}props.children{'}'}
              &lt;/AppShell&gt;
              {'\n'} &lt;/CartProvider&gt;
              {'\n'} ){'}'}
              {'\n'}&lt;/Router&gt;
            </CodeBlock>
            <CodeBlock label="apps/plugged/src/pages/checkout.astro · L5–8">
              &lt;Layout title=&quot;Захиалга · Plugged&quot;&gt;
              {'\n'} &lt;main id=&quot;main-content&quot;&gt;
              {'\n'} &lt;<span class="text-coral">CheckoutForm</span>{' '}
              <span class="text-amber">client:only</span>=&quot;solid-js&quot; /&gt;
              {'\n'} &lt;/main&gt;
              {'\n'}&lt;/Layout&gt;
            </CodeBlock>
            <CodeBlock label="apps/demo-solid-store/src/server/checkout.ts · L56–73, L97">
              <span class="text-amber">export async function</span> submitCheckout(form: FormData){' '}
              {'{'}
              {'\n'} <span class="text-coral">&apos;use server&apos;</span>
              {'\n'} <span class="text-amber">await</span> enforceRateLimit(...)
              {'\n'} <span class="text-amber">const</span> input = checkoutFormInput(form)
              {'\n'} <span class="text-amber">if</span> (!Value.Check(checkoutInputSchema, input))
              ...
              {'\n'} <span class="text-amber">return await</span>{' '}
              commerce.checkout.createOrder(input as CheckoutInput)
              {'\n'}
              {'}'}
              {'\n'}
              <span class="text-amber">export const</span> checkoutAction = action(submitCheckout)
            </CodeBlock>
          </div>

          <div class="mt-9 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Plugged shell', 'apps/plugged/src/layouts/Layout.astro'],
              ['Plugged route data', 'apps/plugged/src/pages/{index,products/**}.astro'],
              [
                'Plugged client owners',
                'apps/plugged/src/components/{StoreChrome,CheckoutForm,OrderStatus}.tsx',
              ],
              ['DUND route tree', 'apps/demo-solid-store/src/app/router.ts'],
              [
                'DUND persistent shell',
                'apps/demo-solid-store/src/{App.tsx,cart/CartProvider.tsx}',
              ],
              ['DUND frame/data boundary', 'apps/demo-solid-store/src/server/catalog.tsx'],
              ['DUND route owners', 'apps/demo-solid-store/src/routes/*.tsx'],
              ['DUND Worker policy', 'apps/demo-solid-store/worker.js'],
              ['Real runtime proof', 'apps/demo-solid-store/test/run.mjs'],
            ].map(([label, path]) => (
              <p class="m-0 border border-white/25 p-3">
                <strong class="block text-amber">{label}</strong>
                <code class="mt-1 block break-all text-white/70">{path}</code>
              </p>
            ))}
          </div>
        </div>
      </section>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="owners-title"
      >
        <div class="mx-auto max-w-360">
          <h2 id="owners-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
            Server, client, and data owners
          </h2>
          <p class="mt-5 max-w-[70ch] text-lg leading-relaxed text-ink/70">
            “Server-owned” names the rendered surface. “Authority” names the source that can decide
            price, stock, payment, or order truth.
          </p>
          <div class="mt-8 overflow-x-auto border-2 border-ink">
            <table class="w-full min-w-6xl border-collapse text-left text-sm">
              <thead class="bg-amber">
                <tr>
                  {[
                    'Surface',
                    'Plugged server',
                    'Plugged client',
                    'DUND server',
                    'DUND client',
                    'Authority',
                  ].map(heading => (
                    <th class="border-b-2 border-ink p-3 font-extrabold" scope="col">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ownershipRows.map(row => (
                  <tr class="border-b border-ink/20 align-top last:border-b-0">
                    <th class="bg-surface p-3 text-base font-extrabold" scope="row">
                      {row.surface}
                    </th>
                    <td class="p-3">{row.oldServer}</td>
                    <td class="p-3">{row.oldClient}</td>
                    <td class="p-3">{row.nextServer}</td>
                    <td class="p-3">{row.nextClient}</td>
                    <td class="p-3 font-semibold text-cobalt">{row.authority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        class="border-y-3 border-ink bg-amber px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="purchase-boundary-title"
      >
        <div class="mx-auto grid max-w-360 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p class="font-bold text-cobalt">Pinned beta limitation</p>
            <h2
              id="purchase-boundary-title"
              class="mt-3 text-4xl leading-none font-extrabold sm:text-6xl"
            >
              Why ProductPurchase sits outside the details frame
            </h2>
          </div>
          <div class="border-3 border-ink bg-white p-[clamp(1.25rem,4vw,3rem)]">
            <p class="text-lg leading-relaxed">
              The first DUND product frame passed <code>ProductPurchase</code> as a client slot. A
              direct load hydrated, but catalog-to-product navigation failed with{' '}
              <code>NoOwnerError → getContext → useContext → useCart</code>.
            </p>
            <ol class="mt-6 grid gap-4">
              <li class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                <strong class="grid size-10 place-items-center bg-cobalt text-white">1</strong>
                <p>
                  In <code>@solidjs/web@2.0.0-beta.26</code>, a fresh frame slot is invoked without
                  applying its captured <code>ownerScope</code>.
                </p>
              </li>
              <li class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                <strong class="grid size-10 place-items-center bg-cobalt text-white">2</strong>
                <p>
                  <code>ProductPurchase</code> calls <code>useCart()</code>. On client navigation,
                  the fresh slot could not see the persistent <code>CartProvider</code> owner.
                </p>
              </li>
              <li class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                <strong class="grid size-10 place-items-center bg-cobalt text-white">3</strong>
                <p>
                  The current route calls <code>getProductPage()</code> for safe purchase data and
                  mounts <code>ProductPurchase</code> directly under the Router shell. Only
                  description and facts use <code>getProductDetailsFrame()</code>.
                </p>
              </li>
            </ol>
            <div class="mt-6 border-t-2 border-ink pt-5">
              <h3 class="text-xl font-extrabold">Cost of the workaround</h3>
              <p class="mt-2 leading-relaxed text-ink/70">
                Purchase data now crosses as client-consumed data, and product navigation can do
                separate purchase-data and details-frame work. This is less elegant than the
                intended slot composition. It is a deliberate correctness trade—not proof that
                product controls should generally live outside frames.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="matrix-title"
      >
        <div class="mx-auto max-w-360">
          <h2 id="matrix-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
            Comparison matrix
          </h2>
          <div class="mt-8 overflow-x-auto border-2 border-ink">
            <table class="w-full min-w-5xl border-collapse text-left text-sm">
              <thead class="bg-ink text-white">
                <tr>
                  {['Concern', 'Plugged · Astro / Solid 1', 'DUND · Solid 2', 'Review note'].map(
                    heading => (
                      <th class="border-b-2 border-white/25 p-4 font-extrabold" scope="col">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(row => (
                  <tr class="border-b border-ink/20 align-top last:border-b-0">
                    <th class="w-48 bg-surface p-4 text-base font-extrabold" scope="row">
                      {row[0]}
                    </th>
                    <td class="p-4">{row[1]}</td>
                    <td class="p-4">{row[2]}</td>
                    <td class="p-4 font-semibold text-cobalt">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="benchmarks"
        class="border-y-3 border-ink bg-amber px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)] [&_code]:wrap-anywhere"
        aria-labelledby="benchmark-title"
      >
        <div class="mx-auto max-w-360">
          <div class="grid gap-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div>
              <p class="font-bold text-cobalt">Measured on the deployed stores</p>
              <h2
                id="benchmark-title"
                class="mt-3 max-w-[16ch] text-4xl leading-none font-extrabold sm:text-6xl"
              >
                Real timings, mixed results, no framework victory lap.
              </h2>
              <p class="mt-5 max-w-[72ch] text-lg leading-relaxed text-ink/75">
                These measurements compare the current DUND Solid 2 deployment with the previous
                Plugged Astro/Solid 1 demo from the same Ulaanbaatar host. Medians reduce noise; p75
                and p95 remain available below. A result is a measured fact. The explanation is a
                hypothesis unless a separate experiment isolates it.
              </p>
            </div>
            <aside class="border-3 border-ink bg-white p-5">
              <p class="text-xs font-extrabold tracking-[0.12em] text-cobalt uppercase">Snapshot</p>
              <p class="mt-3 text-xl font-extrabold">{measuredAt} UTC</p>
              <p class="mt-2 text-sm leading-relaxed text-ink/65">
                {benchmark.environment.cpu} · {benchmark.environment.logicalCpuCount} logical CPUs ·
                Cloudflare edge colos are recorded per HTTP sample.
              </p>
            </aside>
          </div>

          <nav class="mt-8 border-y-2 border-ink py-4" aria-label="Benchmarked routes">
            <p class="text-xs font-extrabold tracking-[0.12em] text-cobalt uppercase">
              Direct links to every tested route
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              {benchmarkTargets.flatMap(target =>
                benchmarkRoutes.map(route => (
                  <a
                    class="inline-flex min-h-11 items-center border-2 border-ink bg-white px-3 text-sm font-bold text-ink no-underline hover:bg-surface"
                    href={benchmark.targets[target].routes[route]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]} ↗
                  </a>
                )),
              )}
            </div>
          </nav>

          <div class="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BenchmarkSummaryCard
              eyebrow="Warm HTTP · product"
              value={`${formatMilliseconds(benchmark.http.dund.product.warm.metrics.totalMs.median)} / ${formatMilliseconds(benchmark.http.plugged.product.warm.metrics.totalMs.median)}`}
              title="DUND / Plugged median total"
              detail={`25 valid requests per route. DUND reported ${Object.keys(benchmark.http.dund.product.warm.cache.cfCacheStatus).join(', ')}; Plugged reported ${Object.keys(benchmark.http.plugged.product.warm.cache.cfCacheStatus).join(', ')}.`}
            />
            <BenchmarkSummaryCard
              eyebrow="Lighthouse mobile · home"
              value={`${formatMilliseconds(benchmark.lighthouse.dund.home.mobile.metrics.lcpMs.median)} / ${formatMilliseconds(benchmark.lighthouse.plugged.home.mobile.metrics.lcpMs.median)}`}
              title="DUND / Plugged median LCP"
              detail="Three valid cold Lighthouse navigations per target, route, and form factor. This is lab LCP, not field data."
            />
            <BenchmarkSummaryCard
              eyebrow="Warm app navigation"
              value={`${formatMilliseconds(benchmark.navigation.dund.catalogProduct.durationMs.median)} / ${formatMilliseconds(benchmark.navigation.plugged.catalogProduct.durationMs.median)}`}
              title="Catalog → product, DUND / Plugged"
              detail="Nine measured runs after one excluded warm-up. The destination h1 marks the end of the update interval."
            />
            <BenchmarkSummaryCard
              eyebrow="Valid evidence volume"
              value="165 + 36 + 36"
              title="HTTP + Lighthouse + navigation samples"
              detail={`Six HTTP route cases, twelve Lighthouse route/device cases, and four app-navigation cases. ${excludedHttpSamples} incomplete HTTP transfer(s) and ${excludedLighthouseRuns} invalid Lighthouse run(s) were retained as exclusions, not folded into medians.`}
            />
          </div>

          <div class="mt-14">
            <div class="max-w-4xl">
              <p class="font-bold text-cobalt">1 · HTTP from this host</p>
              <h3 class="mt-2 text-3xl font-extrabold sm:text-4xl">Warm route response medians</h3>
              <p class="mt-4 max-w-[72ch] leading-relaxed text-ink/70">
                Curl opened a new HTTPS transfer for each request and accepted compressed HTML.
                “Wire” is the compressed body that curl received; “decoded” is the expanded body.
                TCP and TLS are phase durations, while TTFB is elapsed from request start.
              </p>
            </div>
            <div class="mt-6">
              <HttpResultCards />
              <HttpResultTable />
            </div>
            <div class="mt-6 border-2 border-ink bg-white p-4 sm:p-5">
              <div class="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
                <div>
                  <h4 class="text-xl font-extrabold">Bounded cache-busted approximation</h4>
                  <p class="mt-2 text-sm leading-relaxed text-ink/65">
                    Plugged only · five unique queries per route. DUND is marked not applicable
                    because its frame documents already bypass shared CDN storage.
                  </p>
                </div>
                <div class="grid gap-3 sm:grid-cols-3">
                  {benchmarkRoutes.map(route => {
                    const result = benchmark.http.plugged[route].cacheBusted
                    return (
                      <article class="min-w-0 border-t-2 border-ink pt-3">
                        <h5 class="font-extrabold">Plugged · {benchmarkLabels.routes[route]}</h5>
                        <p class="mt-2 text-2xl font-extrabold text-cobalt">
                          {formatMilliseconds(result.metrics.totalMs.median)}
                        </p>
                        <p class="mt-1 text-xs leading-relaxed text-ink/60">
                          Total p75 {formatMilliseconds(result.metrics.totalMs.p75)} · p95{' '}
                          {formatMilliseconds(result.metrics.totalMs.p95)} ·{' '}
                          {Object.entries(result.cache.cfCacheStatus)
                            .map(([status, count]) => `${status} × ${count}`)
                            .join(', ')}
                          {result.excludedCount > 0
                            ? ` · ${result.excludedCount} incomplete attempt(s) excluded`
                            : ''}
                        </p>
                      </article>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-14 border-t-3 border-ink pt-10">
            <div class="max-w-4xl">
              <p class="font-bold text-cobalt">2 · Lighthouse 13.4.1 lab</p>
              <h3 class="mt-2 text-3xl font-extrabold sm:text-4xl">
                Cold mobile and desktop navigations
              </h3>
              <p class="mt-4 max-w-[72ch] leading-relaxed text-ink/70">
                Each cell is the median of three valid runs in the same Playwright Chromium. Mobile
                uses Lighthouse's default mobile preset; desktop uses its desktop preset. TBT is a
                lab responsiveness proxy. Lighthouse does not provide a valid INP measurement here;
                INP needs field data or a controlled interaction study.
              </p>
            </div>
            <div class="mt-8 grid gap-10">
              {benchmarkFormFactors.map(formFactor => (
                <section aria-labelledby={`benchmark-${formFactor}-title`}>
                  <h4 id={`benchmark-${formFactor}-title`} class="mb-4 text-2xl font-extrabold">
                    {benchmarkLabels.formFactors[formFactor]}
                  </h4>
                  <LighthouseResultCards formFactor={formFactor} />
                  <LighthouseResultTable formFactor={formFactor} />
                </section>
              ))}
            </div>
          </div>

          <div class="mt-14 border-t-3 border-ink pt-10">
            <div class="max-w-4xl">
              <p class="font-bold text-cobalt">3 · App-navigation measurement</p>
              <h3 class="mt-2 text-3xl font-extrabold sm:text-4xl">Click to destination heading</h3>
              <p class="mt-4 max-w-[72ch] leading-relaxed text-ink/70">
                This is not Lighthouse and not INP. A real Chromium session measured home → catalog
                and catalog → product with <code>performance.now()</code>, then summed CDP network
                transfer bytes. DUND kept its Router shell and used server-function/frame work;
                Plugged completed full-document navigations. Both retained the cart draft in browser
                storage, but only DUND retained the same shell DOM owner.
              </p>
            </div>
            <div class="mt-6">
              <NavigationResultCards />
              <NavigationResultTable />
            </div>
          </div>

          <div class="mt-14 grid min-w-0 gap-6 border-t-3 border-ink pt-10 lg:grid-cols-2">
            <article class="min-w-0 border-2 border-ink bg-white p-[clamp(1rem,3vw,2rem)]">
              <h3 class="text-2xl font-extrabold">Reproduce it</h3>
              <ol class="mt-5 grid gap-4 pl-5 leading-relaxed marker:font-bold marker:text-cobalt">
                <li>
                  From the repository root, run <code>vp install</code>.
                </li>
                <li>
                  Run <code>node apps/demo-solid-store/benchmark/run.mjs</code>. The script pins
                  Lighthouse 13.4.1 through ephemeral <code>vpx</code> execution and uses the app's
                  existing Playwright Chromium.
                </li>
                <li>
                  Review <code>apps/demo-solid-store/src/benchmark/solid2-vs-plugged.json</code> for
                  tool versions, ordering, aggregation, compact per-run results, cache headers, and
                  exclusions.
                </li>
              </ol>
              <p class="mt-6 border-t border-ink/20 pt-4 text-sm leading-relaxed text-ink/65">
                HTTP: 10 route-grouped sequential samples plus 15 deterministically shuffled samples
                per target and route. Plugged also received five bounded unique-query samples per
                route as a cold-cache approximation. DUND did not: its frame documents are no-store
                at the shared CDN, so cache busting adds no useful cache state.
              </p>
            </article>
            <article class="min-w-0 border-2 border-ink bg-ink p-[clamp(1rem,3vw,2rem)] text-white">
              <h3 class="text-2xl font-extrabold text-amber">Limits and likely influences</h3>
              <ul class="mt-5 grid gap-4 pl-5 leading-relaxed marker:text-coral">
                <li>
                  This is one host and one measurement window. Network and edge conditions can
                  change. Three Lighthouse runs expose large shifts poorly; their p95 is effectively
                  the slowest run.
                </li>
                <li>
                  Lighthouse warned that this host's CPU was slower than its expected calibration on
                  some otherwise valid runs. {excludedLighthouseRuns} incomplete page-load
                  attempt(s) were excluded and replaced; the raw reasons remain below.
                </li>
                <li>
                  Different branding, content, media, route complexity, and development/demo
                  deployments make this directional—not a controlled framework bake-off.
                </li>
                <li>
                  Cache status, compressed document size, image bytes, server work, client
                  JavaScript, and navigation transport can plausibly influence results. These
                  measurements do not prove that framework choice caused a difference.
                </li>
                <li>
                  Plugged can serve public document cache hits. DUND deliberately bypasses shared
                  document storage for its frame-bearing routes. That policy difference is measured;
                  its isolated performance effect is not.
                </li>
              </ul>
            </article>
          </div>

          <div class="mt-10 grid gap-3" aria-label="Expandable raw benchmark summaries">
            <details class="group border-2 border-ink bg-white">
              <summary class="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                HTTP p75 / p95 and cache summaries
                <span
                  aria-hidden="true"
                  class="text-cobalt group-open:rotate-45 motion-reduce:transform-none"
                >
                  +
                </span>
              </summary>
              <div class="grid gap-3 border-t-2 border-ink p-4 md:grid-cols-2 xl:grid-cols-3">
                {benchmarkTargets.flatMap(target =>
                  benchmarkRoutes.map(route => {
                    const result = benchmark.http[target][route].warm
                    return (
                      <article class="min-w-0 border border-ink/30 p-3 text-sm">
                        <h4 class="font-extrabold">
                          {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]}
                        </h4>
                        <dl class="mt-3 grid grid-cols-2 gap-2">
                          {(
                            [
                              ['DNS', result.metrics.dnsMs],
                              ['TCP', result.metrics.tcpMs],
                              ['TLS', result.metrics.tlsMs],
                              ['TTFB', result.metrics.ttfbMs],
                              ['Download', result.metrics.downloadMs],
                              ['Total', result.metrics.totalMs],
                            ] as const
                          ).map(([label, metric]) => (
                            <div class="min-w-0 border-t border-ink/15 pt-2">
                              <dt class="font-bold text-ink/55">{label}</dt>
                              <dd class="wrap-break-word">
                                p75 {formatMilliseconds(metric.p75)} · p95{' '}
                                {formatMilliseconds(metric.p95)} · max{' '}
                                {formatMilliseconds(metric.max)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p class="mt-3 wrap-break-word text-ink/65">
                          Wire p75 {formatBytes(result.metrics.transferredBytes.p75)} · p95{' '}
                          {formatBytes(result.metrics.transferredBytes.p95)}; decoded p75{' '}
                          {formatBytes(result.metrics.decodedBytes.p75)} · p95{' '}
                          {formatBytes(result.metrics.decodedBytes.p95)}.
                        </p>
                        {result.excludedCount > 0 && (
                          <p class="mt-3 font-bold text-coral">
                            {result.excludedCount} incomplete transfer(s) excluded after bounded
                            retry.
                          </p>
                        )}
                        <p class="mt-3 wrap-break-word text-ink/65">
                          HTTP status:{' '}
                          {Object.entries(result.status)
                            .map(([status, count]) => `${status} × ${count}`)
                            .join(', ')}
                        </p>
                        <p class="mt-1 wrap-break-word text-ink/65">
                          Cache status:{' '}
                          {Object.entries(result.cache.cfCacheStatus)
                            .map(([status, count]) => `${status} × ${count}`)
                            .join(', ')}
                        </p>
                        <p class="mt-1 wrap-break-word text-ink/65">
                          Cache-Control:{' '}
                          {Object.entries(result.cache.cacheControl)
                            .map(([value, count]) => `${value} × ${count}`)
                            .join(', ')}
                        </p>
                        <p class="mt-1 wrap-break-word text-ink/65">
                          Encoding / edge: {Object.keys(result.cache.contentEncoding).join(', ')} /{' '}
                          {Object.keys(result.cache.edgeColo).join(', ')}
                        </p>
                      </article>
                    )
                  }),
                )}
              </div>
            </details>

            <details class="group border-2 border-ink bg-white">
              <summary class="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                Lighthouse valid runs and exclusions
                <span
                  aria-hidden="true"
                  class="text-cobalt group-open:rotate-45 motion-reduce:transform-none"
                >
                  +
                </span>
              </summary>
              <div class="grid gap-3 border-t-2 border-ink p-4 md:grid-cols-2 xl:grid-cols-3">
                {benchmarkTargets.flatMap(target =>
                  benchmarkRoutes.flatMap(route =>
                    benchmarkFormFactors.map(formFactor => {
                      const result = benchmark.lighthouse[target][route][formFactor]
                      return (
                        <article class="min-w-0 border border-ink/30 p-3 text-sm">
                          <h4 class="font-extrabold">
                            {benchmarkLabels.targets[target]} · {benchmarkLabels.routes[route]} ·{' '}
                            {benchmarkLabels.formFactors[formFactor]}
                          </h4>
                          <p class="mt-2 text-ink/65">
                            {result.validRuns} valid / {result.attemptedRuns} attempted;{' '}
                            {result.excludedRuns} excluded.
                          </p>
                          <ol class="mt-3 grid gap-1 pl-5 font-mono text-xs wrap-break-word">
                            {result.runs
                              .filter(run => run.valid)
                              .map(run => (
                                <li>
                                  P {formatScore(run.metrics.performance)} · FCP{' '}
                                  {formatMilliseconds(run.metrics.fcpMs)} · LCP{' '}
                                  {formatMilliseconds(run.metrics.lcpMs)} · SI{' '}
                                  {formatMilliseconds(run.metrics.speedIndexMs)} · TBT{' '}
                                  {formatMilliseconds(run.metrics.tbtMs)} · CLS{' '}
                                  {formatCls(run.metrics.cls)}
                                </li>
                              ))}
                          </ol>
                          {result.runs.some(run => run.warnings.length > 0) && (
                            <p class="mt-3 wrap-anywhere text-ink/65">
                              Warnings:{' '}
                              {result.runs
                                .flatMap(run => run.warnings)
                                .filter(
                                  (warning, index, warnings) => warnings.indexOf(warning) === index,
                                )
                                .join('; ')}
                            </p>
                          )}
                          {result.excludedRuns > 0 && (
                            <p class="mt-3 wrap-anywhere text-coral">
                              Excluded: {result.exclusions.join('; ')}
                            </p>
                          )}
                        </article>
                      )
                    }),
                  ),
                )}
              </div>
            </details>

            <details class="group border-2 border-ink bg-white">
              <summary class="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 font-extrabold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                App-navigation per-run summaries
                <span
                  aria-hidden="true"
                  class="text-cobalt group-open:rotate-45 motion-reduce:transform-none"
                >
                  +
                </span>
              </summary>
              <div class="grid gap-3 border-t-2 border-ink p-4 md:grid-cols-2">
                {benchmarkTargets.flatMap(target =>
                  benchmarkTransitions.map(transition => {
                    const result = benchmark.navigation[target][transition]
                    return (
                      <article class="min-w-0 border border-ink/30 p-3 text-sm">
                        <h4 class="font-extrabold">
                          {benchmarkLabels.targets[target]} ·{' '}
                          {benchmarkLabels.transitions[transition]}
                        </h4>
                        <p class="mt-2 wrap-break-word text-ink/65">
                          Duration:{' '}
                          {result.runs.map(run => formatMilliseconds(run.durationMs)).join(', ')}
                        </p>
                        <p class="mt-1 wrap-break-word text-ink/65">
                          Requests: {result.runs.map(run => run.requestCount).join(', ')}
                        </p>
                        <p class="mt-1 wrap-break-word text-ink/65">
                          Wire:{' '}
                          {result.runs.map(run => formatBytes(run.transferredBytes)).join(', ')}
                        </p>
                      </article>
                    )
                  }),
                )}
              </div>
            </details>
          </div>
        </div>
      </section>

      <section
        class="bg-surface px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="evidence-title"
      >
        <div class="mx-auto max-w-360">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
            <div>
              <h2 id="evidence-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
                Evidence, not inference
              </h2>
              <p class="mt-5 max-w-[58ch] leading-relaxed text-ink/70">
                “Measured” cards come from the production build running through the real local
                Wrangler Worker and D1 setup. Expectations describe architecture and still need a
                regression test whenever behavior matters.
              </p>
            </div>
            <div class="grid gap-x-6 sm:grid-cols-2">
              <EvidenceCard
                kind="Measured"
                value="0"
                title="Boot frame requests"
                detail="Direct product and review loads were observed in Chromium. Initial frame HTML was adopted without a /_server component fetch."
              />
              <EvidenceCard
                kind="Measured"
                value="/_server"
                title="Frame transport after navigation"
                detail="Client navigation and catalog filter changes reached the generated server-function endpoint; component responses use application/x-frame-stream."
              />
              <EvidenceCard
                kind="Measured"
                value="64 + 136 + 29"
                title="Current validation counts"
                detail="Current proof: 64 built-Worker checks, 136 repository tests, and 29 commerce/API integration tests. Each suite ran against the implementation represented on this page."
              />
              <EvidenceCard
                kind="Measured"
                value="0 leaks"
                title="Client bundle privacy scan"
                detail="Every built client chunk was scanned for the D1 driver, QPAY_PASSWORD, and abuse-control binding names. None were present."
              />
              <EvidenceCard
                kind="Pinned fact"
                value="beta.26"
                title="Fresh frame slots lose captured context"
                detail="The current ownerScope limitation is reproduced and worked around. ProductPurchase is not placed in a fresh frame slot."
              />
              <EvidenceCard
                kind="Architectural expectation"
                value="persist"
                title="Matching client owners survive frame morphs"
                detail="The frame contract protects matching client regions. DUND separately tests disclosure, focus, cart, history, and stale-route behavior in a real browser."
              />
            </div>
          </div>
        </div>
      </section>

      <section
        class="px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="tradeoffs-title"
      >
        <div class="mx-auto max-w-360">
          <h2 id="tradeoffs-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
            Honest benefits and costs
          </h2>
          <div class="mt-8 grid border-3 border-ink lg:grid-cols-2">
            <article class="border-b-3 border-ink p-[clamp(1rem,3vw,2rem)] lg:border-r-3 lg:border-b-0">
              <h3 class="text-3xl font-extrabold">What DUND gains</h3>
              <ul class="mt-5 grid gap-3 pl-5 leading-relaxed marker:text-cobalt">
                <li>One persistent shell and cart owner across route navigation.</li>
                <li>Server-owned visible catalog content can travel as HTML once.</li>
                <li>Server-function extraction keeps render/data code out of client chunks.</li>
                <li>
                  Router actions give mutations, submissions, redirects, and refresh one owner.
                </li>
                <li>
                  Client controls can preserve local state while surrounding server DOM changes.
                </li>
              </ul>
              <h3 class="mt-8 text-3xl font-extrabold">What DUND pays</h3>
              <ul class="mt-5 grid gap-3 pl-5 leading-relaxed marker:text-coral">
                <li>
                  Exact prerelease pins and coordinated upgrades across five coupled packages.
                </li>
                <li>
                  More real-browser tests for adoption, frame transport, history, focus, and stale
                  work.
                </li>
                <li>No broad Solid 1 browser package graph; controls are app-local.</li>
                <li>Frame-bearing documents currently bypass shared CDN storage.</li>
                <li>Known owner/context and lazy-route Workerd limitations require workarounds.</li>
              </ul>
            </article>
            <article class="bg-amber p-[clamp(1rem,3vw,2rem)]">
              <h3 class="text-3xl font-extrabold">What Plugged keeps simple</h3>
              <ul class="mt-5 grid gap-3 pl-5 leading-relaxed marker:text-cobalt">
                <li>Astro route files map directly to complete HTTP documents.</li>
                <li>Mature Solid 1, TanStack, Kobalte, UI, and Unpic integrations.</li>
                <li>Public document caching has clear complete-response semantics.</li>
                <li>Native full-page navigation supplies familiar reset and history behavior.</li>
              </ul>
              <h3 class="mt-8 text-3xl font-extrabold">What Plugged pays</h3>
              <ul class="mt-5 grid gap-3 pl-5 leading-relaxed marker:text-coral">
                <li>Separate island roots cannot share context.</li>
                <li>
                  client:only purchase/checkout/status surfaces start without useful island HTML.
                </li>
                <li>Document navigation recreates owners; durable state needs storage recovery.</li>
                <li>
                  First-party mutations traverse the headless client, TanStack, Eden, and API
                  layers.
                </li>
              </ul>
              <p class="mt-8 border-t-3 border-ink pt-5 text-lg font-extrabold">
                Do not choose frames from a generic performance claim. Measure this store's HTML,
                JavaScript, request count, latency, and maintenance cost.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        class="border-t-3 border-ink bg-cobalt px-[clamp(1rem,4vw,4rem)] py-[clamp(4rem,8vw,7rem)] text-white"
        aria-labelledby="experiments-title"
      >
        <div class="mx-auto grid max-w-360 gap-9 lg:grid-cols-2">
          <div>
            <h2 id="experiments-title" class="text-4xl leading-none font-extrabold sm:text-6xl">
              Repeatable review experiments
            </h2>
            <ol class="mt-7 grid gap-5">
              {[
                [
                  'Initial HTML',
                  'Disable JavaScript, open a product directly, and inspect View Source. Confirm headings and facts exist; DUND checkout must explain its JavaScript cart requirement.',
                ],
                [
                  'Boot adoption',
                  'Clear Network, reload DUND directly, filter for /_server, and expect zero frame component requests before interaction.',
                ],
                [
                  'Navigation transport',
                  'Navigate DUND catalog → product and change a catalog filter. Preserve the log and inspect /_server plus the frame-stream content type.',
                ],
                [
                  'Persistence',
                  'Open the catalog disclosure, focus a filter, navigate, then use Back/Forward. Repeat with a cart line and an unfinished checkout draft.',
                ],
                [
                  'Cache policy',
                  'Inspect response headers. Plugged public documents can have a short CDN TTL; DUND frame documents and this review route must not enter shared CDN storage.',
                ],
                [
                  'Bundle privacy',
                  'Build DUND, scan dist/client/assets/*.js for server-only drivers, credential binding names, and provider-only strings.',
                ],
              ].map(([title, detail], index) => (
                <li class="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
                  <strong class="grid size-11 place-items-center border-2 border-white text-amber">
                    {index + 1}
                  </strong>
                  <div>
                    <h3 class="text-xl font-extrabold">{title}</h3>
                    <p class="mt-1 leading-relaxed text-white/75">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 class="text-3xl font-extrabold">Practical review checklist</h2>
            <div class="mt-5 grid gap-3">
              {[
                'The route owner is explicit before code is compared.',
                'Visible server content is not also shipped as client source data without a client need.',
                'Cart, form draft, URL, and payment authority each have one owner.',
                'Direct load, client navigation, Back, Forward, and rapid navigation all pass.',
                'Focus lands on the new main region and survives an in-frame filter update.',
                'No-JS behavior is intentional and stated, not assumed.',
                'Cache headers match privacy and frame protocol constraints.',
                'No server-only dependency or binding marker appears in client chunks.',
                'The beta upgrade and rollback path is documented.',
                'Any speed or size claim has a measured DUND and Plugged comparison.',
              ].map(item => (
                <label class="flex min-h-12 items-start gap-3 border border-white/35 p-3">
                  <input class="mt-1 size-5 shrink-0 accent-amber" type="checkbox" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                class="inline-flex min-h-12 items-center justify-center bg-amber px-4 font-bold text-ink no-underline"
                href="https://dund.darjs.dev"
                target="_blank"
                rel="noreferrer"
              >
                Launch DUND ↗
              </a>
              <a
                class="inline-flex min-h-12 items-center justify-center bg-white px-4 font-bold text-cobalt no-underline"
                href="https://storekit.plugged.darjs.dev"
                target="_blank"
                rel="noreferrer"
              >
                Launch Plugged ↗
              </a>
              <a
                class="inline-flex min-h-12 items-center justify-center border-2 border-white px-4 font-bold text-white no-underline sm:col-span-2"
                href="/review/solid2/not-found"
                target="_blank"
              >
                Open the DUND 404 probe ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
