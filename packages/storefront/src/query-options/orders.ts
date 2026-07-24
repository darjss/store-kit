import { api } from '../client'
import { resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, token: string) =>
    resultQueryOptions({
      queryKey: ['order', orderId, token] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': token } }),
      mapValue: order => ({
        ...order,
        lines: order.lines.map(line => ({
          ...line,
          imageR2Key: line.image?.url ?? null,
          imageWidth: line.image?.width ?? null,
          imageHeight: line.image?.height ?? null,
          imageAlt: line.image?.alt ?? null,
        })),
      }),
    }),
}
