import { dynamic } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

import { getHomeFrame } from '~/server/catalog'

export default function HomePage() {
  const Home = dynamic(() => getHomeFrame())

  return (
    <Errored
      fallback={
        <main id="main-content" class="grid min-h-[60svh] place-content-center px-5 text-center">
          <h1 class="text-4xl font-extrabold">Нүүр хуудсыг ачаалж чадсангүй.</h1>
          <a class="mt-5 font-bold text-cobalt" href="/">
            Дахин оролдох
          </a>
        </main>
      }
    >
      <Loading
        fallback={
          <main
            id="main-content"
            class="grid min-h-[70svh] place-content-center bg-amber px-5 text-center"
          >
            <p class="text-xl font-bold">Капсулыг бэлтгэж байна…</p>
          </main>
        }
      >
        <Home />
      </Loading>
    </Errored>
  )
}
