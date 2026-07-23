import type { PrivateOrderError, PublicOrder } from '@store-kit/contracts/orders'

import { api } from '../client'
import { resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, token: string) =>
    resultQueryOptions<readonly ['order', string, string], PublicOrder, PrivateOrderError>({
      queryKey: ['order', orderId, token] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': token } }),
    }),
}
