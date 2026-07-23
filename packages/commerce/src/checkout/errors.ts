import type { CartCorrection } from '@store-kit/contracts/cart'
import type { CheckoutError } from '@store-kit/contracts/checkout'
import { match } from 'dismatch'

type ValidationIssue = Extract<CheckoutError, { _tag: 'InvalidCheckoutDetails' }>['fields'][number]

export const emptyCheckoutCart = () =>
  ({
    _tag: 'CartEmpty',
    message: 'Таны сагс хоосон байна.',
  }) satisfies CheckoutError

type CheckoutField =
  | { type: 'items' }
  | { type: 'customer-name' }
  | { type: 'customer-phone' }
  | { type: 'delivery-district' }
  | { type: 'delivery-khoroo' }
  | { type: 'delivery-address' }
  | { type: 'payment-method' }
  | { type: 'unknown' }

const checkoutFields: Record<string, CheckoutField> = {
  '/customer/name': { type: 'customer-name' },
  '/customer/phone': { type: 'customer-phone' },
  '/delivery/district': { type: 'delivery-district' },
  '/delivery/khoroo': { type: 'delivery-khoroo' },
  '/delivery/address': { type: 'delivery-address' },
  '/paymentMethod': { type: 'payment-method' },
}

const checkoutField = (path: string): CheckoutField =>
  path.startsWith('/items') ? { type: 'items' } : (checkoutFields[path] ?? { type: 'unknown' })

export const checkoutFieldMessage = (path: string) =>
  match(checkoutField(path))({
    'items': () => 'Сагсны бараагаа шалгана уу.',
    'customer-name': () => 'Нэрээ оруулна уу.',
    'customer-phone': () => 'Монголын 8 оронтой дугаар оруулна уу.',
    'delivery-district': () => 'Дүүргээ сонгоно уу.',
    'delivery-khoroo': () => 'Хороогоо оруулна уу.',
    'delivery-address': () => 'Дэлгэрэнгүй хаягаа оруулна уу.',
    'payment-method': () => 'Төлбөрийн аргаа сонгоно уу.',
    'unknown': () => 'Захиалгын мэдээлэл буруу байна.',
  })

export const invalidCheckoutDetails = (
  fields: ValidationIssue[],
  message = 'Захиалгын мэдээллээ шалгана уу.',
) =>
  ({
    _tag: 'InvalidCheckoutDetails',
    message,
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
