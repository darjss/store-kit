import { Show, createSignal } from 'solid-js'

const directPhases = [
  {
    label: '1 · Request',
    title: 'A document request reaches one Worker.',
    detail:
      'The browser asks for the full URL. Astro or the Solid turnkey handler resolves the route on the server.',
  },
  {
    label: '2 · Server render',
    title: 'Public data becomes HTML.',
    detail:
      'Plugged renders one Astro document. DUND renders the Router shell and any selected server frames into the document stream.',
  },
  {
    label: '3 · Browser boot',
    title: 'Interactive code starts from existing DOM.',
    detail:
      'Plugged starts separate Solid islands. DUND hydrates one client tree and adopts frame-owned regions without fetching them again.',
  },
  {
    label: '4 · Ready',
    title: 'The first screen is interactive.',
    detail:
      'Both stores can show server HTML first. Their owners differ after this point: island roots versus one persistent Router shell.',
  },
] as const

const navigationPhases = [
  {
    label: '1 · Intent',
    title: 'A same-origin anchor is activated.',
    detail:
      'Plugged follows the link as a new document. DUND Router intercepts eligible anchors and keeps the root shell mounted.',
  },
  {
    label: '2 · Request',
    title: 'The next route asks for authority.',
    detail:
      'Plugged requests HTML for the complete page. DUND calls server functions; frame-backed routes receive a /_server frame stream.',
  },
  {
    label: '3 · Apply',
    title: 'New server output reaches the page.',
    detail:
      'Plugged replaces the document. DUND morphs server-owned frame DOM and treats client-owned positions as opaque.',
  },
  {
    label: '4 · Preserve',
    title: 'Only owners that stayed mounted retain state.',
    detail:
      'DUND keeps its shell, cart, and matching client regions. Plugged recovers persistent cart data from storage in a new island root.',
  },
] as const

