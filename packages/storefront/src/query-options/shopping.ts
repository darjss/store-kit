import type {
  BankTransferClaim,
  BankTransferClaimError,
  CheckoutCreated,
  CheckoutError,
  CheckoutInput,
  PaymentRefresh,
  PaymentRefreshError,
  PrivateOrderError,
  PublicOrder,
} from '@store-kit/contracts'

import { api } from '../client'
import { resultMutationOptions, resultQueryOptions } from './result'

export const orderQuery = {
  findPrivateStatus: (orderId: string, getToken: () => string) =>
    resultQueryOptions<readonly ['order', string], PublicOrder, PrivateOrderError>({
      queryKey: ['order', orderId] as const,
      request: () =>
        api.api.orders({ id: orderId }).status.get({ headers: { 'x-order-token': getToken() } }),
    }),
}

export const checkoutMutation = {
  create: () =>
    resultMutationOptions<CheckoutInput, CheckoutCreated, CheckoutError>(input =>
      api.api.checkout.post(input),
    ),
}

type PrivatePaymentInput = { orderId: string; token: string }

export const paymentMutation = {
  claimBankTransfer: () =>
    resultMutationOptions<PrivatePaymentInput, BankTransferClaim, BankTransferClaimError>(
      ({ orderId, token }) =>
        api.api.orders({ id: orderId }).payment.claim.post(null, {
          headers: { 'x-order-token': token },
        }),
    ),
  refreshQPay: () =>
    resultMutationOptions<PrivatePaymentInput, PaymentRefresh, PaymentRefreshError>(
      ({ orderId, token }) =>
        api.api.orders({ id: orderId }).payment.refresh.post(null, {
          headers: { 'x-order-token': token },
        }),
    ),
}
