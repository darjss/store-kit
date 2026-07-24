import type {
  BankTransferClaimError,
  CartCorrection,
  CartValidationError,
  CheckoutError,
  PaymentConfirmationError,
  PaymentRefreshError,
  PrivateOrderError,
  ProductNotFound,
  ValidationIssue,
} from '@store-kit/contracts/errors'
import type { PaymentStatus } from '@store-kit/contracts/payments'

export type QPayError =
  | { _tag: 'QPayRequestFailed'; message: string }
  | { _tag: 'QPayResponseInvalid'; message: string }

export type TelegramError =
  | { _tag: 'TelegramRequestFailed'; message: string }
  | { _tag: 'TelegramResponseInvalid'; message: string }

export const qpayError = (tag: QPayError['_tag']) =>
  ({
    _tag: tag,
    message: 'QPay төлбөрийг одоогоор бэлтгэх боломжгүй байна.',
  }) satisfies QPayError

export const telegramRequestError = () =>
  ({
    _tag: 'TelegramRequestFailed',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
  }) satisfies TelegramError

export const telegramResponseError = () =>
  ({
    _tag: 'TelegramResponseInvalid',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй.',
  }) satisfies TelegramError

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

export const invalidStatusToken = () =>
  ({
    _tag: 'InvalidStatusToken',
    message: 'Захиалга олдсонгүй.',
  }) satisfies PrivateOrderError

export const paymentMismatch = () =>
  ({
    _tag: 'PaymentMismatch',
    message: 'Төлбөрийн мэдээлэл таарахгүй байна.',
  }) satisfies PaymentConfirmationError

export const paymentInsufficientStock = (variantIds: string[]) =>
  ({
    _tag: 'InsufficientStock',
    message: 'Үлдэгдэл хүрэлцэхгүй тул төлбөрийг баталсангүй.',
    variantIds,
  }) satisfies PaymentConfirmationError

export const paymentVerificationFailed = () =>
  ({
    _tag: 'PaymentVerificationFailed',
    message: 'QPay төлбөрийг одоогоор шалгаж чадсангүй.',
    retryable: true,
  }) satisfies PaymentRefreshError

export const qpayInvoiceMissing = () =>
  ({
    _tag: 'PaymentMismatch',
    message: 'QPay нэхэмжлэл олдсонгүй.',
  }) satisfies PaymentRefreshError

export const bankTransferClaimNotAllowed = (paymentStatus: PaymentStatus) =>
  ({
    _tag: 'BankTransferClaimNotAllowed',
    message: 'Энэ төлбөрт мэдэгдэл өгөх боломжгүй.',
    paymentStatus,
  }) satisfies BankTransferClaimError

export const staffNotificationFailed = () =>
  ({
    _tag: 'StaffNotificationFailed',
    message: 'Ажилтанд мэдэгдэл илгээж чадсангүй. Дахин оролдоно уу.',
    retryable: true,
  }) satisfies BankTransferClaimError

export const createProductNotFound = (slug: string) =>
  ({
    _tag: 'ProductNotFound',
    message: `Product not found: ${slug}`,
    slug,
  }) satisfies ProductNotFound
