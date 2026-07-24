import type { CartCorrection, CheckoutCreated, CheckoutError } from '@store-kit/contracts'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
import { query as dbQuery } from '@store-kit/db'
import { createOrderId, createOrderLineId, createPaymentId } from '@store-kit/db/ids'
/* oxlint-disable eslint/no-underscore-dangle */
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import { createQPayInvoice } from '../adapters/qpay'
import { hashStatusToken } from '../orders/status-token'

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')

const checkoutFieldMessage = (path: string) => {
  if (path.startsWith('/items')) return 'Сагсны бараагаа шалгана уу.'
  if (path === '/customer/name') return 'Нэрээ оруулна уу.'
  if (path === '/customer/phone') return 'Монголын 8 оронтой дугаар оруулна уу.'
  if (path === '/delivery/district') return 'Дүүргээ сонгоно уу.'
  if (path === '/delivery/khoroo') return 'Хороогоо оруулна уу.'
  if (path === '/delivery/address') return 'Дэлгэрэнгүй хаягаа оруулна уу.'
  if (path === '/paymentMethod') return 'Төлбөрийн аргаа сонгоно уу.'
  return 'Захиалгын мэдээлэл буруу байна.'
}

export const createCheckoutOrder = async (input: unknown) => {
  if (
    input !== null &&
    typeof input === 'object' &&
    'items' in input &&
    Array.isArray(input.items) &&
    input.items.length === 0
  )
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartEmpty',
      message: 'Таны сагс хоосон байна.',
    })
  if (!Value.Check(checkoutInputSchema, input))
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Захиалгын мэдээллээ шалгана уу.',
      fields: [...Value.Errors(checkoutInputSchema, input)].map(issue => ({
        path: issue.instancePath,
        message: checkoutFieldMessage(issue.instancePath),
      })),
    })
  const variantIds = new Set(input.items.map(item => item.variantId))
  if (variantIds.size !== input.items.length)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Нэг барааны сонголтыг давхар оруулах боломжгүй.',
      fields: [{ path: '/items', message: 'Нэг сонголтыг нэг удаа оруулна уу.' }],
    })
  const phone = normalizePhone(input.customer.phone)
  if (!/^[6789]\d{7}$/.test(phone))
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Утасны дугаараа шалгана уу.',
      fields: [{ path: '/customer/phone', message: 'Монголын 8 оронтой дугаар оруулна уу.' }],
    })

  const [settings, variants] = await Promise.all([
    dbQuery.checkout.findSettings(),
    dbQuery.cart.findVariants(input.items),
  ])
  if (!settings)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'DeliveryUnavailable',
      message: 'Хүргэлтийн тохиргоо олдсонгүй.',
    })
  const byId = new Map(variants.map(variant => [variant.variantId, variant]))
  const corrections = input.items.flatMap<CartCorrection>(item => {
    const variant = byId.get(item.variantId)
    if (!variant)
      return [
        {
          _tag: 'MissingVariant',
          variantId: item.variantId,
          message: 'Энэ сонголт олдсонгүй. Сагснаас хасна уу.',
        },
      ]
    if (!variant.active || variant.productStatus !== 'active')
      return [
        {
          _tag: 'InactiveVariant',
          variantId: item.variantId,
          message: 'Энэ сонголт одоогоор худалдаалагдахгүй байна.',
        },
      ]
    if (variant.stockQuantity < item.quantity)
      return [
        {
          _tag: 'InsufficientStock',
          variantId: item.variantId,
          availableQuantity: variant.stockQuantity,
          message: 'Хүссэн тоо хэмжээгээр үлдэгдэл хүрэлцэхгүй байна.',
        },
      ]
    return []
  })
  if (corrections.length > 0)
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartChanged',
      message: 'Сагсны бараа эсвэл үлдэгдэл өөрчлөгдсөн байна.',
      corrections,
    })

  const orderId = createOrderId()
  const orderNumber = `PLG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  const statusToken = `${crypto.randomUUID()}${crypto.randomUUID()}`
  const subtotalMnt = input.items.reduce(
    (sum, item) => sum + byId.get(item.variantId)!.unitPriceMnt * item.quantity,
    0,
  )
  const totalMnt = subtotalMnt + settings.deliveryFeeMnt
  const now = Date.now()
  const invoice =
    input.paymentMethod === 'qpay'
      ? await createQPayInvoice({
          orderNumber,
          amountMnt: totalMnt,
          description: `${orderNumber} захиалга`,
        })
      : null
  if (invoice?.status === 'error')
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'PaymentSetupFailed',
      message: invoice.error.message,
      canUseBankTransfer: true,
    })

  await dbQuery.checkout.insertOrder({
    order: {
      id: orderId,
      number: orderNumber,
      statusTokenHash: await hashStatusToken(statusToken),
      status: 'new',
      customerName: input.customer.name.trim(),
      customerPhone: phone,
      district: input.delivery.district,
      khoroo: input.delivery.khoroo.trim(),
      address: input.delivery.address.trim(),
      deliveryNotes: input.delivery.notes?.trim() || null,
      subtotalMnt,
      deliveryFeeMnt: settings.deliveryFeeMnt,
      totalMnt,
      createdAt: now,
      updatedAt: now,
    },
    lines: input.items.map(item => {
      const variant = byId.get(item.variantId)!
      return {
        id: createOrderLineId(),
        orderId,
        productId: variant.productId,
        variantId: variant.variantId,
        productName: variant.productName,
        variantName: variant.variantName,
        sku: variant.sku,
        options: variant.options,
        imageR2Key: variant.imageR2Key,
        unitPriceMnt: variant.unitPriceMnt,
        quantity: item.quantity,
        lineTotalMnt: variant.unitPriceMnt * item.quantity,
      }
    }),
    payment: {
      id: createPaymentId(),
      orderId,
      method: input.paymentMethod,
      status: 'pending',
      amountMnt: totalMnt,
      providerInvoiceId: invoice?.status === 'ok' ? invoice.value.invoiceId : null,
      createdAt: now,
      updatedAt: now,
    },
  })

  const nextAction =
    invoice?.status === 'ok'
      ? {
          type: 'qpay' as const,
          qrText: invoice.value.qrText,
          qrImage: invoice.value.qrImage,
          urls: invoice.value.urls,
        }
      : {
          type: 'bank_transfer' as const,
          bankName: settings.bankName,
          accountName: settings.bankAccountName,
          accountNumber: settings.bankAccountNumber,
        }
  return Result.ok<CheckoutCreated, CheckoutError>({
    orderId,
    orderNumber,
    statusToken,
    nextAction,
  })
}

export const checkoutOperations = { createOrder: createCheckoutOrder }
