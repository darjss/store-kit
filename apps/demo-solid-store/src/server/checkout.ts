import { commerce } from '@store-kit/commerce'
import {
  checkoutCreatedSchema,
  checkoutErrorSchema,
  checkoutInputSchema,
} from '@store-kit/contracts/checkout'
import type { CheckoutInput } from '@store-kit/contracts/checkout'
import type { ValidationIssue } from '@store-kit/contracts/common'
import { env } from 'cloudflare:workers'
import { Value } from 'typebox/value'

import { enforceRateLimit, throwUnexpectedServerError } from './policy'

const validationIssues = (input: unknown): ValidationIssue[] =>
  Value.Errors(checkoutInputSchema, input).map(error => ({
    path: error.instancePath || '/',
    code: 'invalid',
  }))

export async function submitCheckout(input: unknown) {
  'use server'

  await enforceRateLimit('checkout', env.CHECKOUT_RATE_LIMITER)

  if (!Value.Check(checkoutInputSchema, input)) {
    return {
      ok: false as const,
      failure: {
        type: 'field' as const,
        fields: validationIssues(input),
      },
    }
  }

  try {
    const result = await commerce.checkout.createOrder(input as CheckoutInput)
    if (result.status === 'error') {
      if (!Value.Check(checkoutErrorSchema, result.error)) {
        throw new Error('Invalid checkout domain failure.')
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
      throw new Error('Invalid checkout result.')
    }

    return { ok: true as const, order: result.value }
  } catch (error) {
    return throwUnexpectedServerError('checkout', error, 'Захиалга үүсгэж чадсангүй.')
  }
}
