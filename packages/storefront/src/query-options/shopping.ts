import type { CheckoutInput } from '@store-kit/db/schemas/shopping'
import { Result } from 'better-result'

import { api } from '../client'
import { resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, getToken: () => string) =>
    resultQueryOptions({
      queryKey: ['order', orderId] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': getToken() } }),
    }),
}

const deserializeMutation = async (request: Promise<{ data: unknown }>) => {
  const { data } = await request
  if (data === null) throw new Error('Eden response did not include result data.')
  return Result.deserialize(data)
}

export const checkoutMutation = {
  create: (input: CheckoutInput) => deserializeMutation(api.api.checkout.post(input)),
}

export const paymentMutation = {
  claimBankTransfer: (orderId: string, token: string) =>
    deserializeMutation(
      api.api.orders({ id: orderId }).payment.claim.post(null, {
        headers: { 'x-order-token': token },
      }),
    ),
  refreshQPay: (orderId: string, token: string) =>
    deserializeMutation(
      api.api.orders({ id: orderId }).payment.refresh.post(null, {
        headers: { 'x-order-token': token },
      }),
    ),
}
