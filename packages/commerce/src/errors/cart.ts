import type { CartCorrection, CartValidationError } from '@store-kit/contracts/cart'
import type { ValidationIssue } from '@store-kit/contracts/common'

export const cartEmpty = () =>
  ({
    _tag: 'CartEmpty',
    message: 'Таны сагс хоосон байна.',
  }) satisfies CartValidationError

export const invalidCart = (fields: ValidationIssue[]) =>
  ({
    _tag: 'InvalidCart',
    fields,
  }) satisfies CartValidationError

export const duplicateCartVariant = () =>
  ({
    _tag: 'InvalidCart',
    fields: [{ path: '/items', code: 'duplicate' }],
  }) satisfies CartValidationError

export const missingVariant = (variantId: string) =>
  ({
    _tag: 'MissingVariant',
    variantId,
    message: 'Энэ сонголт олдсонгүй. Сагснаас хасна уу.',
  }) satisfies CartCorrection

export const inactiveVariant = (variantId: string) =>
  ({
    _tag: 'InactiveVariant',
    variantId,
    message: 'Энэ сонголт одоогоор худалдаалагдахгүй байна.',
  }) satisfies CartCorrection

export const insufficientStock = (variantId: string, availableQuantity: number) =>
  ({
    _tag: 'InsufficientStock',
    variantId,
    availableQuantity,
    message: 'Хүссэн тоо хэмжээгээр үлдэгдэл хүрэлцэхгүй байна.',
  }) satisfies CartCorrection

export const changedPrice = (
  variantId: string,
  previousUnitPriceMnt: number,
  currentUnitPriceMnt: number,
) =>
  ({
    _tag: 'PriceChanged',
    variantId,
    previousUnitPriceMnt,
    currentUnitPriceMnt,
    message: 'Энэ барааны үнэ өөрчлөгдсөн байна.',
  }) satisfies CartCorrection
