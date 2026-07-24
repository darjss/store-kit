import type { CartCorrection, CartValidationError } from '@store-kit/contracts/cart'
import { persistedCartItemsSchema } from '@store-kit/contracts/cart'
import { Value } from 'typebox/value'

export const cartEmpty = () =>
  ({
    _tag: 'CartEmpty',
    message: 'Таны сагс хоосон байна.',
  }) satisfies CartValidationError

export const invalidCart = (input: unknown) =>
  ({
    _tag: 'InvalidCart',
    message: 'Сагсны мэдээлэл буруу байна.',
    fields: [...Value.Errors(persistedCartItemsSchema, input)].map(error => ({
      path: error.instancePath,
      message: error.message,
    })),
  }) satisfies CartValidationError

export const duplicateCartVariant = () =>
  ({
    _tag: 'InvalidCart',
    message: 'Сагсны мэдээлэл буруу байна.',
    fields: [{ path: '/items', message: 'Нэг хувилбар нэг удаа байх ёстой.' }],
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
