import type {
  CartCorrection,
  CartValidationError,
  StockStatus,
  ValidatedCart,
  ValidatedCartLine,
} from '@store-kit/contracts'
import { persistedCartItemsSchema } from '@store-kit/contracts/cart'
import { findCartVariants, findCheckoutSettings } from '@store-kit/db/queries/shopping'
import { Result } from 'better-result'
import { Value } from 'typebox/value'

export type { CartLineInput, PersistedCartItem } from '@store-kit/contracts/cart'

type CheckoutSettingsError = {
  _tag: 'CheckoutSettingsNotFound'
  message: string
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

export const validateCart = async (input: unknown) => {
  if (Array.isArray(input) && input.length === 0) {
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
