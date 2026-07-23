import {
  confirmPaymentAndDecrementStock,
  findCartVariants,
  findCheckoutSettings,
  findPrivateOrder,
  insertOrderWithLinesAndPayment,
  markQPayPaidWithoutStock,
} from '@store-kit/db/queries/shopping'
import { checkoutInputSchema, persistedCartItemsSchema } from '@store-kit/db/schemas/shopping'
import type { CheckoutInput, PersistedCartItem } from '@store-kit/db/schemas/shopping'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

import type {
  CartCorrection,
  CartValidationError,
  CheckoutError,
  CheckoutSettingsError,
  PaymentConfirmationError,
  PrivateOrderError,
} from './errors'

export type { CartLineInput, PersistedCartItem } from '@store-kit/db/schemas/shopping'

export type StockStatus = 'in-stock' | 'low-stock' | 'sold-out'

export type ValidatedCartLine = {
  variantId: string
  productSlug: string
  productName: string
  variantName: string
  sku: string
  options: Record<string, string>
  imageR2Key: string | null
  unitPriceMnt: number
  requestedQuantity: number
  availableQuantity: number
  stockStatus: StockStatus
  lineTotalMnt: number
}

export type ValidatedCart = {
  lines: ValidatedCartLine[]
  corrections: CartCorrection[]
  subtotalMnt: number
}

const stockStatus = (quantity: number): StockStatus => {
  if (quantity === 0) return 'sold-out'
  if (quantity <= 3) return 'low-stock'
  return 'in-stock'
}

const invalidCart = (input: unknown) => ({
  _tag: 'InvalidCart' as const,
  message: 'Сагсны мэдээлэл буруу байна.',
  fields: Value.Errors(persistedCartItemsSchema, input).map(error => ({
    path: error.instancePath,
    message: error.message,
  })),
})

export const validateCart = async (input: PersistedCartItem[]) => {
  if (input.length === 0) {
    return Result.err<ValidatedCart, CartValidationError>({
      _tag: 'CartEmpty',
      message: 'Таны сагс хоосон байна.',
    })
  }
  if (!Value.Check(persistedCartItemsSchema, input)) {
    return Result.err<ValidatedCart, CartValidationError>(invalidCart(input))
  }

  const duplicateVariant = input.find(
    (item, index) => input.findIndex(candidate => candidate.variantId === item.variantId) !== index,
  )
  if (duplicateVariant) {
    return Result.err<ValidatedCart, CartValidationError>({
      _tag: 'InvalidCart',
      message: 'Сагсны мэдээлэл буруу байна.',
      fields: [{ path: '/items', message: 'Нэг хувилбар нэг удаа байх ёстой.' }],
    })
  }

  const currentVariants = await findCartVariants(input)
  const variantsById = new Map(currentVariants.map(variant => [variant.variantId, variant]))
  const corrections: CartCorrection[] = []
  const lines: ValidatedCartLine[] = []

  for (const item of input) {
    const variant = variantsById.get(item.variantId)
    if (!variant) {
      corrections.push({
        _tag: 'MissingVariant',
        variantId: item.variantId,
        message: 'Энэ сонголт олдсонгүй. Сагснаас хасна уу.',
      })
      continue
    }

    if (!variant.active || variant.productStatus !== 'active') {
      corrections.push({
        _tag: 'InactiveVariant',
        variantId: item.variantId,
        message: 'Энэ сонголт одоогоор худалдаалагдахгүй байна.',
      })
    }
    if (variant.stockQuantity < item.quantity) {
      corrections.push({
        _tag: 'InsufficientStock',
        variantId: item.variantId,
        availableQuantity: variant.stockQuantity,
        message: 'Хүссэн тоо хэмжээгээр үлдэгдэл хүрэлцэхгүй байна.',
      })
    }
    if (variant.unitPriceMnt !== item.unitPriceMnt) {
      corrections.push({
        _tag: 'PriceChanged',
        variantId: item.variantId,
        previousUnitPriceMnt: item.unitPriceMnt,
        currentUnitPriceMnt: variant.unitPriceMnt,
        message: 'Энэ барааны үнэ өөрчлөгдсөн байна.',
      })
    }

    lines.push({
      variantId: variant.variantId,
      productSlug: variant.productSlug,
      productName: variant.productName,
      variantName: variant.variantName,
      sku: variant.sku,
      options: variant.options,
      imageR2Key: variant.imageR2Key,
      unitPriceMnt: variant.unitPriceMnt,
      requestedQuantity: item.quantity,
      availableQuantity: variant.stockQuantity,
      stockStatus: stockStatus(variant.stockQuantity),
      lineTotalMnt: variant.unitPriceMnt * item.quantity,
    })
  }

  return Result.ok<ValidatedCart, CartValidationError>({
    lines,
    corrections,
    subtotalMnt: lines.reduce((total, line) => total + line.lineTotalMnt, 0),
  })
}

