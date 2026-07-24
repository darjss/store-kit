import { app } from '@store-kit/api'
import type { Fetchable } from 'astro'
import { astro, FetchState } from 'astro/fetch'
import { env } from 'cloudflare:workers'

import { validatePluggedEnvironment } from './environment'
import { handleMediaRequest } from './media'

let environmentIsValid = false

export default {
  fetch(request) {
    if (!environmentIsValid) {
      validatePluggedEnvironment(env)
      environmentIsValid = true
    }

    const pathname = new URL(request.url).pathname

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return app.handle(request)
    }

    if (pathname.startsWith('/media/') && import.meta.env.DEV) {
      return handleMediaRequest(request)
    }

    return astro(new FetchState(request))
  },
} satisfies Fetchable
