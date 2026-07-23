export type CartCorrection =
  | { _tag: 'MissingVariant'; variantId: string; message: string }
  | { _tag: 'InactiveVariant'; variantId: string; message: string }
  | {
      _tag: 'InsufficientStock'
      variantId: string
      availableQuantity: number
      message: string
    }
  | {
      _tag: 'PriceChanged'
      variantId: string
      previousUnitPriceMnt: number
      currentUnitPriceMnt: number
      message: string
    }

export type CartValidationError =
  | { _tag: 'CartEmpty'; message: string }
  | { _tag: 'InvalidCart'; message: string; fields: { path: string; message: string }[] }

export type CheckoutSettingsError = {
  _tag: 'CheckoutSettingsNotFound'
  message: string
}

export type CheckoutError =
  | { _tag: 'CartEmpty'; message: string }
  | { _tag: 'CartChanged'; message: string; corrections: CartCorrection[] }
  | {
      _tag: 'InvalidCheckoutDetails'
      message: string
      fields: { path: string; message: string }[]
    }
  | { _tag: 'DeliveryUnavailable'; message: string }
  | { _tag: 'PaymentSetupFailed'; message: string; canUseBankTransfer: boolean }

export type PrivateOrderError =
  | { _tag: 'OrderNotFound'; message: string }
  | { _tag: 'InvalidStatusToken'; message: string }

export type PaymentConfirmationError =
  | { _tag: 'PaymentMismatch'; message: string }
  | { _tag: 'InsufficientStock'; message: string; variantIds: string[] }
