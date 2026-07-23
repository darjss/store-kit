import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentRefresh,
  PaymentRefreshError,
} from '@store-kit/contracts/payments'

import { api } from '~/client'

import { resultMutationOptions } from './result'

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
