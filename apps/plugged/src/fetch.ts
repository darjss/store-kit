import { app } from '@store-kit/api'
import type { Fetchable } from 'astro'
import { astro, FetchState } from 'astro/fetch'

import { handleMediaRequest } from './media'

export default {
  fetch(request) {
    const pathname = new URL(request.url).pathname

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return app.handle(request)
    }

    if (pathname.startsWith('/media/')) {
      return handleMediaRequest(request)
    }

    return astro(new FetchState(request))
  },
} satisfies Fetchable
