import { treaty } from '@elysiajs/eden'
import type { App } from '@store-kit/api'

const origin = globalThis.location?.origin ?? 'http://localhost'

export const api = treaty<App>(origin)
