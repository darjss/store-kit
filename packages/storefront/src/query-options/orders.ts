import { api } from '~/client'

import { resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, token: string) =>
    resultQueryOptions({
      queryKey: ['order', orderId, token] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': token } }),
      mapValue: order => order,
    }),
}
