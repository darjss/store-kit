import { useParams } from '@solidjs/router'

import { paths } from '~/app/router'

export default function OrderPage() {
  const params = useParams(paths.orders)

  return (
    <main
      id="main-content"
      tabindex="-1"
      class="grid min-h-[70svh] place-content-center bg-surface px-5 text-center"
    >
      <p class="font-bold text-cobalt">PRIVATE ORDER / {params.id}</p>
      <h1 class="mt-3 text-[clamp(2.5rem,7vw,5rem)] leading-none font-extrabold">
        Захиалгын төлөв
      </h1>
      <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed">
        Хувийн token-ийг SSR үед уншихгүй. Commerce зүсэлт token-ийг hydration-ийн дараа session
        storage-д шилжүүлж, энэ хэсэгт хувийн мэдээллийг ачаална.
      </p>
      <a class="mt-6 font-bold text-cobalt" href="/">
        Нүүр рүү буцах
      </a>
    </main>
  )
}
