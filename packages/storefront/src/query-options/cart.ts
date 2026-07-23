import type { PersistedCartItem, ValidatedCart } from '@store-kit/contracts/cart'

import { api } from '../client'
import { resultQueryOptions } from './result'

const validate = (items: PersistedCartItem[]) =>
  resultQueryOptions({
    queryKey: [
      'cart',
      'validation',
      items.map(({ variantId, quantity, unitPriceMnt }) => ({
        variantId,
        quantity,
        previousUnitPriceMnt: unitPriceMnt,
      })),
    ] as const,
    request: () =>
      api.api.cart.validate.post(
        items.map(({ variantId, quantity, unitPriceMnt }) => ({
          variantId,
          quantity,
          previousUnitPriceMnt: unitPriceMnt,
        })),
      ),
    mapValue: (value: ValidatedCart) => ({
      ...value,
      lines: value.lines.map(line => {
        const { image, ...cartLine } = line
        return {
          ...cartLine,
          imageR2Key: image?.url ?? null,
          imageWidth: image?.width ?? null,
          imageHeight: image?.height ?? null,
          imageAlt: image?.alt ?? null,
        }
      }),
    }),
  })

export const cartQuery = { validate }
