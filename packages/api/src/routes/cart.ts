import { commerce } from '@store-kit/commerce'
import { cartLineInputsSchema } from '@store-kit/contracts/cart'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { contractBody } from '../typebox-contract'

export const cartRoutes = new Elysia({ aot: false, prefix: '/api/cart' }).post(
  '/validate',
  async ({ body, set }) => {
    set.headers['cache-control'] = 'private, no-store'
    return Result.serialize(await commerce.cart.validate(body))
  },
  { body: contractBody(cartLineInputsSchema) },
)
