import type { PrivateOrderError, PublicOrder } from '@store-kit/contracts/orders'

import { api } from '../client'
import { resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, getToken: () => string) =>
    resultQueryOptions<readonly ['order', string], PublicOrder, PrivateOrderError>({
      queryKey: ['order', orderId] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': getToken() } }),
    }),
}
