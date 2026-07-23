import type { CartCorrection } from '@store-kit/contracts/cart'
import type { CheckoutError } from '@store-kit/contracts/checkout'

type ValidationIssue = Extract<CheckoutError, { _tag: 'InvalidCheckoutDetails' }>['fields'][number]

export const emptyCheckoutCart = () =>
  ({
    _tag: 'CartEmpty',
    message: 'Таны сагс хоосон байна.',
  }) satisfies CheckoutError

export const checkoutFieldMessage = (path: string) => {
  if (path.startsWith('/items')) return 'Сагсны бараагаа шалгана уу.'
  if (path === '/customer/name') return 'Нэрээ оруулна уу.'
  if (path === '/customer/phone') return 'Монголын 8 оронтой дугаар оруулна уу.'
  if (path === '/delivery/district') return 'Дүүргээ сонгоно уу.'
  if (path === '/delivery/khoroo') return 'Хороогоо оруулна уу.'
  if (path === '/delivery/address') return 'Дэлгэрэнгүй хаягаа оруулна уу.'
  if (path === '/paymentMethod') return 'Төлбөрийн аргаа сонгоно уу.'
  return 'Захиалгын мэдээлэл буруу байна.'
}

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
