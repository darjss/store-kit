import type { CheckoutCreated, CheckoutError, CheckoutInput } from '@store-kit/contracts/checkout'

import { api } from '../client'
import { resultMutationOptions } from './result'

export const checkoutMutation = {
  create: () =>
    resultMutationOptions<CheckoutInput, CheckoutCreated, CheckoutError>(input =>
      api.api.checkout.post(input),
    ),
}
