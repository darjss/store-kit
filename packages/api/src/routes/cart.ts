import { commerce } from '@store-kit/commerce'
import { cartValidationInputsSchema } from '@store-kit/contracts/cart'
import { Result } from 'better-result'
import { Elysia } from 'elysia'

import { nullablePublicImage } from '~/media'
import { contractBody } from '~/typebox-contract'

export const cartRoutes = new Elysia({ aot: false, prefix: '/api/cart' }).post(
  '/validate',
  async ({ body, request, set }) => {
    set.headers['cache-control'] = 'private, no-store'
    return Result.serialize(
      (await commerce.cart.validate(body)).map(value => ({
        ...value,
        lines: value.lines.map(line => {
          const { imageR2Key, imageWidth, imageHeight, imageAlt, ...publicLine } = line
          return {
            ...publicLine,
            image: nullablePublicImage(
              {
                r2Key: imageR2Key,
                width: imageWidth,
                height: imageHeight,
                alt: imageAlt,
              },
              request,
            ),
          }
        }),
      })),
    )
  },
  { body: contractBody(cartValidationInputsSchema) },
)
