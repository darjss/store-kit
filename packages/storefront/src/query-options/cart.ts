import type {
  CartValidationError,
  PersistedCartItem,
  ValidatedCart,
} from '@store-kit/contracts/cart'

import { api } from '~/client'

import { resultQueryOptions } from './result'

type StorefrontValidatedCart = Omit<ValidatedCart, 'lines'> & {
  lines: Array<
    Omit<ValidatedCart['lines'][number], 'image'> & {
      imageR2Key: string | null
      imageWidth: number | null
      imageHeight: number | null
      imageAlt: string | null
    }
  >
}

const validate = (items: PersistedCartItem[]) => {
  const queryKey = [
    'cart',
    'validation',
    items.map(({ variantId, quantity, unitPriceMnt }) => ({
      variantId,
      quantity,
      previousUnitPriceMnt: unitPriceMnt,
    })),
  ] as const

  return resultQueryOptions<
    typeof queryKey,
    ValidatedCart,
    StorefrontValidatedCart,
    CartValidationError
  >({
    queryKey,
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
}

export const cartQuery = { validate }
