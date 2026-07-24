import type {
  CartValidationError,
  PersistedCartItem,
  ValidatedCart,
} from '@store-kit/contracts/cart'

import { api } from '~/client'

import { resultQueryOptions } from './result'

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

  return resultQueryOptions<typeof queryKey, ValidatedCart, ValidatedCart, CartValidationError>({
    queryKey,
    request: () =>
      api.api.cart.validate.post(
        items.map(({ variantId, quantity, unitPriceMnt }) => ({
          variantId,
          quantity,
          previousUnitPriceMnt: unitPriceMnt,
        })),
      ),
    mapValue: value => value,
  })
}

export const cartQuery = { validate }
