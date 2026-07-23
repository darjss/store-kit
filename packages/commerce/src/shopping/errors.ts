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
