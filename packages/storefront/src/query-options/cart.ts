import type { PersistedCartItem } from '../cart'
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
        unitPriceMnt,
      })),
    ] as const,
    request: () => api.api.cart.validate.post(items),
  })

export const cartQuery = { validate }
