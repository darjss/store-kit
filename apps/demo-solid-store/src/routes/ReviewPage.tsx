import { dynamic } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

import { ArchitectureReviewLab } from '~/components/ArchitectureReviewLab'
import { getArchitectureReviewFrame } from '~/server/review'

export default function ReviewPage() {
  const Review = dynamic(() => getArchitectureReviewFrame())

  return (
    <Errored
      fallback={
        <main
          id="main-content"
          tabindex="-1"
          class="grid min-h-[70svh] place-content-center bg-surface px-5 text-center"
        >
          <h1 class="text-4xl font-extrabold">Architecture review unavailable.</h1>
          <p class="mt-3">Reload the page or return to the DUND catalog.</p>
          <a class="mt-5 font-bold text-cobalt" href="/products">
            Open the capsule →
          </a>
        </main>
      }
    >
      <Loading
        fallback={
          <main
            id="main-content"
            tabindex="-1"
            class="grid min-h-[70svh] place-content-center bg-amber px-5 text-center"
          >
            <p class="text-xl font-bold">Preparing the architecture map…</p>
          </main>
        }
      >
        <Review lab={() => <ArchitectureReviewLab />} />
      </Loading>
    </Errored>
  )
}
