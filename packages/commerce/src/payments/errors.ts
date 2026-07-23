import type {
  BankTransferClaimError,
  PaymentConfirmationError,
  PaymentRefreshError,
  PaymentStatus,
} from '@store-kit/contracts/payments'

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