export function ArchitectureReviewLab() {
  const [mode, setMode] = createSignal<'direct' | 'navigation'>('direct')
  const [phase, setPhase] = createSignal(0)
  const [persistentOnly, setPersistentOnly] = createSignal(false)
  const [previewOpen, setPreviewOpen] = createSignal(false)

  const phases = () => (mode() === 'direct' ? directPhases : navigationPhases)
  const currentPhase = () => phases()[phase()] ?? phases()[0]
  const selectMode = (next: 'direct' | 'navigation') => {
    setMode(next)
    setPhase(0)
  }
  const step = (direction: -1 | 1) => {
    const next = Math.min(phases().length - 1, Math.max(0, phase() + direction))
    setPhase(next)
  }

  return (
    <section
      class="border-y-3 border-ink bg-surface px-[clamp(1rem,3vw,3rem)] py-[clamp(2rem,5vw,4rem)]"
      aria-labelledby="review-lab-title"
    >
      <div class="mx-auto max-w-360">
        <div class="flex flex-wrap items-end justify-between gap-5">
          <div class="max-w-3xl">
            <p class="font-bold text-cobalt">Interactive ownership lab</p>
            <h2 id="review-lab-title" class="mt-2 text-4xl leading-none font-extrabold sm:text-5xl">
              Change the request, then follow the owner.
            </h2>
          </div>
          <button
            class="min-h-11 border-2 border-ink bg-white px-4 font-bold transition-colors duration-150 hover:bg-amber motion-reduce:transition-none"
            type="button"
            aria-pressed={persistentOnly() ? 'true' : 'false'}
            onClick={() => {
              setPersistentOnly(value => !value)
            }}
          >
            {persistentOnly() ? 'Show every region' : 'Highlight persistent regions'}
          </button>
        </div>

        <div
          class="mt-7 inline-flex max-w-full flex-wrap border-2 border-ink bg-white p-1"
          role="group"
          aria-label="Request type"
        >
          <button
            class="min-h-11 px-4 font-bold transition-colors duration-150 aria-pressed:bg-cobalt aria-pressed:text-white motion-reduce:transition-none"
            type="button"
            aria-pressed={mode() === 'direct' ? 'true' : 'false'}
            onClick={() => selectMode('direct')}
          >
            Direct load
          </button>
          <button
            class="min-h-11 px-4 font-bold transition-colors duration-150 aria-pressed:bg-cobalt aria-pressed:text-white motion-reduce:transition-none"
            type="button"
            aria-pressed={mode() === 'navigation' ? 'true' : 'false'}
            onClick={() => selectMode('navigation')}
          >
            Client navigation
          </button>
        </div>

        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <article class="min-w-0 border-2 border-ink bg-white" aria-labelledby="lab-plugged-title">
            <header class="flex items-center justify-between gap-4 border-b-2 border-ink bg-ink px-4 py-3 text-white">
              <h3 id="lab-plugged-title" class="text-xl font-extrabold">
                Plugged · Astro + Solid 1
              </h3>
              <span class="text-sm font-bold text-amber">document / islands</span>
            </header>
            <div class="grid gap-2 p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <div
                data-review-region="plugged-shell"
                class={
                  persistentOnly()
                    ? 'grid min-h-24 place-items-center border-2 border-dashed border-ink/25 p-3 text-center text-sm font-bold text-ink/35'
                    : 'grid min-h-24 place-items-center border-2 border-ink bg-surface p-3 text-center text-sm font-bold'
                }
              >
                Astro layout
              </div>
              <div
                data-review-region="plugged-page"
                class={
                  mode() === 'navigation' || persistentOnly()
                    ? 'grid min-h-24 place-items-center border-2 border-dashed border-ink/25 p-3 text-center text-sm text-ink/40'
                    : 'grid min-h-24 place-items-center border-2 border-cobalt bg-cobalt p-3 text-center font-bold text-white'
                }
              >
                Server-rendered route HTML
              </div>
              <div
                data-review-region="plugged-island"
                class={
                  persistentOnly()
                    ? 'grid min-h-24 place-items-center border-3 border-coral bg-amber p-3 text-center text-sm font-extrabold'
                    : 'grid min-h-24 place-items-center border-2 border-ink bg-amber p-3 text-center text-sm font-bold'
                }
              >
                Cart chrome island
              </div>
              <div
                data-review-region="plugged-purchase"
                class={
                  mode() === 'navigation' || persistentOnly()
                    ? 'grid min-h-24 place-items-center border-2 border-dashed border-ink/25 p-3 text-center text-sm text-ink/40'
                    : 'grid min-h-24 place-items-center border-2 border-ink p-3 text-center text-sm font-bold'
                }
              >
                Route client-only island
              </div>
            </div>
            <p class="border-t border-ink/20 px-4 py-3 text-sm text-ink/70">
              {mode() === 'direct'
                ? 'One request returns the whole document; each island starts as its own Solid owner.'
                : 'The browser replaces the document. Persisted cart data can be restored, but the previous island owners do not survive.'}
            </p>
          </article>

          <article class="min-w-0 border-2 border-ink bg-white" aria-labelledby="lab-dund-title">
            <header class="flex items-center justify-between gap-4 border-b-2 border-ink bg-amber px-4 py-3 text-ink">
              <h3 id="lab-dund-title" class="text-xl font-extrabold">
                DUND · Solid 2 beta
              </h3>
              <span class="text-sm font-bold text-cobalt">router / frames</span>
            </header>
            <div class="grid gap-2 p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <div
                data-review-region="dund-shell"
                class="grid min-h-24 place-items-center border-3 border-coral bg-amber p-3 text-center text-sm font-extrabold"
              >
                Router shell + cart owner
              </div>
              <div
                data-review-region="dund-frame"
                class={
                  persistentOnly()
                    ? 'grid min-h-24 place-items-center border-2 border-dashed border-ink/25 p-3 text-center text-sm text-ink/40'
                    : mode() === 'navigation'
                      ? 'grid min-h-24 place-items-center border-2 border-cobalt bg-cobalt p-3 text-center font-bold text-white'
                      : 'grid min-h-24 place-items-center border-2 border-ink bg-surface p-3 text-center text-sm font-bold'
                }
              >
                Server-owned frame HTML
              </div>
              <div
                data-review-region="dund-controls"
                class="grid min-h-24 place-items-center border-3 border-coral bg-amber p-3 text-center text-sm font-extrabold"
              >
                Persistent search + cart
              </div>
              <div
                data-review-region="dund-slot"
                class="grid min-h-24 place-items-center border-3 border-coral bg-white p-3 text-center text-sm font-extrabold"
              >
                Matching client-owned region
              </div>
            </div>
            <p class="border-t border-ink/20 px-4 py-3 text-sm text-ink/70">
              {mode() === 'direct'
                ? 'The document contains shell and frame HTML. Boot hydrates once and adopts the frame with no frame refetch.'
                : 'The shell stays mounted. A frame stream updates server-owned DOM while matching client-owned regions remain opaque.'}
            </p>
          </article>
        </div>

        <div class="mt-5 grid border-2 border-ink bg-white md:grid-cols-[13rem_minmax(0,1fr)_auto]">
          <div class="border-b-2 border-ink bg-ink p-4 text-white md:border-r-2 md:border-b-0">
            <p class="m-0 text-sm font-bold text-amber">Request phase</p>
            <strong class="mt-1 block text-xl">{currentPhase().label}</strong>
          </div>
          <div class="min-w-0 p-4" aria-live="polite" aria-atomic="true">
            <h3 class="text-xl font-extrabold">{currentPhase().title}</h3>
            <p class="mt-2 max-w-[70ch] text-ink/70">{currentPhase().detail}</p>
          </div>
          <div class="flex items-center justify-between gap-2 border-t-2 border-ink p-2 md:border-t-0 md:border-l-2">
            <button
              class="min-h-11 min-w-11 border-2 border-ink px-3 font-bold disabled:cursor-not-allowed disabled:opacity-35"
              type="button"
              disabled={phase() === 0}
              onClick={() => step(-1)}
              aria-label="Previous request phase"
            >
              ←
            </button>
            <span class="min-w-12 text-center text-sm font-bold">
              {phase() + 1} / {phases().length}
            </span>
            <button
              class="min-h-11 min-w-11 border-2 border-ink px-3 font-bold disabled:cursor-not-allowed disabled:opacity-35"
              type="button"
              disabled={phase() === phases().length - 1}
              onClick={() => step(1)}
              aria-label="Next request phase"
            >
              →
            </button>
          </div>
        </div>

        <div class="mt-8 border-t-3 border-ink pt-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="text-2xl font-extrabold">Optional live comparison</h3>
              <p class="mt-1 max-w-[70ch] text-sm text-ink/70">
                Both public origins currently permit framing. These panes load only on request and
                do not change either store's security headers.
              </p>
            </div>
            <button
              class="min-h-11 bg-cobalt px-4 font-bold text-white transition-colors duration-150 hover:bg-ink motion-reduce:transition-none"
              type="button"
              aria-expanded={previewOpen() ? 'true' : 'false'}
              aria-controls="live-preview-panes"
              onClick={() => {
                setPreviewOpen(value => !value)
              }}
            >
              {previewOpen() ? 'Close live panes' : 'Load live panes'}
            </button>
          </div>
          <Show when={previewOpen()}>
            <div id="live-preview-panes" class="mt-5 grid gap-4 lg:grid-cols-2">
              <figure class="min-w-0 border-2 border-ink bg-white">
                <figcaption class="border-b-2 border-ink px-4 py-3 font-bold">
                  DUND · current Solid 2 product
                </figcaption>
                <iframe
                  class="h-128 w-full border-0 bg-white"
                  src="https://dund.darjs.dev/products/shiljilt-bridge-coat"
                  title="Live DUND Solid 2 product preview"
                  loading="lazy"
                />
              </figure>
              <figure class="min-w-0 border-2 border-ink bg-white">
                <figcaption class="border-b-2 border-ink px-4 py-3 font-bold">
                  Plugged · current Astro product
                </figcaption>
                <iframe
                  class="h-128 w-full border-0 bg-white"
                  src="https://storekit.plugged.darjs.dev/products/tangzu-waner-2-red-lion"
                  title="Live Plugged Astro product preview"
                  loading="lazy"
                />
              </figure>
            </div>
          </Show>
        </div>
      </div>
    </section>
  )
}
