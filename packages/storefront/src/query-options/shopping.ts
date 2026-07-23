import type { CheckoutInput } from '@store-kit/db/schemas/shopping'

import { api } from '../client'
import { resultMutationOptions, resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, getToken: () => string) =>
    resultQueryOptions({
      queryKey: ['order', orderId] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': getToken() } }),
    }),
}

export const checkoutMutation = {
  create: () => resultMutationOptions((input: CheckoutInput) => api.api.checkout.post(input)),
}

type PrivatePaymentInput = { orderId: string; token: string }

export const paymentMutation = {
  claimBankTransfer: () =>
    resultMutationOptions(({ orderId, token }: PrivatePaymentInput) =>
      api.api.orders({ id: orderId }).payment.claim.post(null, {
        headers: { 'x-order-token': token },
      }),
    ),
  refreshQPay: () =>
    resultMutationOptions(({ orderId, token }: PrivatePaymentInput) =>
      api.api.orders({ id: orderId }).payment.refresh.post(null, {
        headers: { 'x-order-token': token },
      }),
    ),
}
