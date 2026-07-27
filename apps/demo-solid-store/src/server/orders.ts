import { respond } from '@solidjs/web'
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
import { Value } from 'typebox/value'

import { mediaUrl } from '~/catalog/media'

const invalidStatusToken = (): PrivateOrderError => ({
  _tag: 'InvalidStatusToken',
  message: 'Захиалга олдсонгүй.',
})

const invalidAccessResult = () => ({
  ok: false as const,
  failure: { type: 'domain' as const, error: invalidStatusToken() },
})

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

  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  const access: PrivateOrderAccess = input
  const result = await commerce.orders.getPrivateStatus(access.orderId, access.statusToken)
  if (result.status === 'error') {
    if (!Value.Check(privateOrderErrorSchema, result.error)) {
      throw respond(
        { code: 'invalid_private_order_failure', message: 'Захиалгыг шалгаж чадсангүй.' },
        { status: 500 },
      )
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

  if (!Value.Check(publicOrderSchema, order)) {
    throw respond(
      { code: 'invalid_private_order_result', message: 'Захиалгыг шалгаж чадсангүй.' },
      { status: 500 },
    )
  }

  return { ok: true as const, order }
}

export async function claimPrivateBankTransfer(input: unknown) {
  'use server'

  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  const access: PrivateOrderAccess = input
  const result = await commerce.payments.claimBankTransfer(access.orderId, access.statusToken)
  if (result.status === 'error') {
    if (!Value.Check(bankTransferClaimErrorSchema, result.error)) {
      throw respond(
        { code: 'invalid_bank_claim_failure', message: 'Төлбөрийн мэдэгдэл илгээж чадсангүй.' },
        { status: 500 },
      )
    }
    return { ok: false as const, failure: { type: 'domain' as const, error: result.error } }
  }

  if (!Value.Check(bankTransferClaimSchema, result.value)) {
    throw respond(
      { code: 'invalid_bank_claim_result', message: 'Төлбөрийн мэдэгдэл илгээж чадсангүй.' },
      { status: 500 },
    )
  }

  return { ok: true as const, value: result.value }
}

export async function refreshPrivateQPay(input: unknown) {
  'use server'

  if (!Value.Check(privateOrderAccessSchema, input)) return invalidAccessResult()

  const access: PrivateOrderAccess = input
  const result = await commerce.payments.refreshQPayPayment(access.orderId, access.statusToken)
  if (result.status === 'error') {
    if (!Value.Check(paymentRefreshErrorSchema, result.error)) {
      throw respond(
        { code: 'invalid_qpay_refresh_failure', message: 'QPay төлбөрийг шалгаж чадсангүй.' },
        { status: 500 },
      )
    }
    return { ok: false as const, failure: { type: 'domain' as const, error: result.error } }
  }

  if (!Value.Check(paymentRefreshSchema, result.value)) {
    throw respond(
      { code: 'invalid_qpay_refresh_result', message: 'QPay төлбөрийг шалгаж чадсангүй.' },
      { status: 500 },
    )
  }

  return { ok: true as const, value: result.value }
}
