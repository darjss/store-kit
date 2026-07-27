import { action } from '@solidjs/router'
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

const formText = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : undefined
}

const checkoutFormInput = (form: FormData): unknown => {
  if (!(form instanceof FormData)) return undefined
  const itemsSource = formText(form, 'items')
  let items: unknown
  if (itemsSource && itemsSource.length <= 16_384) {
    try {
      items = JSON.parse(itemsSource)
    } catch {
      items = undefined
    }
  }

  const notes = formText(form, 'delivery.notes')?.trim()
  return {
    idempotencyKey: formText(form, 'idempotencyKey'),
    items,
    customer: {
      name: formText(form, 'customer.name')?.trim(),
      phone: formText(form, 'customer.phone')?.replace(/\D/g, '').replace(/^976/, ''),
    },
    delivery: {
      district: formText(form, 'delivery.district'),
      khoroo: formText(form, 'delivery.khoroo')?.trim(),
      address: formText(form, 'delivery.address')?.trim(),
      ...(notes ? { notes } : {}),
    },
    paymentMethod: formText(form, 'paymentMethod'),
  }
}

export async function submitCheckout(form: FormData) {
  'use server'

  await enforceRateLimit('checkout', env.CHECKOUT_RATE_LIMITER)

  const input = checkoutFormInput(form)
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

export const checkoutAction = action(submitCheckout)
