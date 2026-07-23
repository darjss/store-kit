import { validateCart } from '@store-kit/commerce/shopping'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

const cartItem = t.Object(
  {
    variantId: t.String({ minLength: 1 }),
    quantity: t.Integer({ minimum: 1, maximum: 10 }),
    productSlug: t.String({ minLength: 1 }),
    productName: t.String({ minLength: 1 }),
    variantName: t.String({ minLength: 1 }),
    options: t.Record(t.String(), t.String()),
    imageR2Key: t.Union([t.String({ minLength: 1 }), t.Null()]),
    unitPriceMnt: t.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
)

export const cartRoutes = new Elysia({ aot: false, prefix: '/api/cart' }).post(
  '/validate',
  async ({ body }) => Result.serialize(await validateCart(body)),
  {
    body: t.Array(cartItem, { minItems: 1, maxItems: 20 }),
  },
)
