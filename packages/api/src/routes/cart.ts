import { validateCart } from '@store-kit/commerce/shopping'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

export const cartRoutes = new Elysia({ aot: false, prefix: '/api/cart' }).post(
  '/validate',
  async ({ body, set }) => {
    set.headers['cache-control'] = 'private, no-store'
    return Result.serialize(await validateCart(body))
  },
  { body: t.Any() },
)
