import type {
  CartValidationError,
  PersistedCartItem,
  ValidatedCart,
} from '@store-kit/contracts/cart'

import { api } from '../client'
import { resultQueryOptions } from './result'

const validate = (items: PersistedCartItem[]) =>
  resultQueryOptions<
    readonly [
      'cart',
      'validation',
      { variantId: string; quantity: number; unitPriceMnt: number }[],
    ],
    ValidatedCart,
    CartValidationError
  >({
    queryKey: [
      'cart',
      'validation',
      items.map(({ variantId, quantity, unitPriceMnt }) => ({
        variantId,
        quantity,
        unitPriceMnt,
      })),
    ] as const,
    request: () => api.api.cart.validate.post(items),
  })

export const cartQuery = { validate }