export const getCheckoutSettings = async () => {
  const settings = await findCheckoutSettings()
  return settings
    ? Result.ok(settings)
    : Result.err<NonNullable<typeof settings>, CheckoutSettingsError>({
        _tag: 'CheckoutSettingsNotFound',
        message: 'Төлбөрийн тохиргоо олдсонгүй.',
      })
}

const bytesToBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')

const hashStatusToken = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const normalizePhone = (phone: string) => {
  const digits = phone.replaceAll(/[^0-9]/g, '').replace(/^976/, '')
  return /^\d{8}$/.test(digits) ? digits : null
}

export type PreparedQPayInvoice = {
  providerInvoiceId: string
  qrCode: string
  deepLinks: { name: string; url: string }[]
}

export type CheckoutCreated = {
  orderId: string
  orderNumber: string
  statusToken: string
  nextAction:
    | { method: 'qpay'; qrCode: string; deepLinks: { name: string; url: string }[] }
    | {
        method: 'bank_transfer'
        bankName: string
        accountName: string
        accountNumber: string
      }
}

export const createCheckoutOrder = async (
  input: CheckoutInput,
  preparedQPayInvoice?: PreparedQPayInvoice,
) => {
  if (input.items.length === 0) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartEmpty',
      message: 'Таны сагс хоосон байна.',
    })
  }
  if (!Value.Check(checkoutInputSchema, input)) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Захиалгын мэдээллээ шалгана уу.',
      fields: Value.Errors(checkoutInputSchema, input).map(error => ({
        path: error.instancePath,
        message: error.message,
      })),
    })
  }

  const phone = normalizePhone(input.customer.phone)
  const duplicateVariant = input.items.find(
    (item, index) =>
      input.items.findIndex(candidate => candidate.variantId === item.variantId) !== index,
  )
  const emptyFields = [
    ['/customer/name', input.customer.name],
    ['/delivery/khoroo', input.delivery.khoroo],
    ['/delivery/address', input.delivery.address],
  ].filter(([, value]) => !value.trim())
  if (!phone || duplicateVariant || emptyFields.length > 0) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'InvalidCheckoutDetails',
      message: 'Захиалгын мэдээллээ шалгана уу.',
      fields: [
        ...(phone
          ? []
          : [{ path: '/customer/phone', message: '8 оронтой утасны дугаар оруулна уу.' }]),
        ...(duplicateVariant
          ? [{ path: '/items', message: 'Нэг хувилбар нэг удаа байх ёстой.' }]
          : []),
        ...emptyFields.map(([path]) => ({ path, message: 'Энэ талбарыг бөглөнө үү.' })),
      ],
    })
  }
  if (input.paymentMethod === 'qpay' && !preparedQPayInvoice) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'PaymentSetupFailed',
      message: 'QPay төлбөр бэлдэх боломжгүй байна.',
      canUseBankTransfer: true,
    })
  }

  const [settings, variants] = await Promise.all([
    findCheckoutSettings(),
    findCartVariants(input.items),
  ])
  if (!settings) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'DeliveryUnavailable',
      message: 'Хүргэлт одоогоор боломжгүй байна.',
    })
  }

  const currentById = new Map(variants.map(variant => [variant.variantId, variant]))
  const corrections: CartCorrection[] = []
  for (const item of input.items) {
    const variant = currentById.get(item.variantId)
    if (!variant) {
      corrections.push({
        _tag: 'MissingVariant',
        variantId: item.variantId,
        message: 'Энэ сонголт олдсонгүй. Сагснаас хасна уу.',
      })
    } else if (!variant.active || variant.productStatus !== 'active') {
      corrections.push({
        _tag: 'InactiveVariant',
        variantId: item.variantId,
        message: 'Энэ сонголт одоогоор худалдаалагдахгүй байна.',
      })
    } else if (variant.stockQuantity < item.quantity) {
      corrections.push({
        _tag: 'InsufficientStock',
        variantId: item.variantId,
        availableQuantity: variant.stockQuantity,
        message: 'Хүссэн тоо хэмжээгээр үлдэгдэл хүрэлцэхгүй байна.',
      })
    }
  }
  if (corrections.length > 0) {
    return Result.err<CheckoutCreated, CheckoutError>({
      _tag: 'CartChanged',
      message: 'Сагсны зарим бараа өөрчлөгдсөн байна.',
      corrections,
    })
  }

  const now = Date.now()
  const orderId = crypto.randomUUID()
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const statusToken = bytesToBase64Url(tokenBytes)
  const statusTokenHash = await hashStatusToken(statusToken)
  const orderNumber = `PLG-${orderId.slice(0, 8).toUpperCase()}`
  const lines = input.items.map(item => {
    const variant = currentById.get(item.variantId)!
    return {
      id: crypto.randomUUID(),
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
  })
  const subtotalMnt = lines.reduce((total, line) => total + line.lineTotalMnt, 0)
  const totalMnt = subtotalMnt + settings.deliveryFeeMnt

  await insertOrderWithLinesAndPayment({
    order: {
      id: orderId,
      number: orderNumber,
      statusTokenHash,
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
    lines,
    payment: {
      id: crypto.randomUUID(),
      orderId,
      method: input.paymentMethod,
      status: 'pending',
      amountMnt: totalMnt,
      providerInvoiceId: preparedQPayInvoice?.providerInvoiceId,
      createdAt: now,
      updatedAt: now,
    },
  })

  const nextAction =
    input.paymentMethod === 'qpay'
      ? {
          method: 'qpay' as const,
          qrCode: preparedQPayInvoice!.qrCode,
          deepLinks: preparedQPayInvoice!.deepLinks,
        }
      : {
          method: 'bank_transfer' as const,
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

export const getPrivateOrderStatus = async (orderId: string, statusToken: string) => {
  if (!statusToken) {
    return Result.err<NonNullable<Awaited<ReturnType<typeof findPrivateOrder>>>, PrivateOrderError>(
      {
        _tag: 'InvalidStatusToken',
        message: 'Захиалга олдсонгүй.',
      },
    )
  }
  const privateOrder = await findPrivateOrder(orderId, await hashStatusToken(statusToken))
  return privateOrder
    ? Result.ok(privateOrder)
    : Result.err<NonNullable<typeof privateOrder>, PrivateOrderError>({
        _tag: 'OrderNotFound',
        message: 'Захиалга олдсонгүй.',
      })
}

export type PaymentConfirmation = {
  orderId: string
  paymentStatus: 'paid'
  orderStatus: 'confirmed' | 'new'
  stockApplied: boolean
  needsStaffAction: boolean
}

export type ProviderReference = {
  paymentId: string
  amountMnt: number
  method: 'qpay' | 'bank_transfer'
}

export const confirmOrderPayment = async (
  orderId: string,
  providerReference: ProviderReference,
) => {
  if (!providerReference.paymentId || providerReference.amountMnt < 0) {
    return Result.err<PaymentConfirmation, PaymentConfirmationError>({
      _tag: 'PaymentMismatch',
      message: 'Төлбөрийн мэдээлэл тохирохгүй байна.',
    })
  }

  const paidAt = Date.now()
  const result = await confirmPaymentAndDecrementStock({
    orderId,
    providerPaymentId: providerReference.paymentId,
    amountMnt: providerReference.amountMnt,
    method: providerReference.method,
    paidAt,
  })
  if (result.status === 'confirmed') {
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      stockApplied: true,
      needsStaffAction: false,
    })
  }
  if (result.status === 'already-paid') {
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: result.stockApplied ? 'confirmed' : 'new',
      stockApplied: result.stockApplied,
      needsStaffAction: !result.stockApplied,
    })
  }
  if (result.status === 'payment-mismatch') {
    return Result.err<PaymentConfirmation, PaymentConfirmationError>({
      _tag: 'PaymentMismatch',
      message: 'Төлбөрийн мэдээлэл тохирохгүй байна.',
    })
  }
  if (result.method === 'qpay') {
    await markQPayPaidWithoutStock({
      orderId,
      providerPaymentId: providerReference.paymentId,
      amountMnt: providerReference.amountMnt,
      method: providerReference.method,
      paidAt,
    })
    return Result.ok<PaymentConfirmation, PaymentConfirmationError>({
      orderId,
      paymentStatus: 'paid',
      orderStatus: 'new',
      stockApplied: false,
      needsStaffAction: true,
    })
  }
  return Result.err<PaymentConfirmation, PaymentConfirmationError>({
    _tag: 'InsufficientStock',
    message: 'Үлдэгдэл хүрэлцэхгүй тул төлбөр баталгаажсангүй.',
    variantIds: [],
  })
}
