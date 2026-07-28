import { app } from '@store-kit/api'
import type { Fetchable } from 'astro'
import { astro, FetchState } from 'astro/fetch'
import { env } from 'cloudflare:workers'

import { validateTemplateEnvironment } from './environment'

let environmentIsValid = false

export default {
  fetch(request) {
    if (!environmentIsValid) {
      validateTemplateEnvironment(env, { localDevelopment: import.meta.env.DEV })
      environmentIsValid = true
    }

    const pathname = new URL(request.url).pathname

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return app.handle(request)
    }

    return astro(new FetchState(request))
  },
} satisfies Fetchable
