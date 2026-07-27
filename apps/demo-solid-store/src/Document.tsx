import { HydrationScript, getRequestEvent } from '@solidjs/web'
import type { ParentProps } from 'solid-js'

import { routeTitle } from '~/app/router'

const currentPathname = () => {
  if (typeof window !== 'undefined') return window.location.pathname
  const request = getRequestEvent()?.request
  return request ? new URL(request.url).pathname : '/'
}

export default function Document(props: ParentProps) {
  return (
    <html lang="mn-MN" class="bg-white font-sans text-ink">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="description"
          content="ДУНД — Улаанбаатарын өдөр тутмын давхаргын таван хэсгийн капсул."
        />
        <meta name="theme-color" content="#f5ac00" />
        <link rel="icon" href="data:," />
        <title>{routeTitle(currentPathname())}</title>
        <HydrationScript />
      </head>
      <body class="min-w-80 overflow-x-clip bg-white pb-[calc(4.25rem+env(safe-area-inset-bottom))] text-ink lg:pb-0">
        {props.children}
      </body>
    </html>
  )
}
