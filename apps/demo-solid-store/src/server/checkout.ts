import { respond } from '@solidjs/web'
import { commerce } from '@store-kit/commerce'
import {
  checkoutCreatedSchema,
  checkoutErrorSchema,
  checkoutInputSchema,
} from '@store-kit/contracts/checkout'
import type { CheckoutInput } from '@store-kit/contracts/checkout'
import type { ValidationIssue } from '@store-kit/contracts/common'
import { Value } from 'typebox/value'

const validationIssues = (input: unknown): ValidationIssue[] =>
  Value.Errors(checkoutInputSchema, input).map(error => ({
    path: error.instancePath || '/',
    code: 'invalid',
  }))

export async function submitCheckout(input: unknown) {
  'use server'

  if (!Value.Check(checkoutInputSchema, input)) {
    return {
      ok: false as const,
      failure: {
        type: 'field' as const,
        fields: validationIssues(input),
      },
    }
  }

  const result = await commerce.checkout.createOrder(input as CheckoutInput)
  if (result.status === 'error') {
    if (!Value.Check(checkoutErrorSchema, result.error)) {
      throw respond(
        { code: 'invalid_checkout_failure', message: 'Захиалга үүсгэж чадсангүй.' },
        { status: 500 },
      )
    }
    return {
      ok: false as const,
      failure: {
        type: 'domain' as const,
        error: result.error,
      },
    }
  }

  if (!Value.Check(checkoutCreatedSchema, result.value)) {
    throw respond(
      { code: 'invalid_checkout_result', message: 'Захиалга үүсгэж чадсангүй.' },
      { status: 500 },
    )
  }

  return { ok: true as const, order: result.value }
}
