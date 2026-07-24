import type { CartValidationInput } from '@store-kit/contracts/cart'
import type { CheckoutInput } from '@store-kit/contracts/checkout'
import { expectTypeOf, test } from 'vite-plus/test'

import { api } from './client'

test('Eden infers authoritative shared request contracts', () => {
  expectTypeOf(api.api.checkout.post).parameter(0).toEqualTypeOf<CheckoutInput>()
  expectTypeOf(api.api.cart.validate.post).parameter(0).toEqualTypeOf<CartValidationInput[]>()
})
