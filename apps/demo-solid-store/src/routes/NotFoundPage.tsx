export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      tabindex="-1"
      class="grid min-h-[70svh] place-content-center bg-amber px-5 text-center"
    >
      <p class="font-bold text-cobalt">404 / ХААЛГА ОЛДСОНГҮЙ</p>
      <h1 class="mt-3 text-[clamp(3rem,10vw,7rem)] leading-none font-extrabold">
        Энд давхарга алга.
      </h1>
      <a
        class="mt-7 inline-flex min-h-12 items-center justify-center bg-cobalt px-5 font-bold text-white no-underline"
        href="/"
      >
        Нүүр рүү буцах
      </a>
    </main>
  )
}
