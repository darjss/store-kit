import { commerce } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

export const cartRoutes = new Elysia({ aot: false, prefix: '/api/cart' }).post(
  '/validate',
  async ({ body, set }) => {
    set.headers['cache-control'] = 'private, no-store'
    return Result.serialize(await commerce.cart.validate(body))
  },
  { body: t.Any() },
)
