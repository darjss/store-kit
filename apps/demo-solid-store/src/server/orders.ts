import { action } from '@solidjs/router'
import { commerce } from '@store-kit/commerce'
import { publicOrderSchema } from '@store-kit/contracts/orders'
import type { PublicOrder } from '@store-kit/contracts/orders'
import {
  bankTransferClaimErrorSchema,
  bankTransferClaimSchema,
  paymentRefreshErrorSchema,
  paymentRefreshSchema,
} from '@store-kit/contracts/payments'
import {
  privateOrderAccessSchema,
  privateOrderErrorSchema,
} from '@store-kit/contracts/private-orders'
import type { PrivateOrderAccess, PrivateOrderError } from '@store-kit/contracts/private-orders'
import { env } from 'cloudflare:workers'
import { Value } from 'typebox/value'

import { mediaUrl } from '~/catalog/media'

import { enforceRateLimit, throwUnexpectedServerError } from './policy'

const invalidStatusToken = (): PrivateOrderError => ({
  _tag: 'InvalidStatusToken',
  message: 'Захиалга олдсонгүй.',
})

const invalidAccessResult = () => ({
  ok: false as const,
  failure: { type: 'domain' as const, error: invalidStatusToken() },
})

const privateAccessFromForm = (form: FormData): unknown => {
  if (!(form instanceof FormData)) return undefined
  const orderId = form.get('orderId')
  const statusToken = form.get('statusToken')
  return {
    orderId: typeof orderId === 'string' ? orderId : undefined,
    statusToken: typeof statusToken === 'string' ? statusToken : undefined,
  }
}

const publicImage = (line: {
  imageR2Key: string | null
  imageWidth: number | null
  imageHeight: number | null
  imageAlt: string | null
}) =>
  line.imageR2Key && line.imageWidth && line.imageHeight && line.imageAlt
    ? {
        url: mediaUrl(line.imageR2Key),
        width: line.imageWidth,
        height: line.imageHeight,
        alt: line.imageAlt,
      }
    : null

export async function getPrivateOrder(input: unknown) {
  'use server'

  await enforceRateLimit('private-order-status', env.PRIVATE_STATUS_RATE_LIMITER)
  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  try {
    const access: PrivateOrderAccess = input
    const result = await commerce.orders.getPrivateStatus(access.orderId, access.statusToken)
    if (result.status === 'error') {
      if (!Value.Check(privateOrderErrorSchema, result.error)) {
        throw new Error('Invalid private order domain failure.')
      }
      return { ok: false as const, failure: { type: 'domain' as const, error: result.error } }
    }

    const order: PublicOrder = {
      id: result.value.id,
      number: result.value.number,
      status: result.value.status,
      customerName: result.value.customerName,
      customerPhone: result.value.customerPhone,
      district: result.value.district,
      khoroo: result.value.khoroo,
      address: result.value.address,
      deliveryNotes: result.value.deliveryNotes,
      subtotalMnt: result.value.subtotalMnt,
      deliveryFeeMnt: result.value.deliveryFeeMnt,
      totalMnt: result.value.totalMnt,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt,
      lines: result.value.lines.map(line => ({
        productName: line.productName,
        variantName: line.variantName,
        sku: line.sku,
        options: line.options,
        image: publicImage(line),
        unitPriceMnt: line.unitPriceMnt,
        quantity: line.quantity,
        lineTotalMnt: line.lineTotalMnt,
      })),
      payment: result.value.payment
        ? {
            method: result.value.payment.method,
            status: result.value.payment.status,
            amountMnt: result.value.payment.amountMnt,
            claimedAt: result.value.payment.claimedAt,
            paidAt: result.value.payment.paidAt,
          }
        : null,
    }

    if (!Value.Check(publicOrderSchema, order)) throw new Error('Invalid private order result.')
    return { ok: true as const, order }
  } catch (error) {
    return throwUnexpectedServerError('private-order-status', error, 'Захиалгыг шалгаж чадсангүй.')
  }
}

export async function claimPrivateBankTransfer(form: FormData) {
  'use server'

  await enforceRateLimit('bank-transfer-claim', env.BANK_CLAIM_RATE_LIMITER)
  const input = privateAccessFromForm(form)
  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  try {
    const access: PrivateOrderAccess = input
    const result = await commerce.payments.claimBankTransfer(access.orderId, access.statusToken)
    if (result.status === 'error') {
      if (!Value.Check(bankTransferClaimErrorSchema, result.error)) {
        throw new Error('Invalid bank claim domain failure.')
      }
      return { ok: false as const, failure: { type: 'domain' as const, error: result.error } }
    }

    if (!Value.Check(bankTransferClaimSchema, result.value)) {
      throw new Error('Invalid bank claim result.')
    }
    return { ok: true as const, value: result.value }
  } catch (error) {
    return throwUnexpectedServerError(
      'bank-transfer-claim',
      error,
      'Төлбөрийн мэдэгдэл илгээж чадсангүй.',
    )
  }
}

export async function refreshPrivateQPay(form: FormData) {
  'use server'

  await enforceRateLimit('qpay-refresh', env.QPAY_REFRESH_RATE_LIMITER)
  const input = privateAccessFromForm(form)
  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  try {
    const access: PrivateOrderAccess = input
    const result = await commerce.payments.refreshQPayPayment(access.orderId, access.statusToken)
    if (result.status === 'error') {
      if (!Value.Check(paymentRefreshErrorSchema, result.error)) {
        throw new Error('Invalid QPay refresh domain failure.')
      }
      return { ok: false as const, failure: { type: 'domain' as const, error: result.error } }
    }

    if (!Value.Check(paymentRefreshSchema, result.value)) {
      throw new Error('Invalid QPay refresh result.')
    }
    return { ok: true as const, value: result.value }
  } catch (error) {
    return throwUnexpectedServerError('qpay-refresh', error, 'QPay төлбөрийг шалгаж чадсангүй.')
  }
}

export const claimBankTransferAction = action(claimPrivateBankTransfer)
export const refreshQPayAction = action(refreshPrivateQPay)
