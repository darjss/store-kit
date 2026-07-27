import { treaty } from '@elysiajs/eden'
import type { App } from '@store-kit/api'

const origin = globalThis.location?.origin ?? 'http://localhost'

export const api = treaty<App>(origin)

type AdminSessionRoute = {
  api: {
    admin: {
      session: {
        get: () => Promise<{
          status: number
          data: unknown
          error: unknown
        }>
      }
    }
  }
}

export const adminSessionRoute = api as unknown as AdminSessionRoute
