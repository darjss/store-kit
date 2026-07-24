import type { CartCorrection } from '@store-kit/contracts/cart'
import type { CheckoutError } from '@store-kit/contracts/checkout'
import type { ValidationIssue } from '@store-kit/contracts/common'

export const emptyCheckoutCart = () =>
  ({
    _tag: 'CartEmpty',
    message: 'Таны сагс хоосон байна.',
  }) satisfies CheckoutError

export const invalidCheckoutDetails = (fields: ValidationIssue[]) =>
  ({
    _tag: 'InvalidCheckoutDetails',
    fields,
  }) satisfies CheckoutError

export const deliveryUnavailable = () =>
  ({
    _tag: 'DeliveryUnavailable',
    message: 'Хүргэлтийн тохиргоо олдсонгүй.',
  }) satisfies CheckoutError

export const changedCart = (corrections: CartCorrection[]) =>
  ({
    _tag: 'CartChanged',
    message: 'Сагсны бараа эсвэл үлдэгдэл өөрчлөгдсөн байна.',
    corrections,
  }) satisfies CheckoutError

export const paymentSetupFailed = (message: string) =>
  ({
    _tag: 'PaymentSetupFailed',
    message,
    canUseBankTransfer: true,
  }) satisfies CheckoutError
