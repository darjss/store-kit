import { Type } from 'typebox'
import type { Static } from 'typebox'

import { nonNegativeIntegerSchema } from './common'

const bankFieldSchema = Type.String({ minLength: 1, maxLength: 120, pattern: '.*\\S.*' })

export const adminStoreSettingsSchema = Type.Object(
  {
    deliveryFeeMnt: nonNegativeIntegerSchema,
    bankName: bankFieldSchema,
    bankAccountName: bankFieldSchema,
    bankAccountNumber: bankFieldSchema,
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminStoreSettingsUpdateSchema = Type.Object(
  {
    deliveryFeeMnt: nonNegativeIntegerSchema,
    bankName: bankFieldSchema,
    bankAccountName: bankFieldSchema,
    bankAccountNumber: bankFieldSchema,
    expectedUpdatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const storeSettingsMissingSchema = Type.Object(
  {
    _tag: Type.Literal('StoreSettingsMissing'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const storeSettingsConflictSchema = Type.Object(
  {
    _tag: Type.Literal('StoreSettingsConflict'),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const adminStoreSettingsErrorSchema = Type.Union([
  storeSettingsMissingSchema,
  storeSettingsConflictSchema,
])

export type AdminStoreSettings = Static<typeof adminStoreSettingsSchema>
export type AdminStoreSettingsUpdate = Static<typeof adminStoreSettingsUpdateSchema>
export type StoreSettingsMissing = Static<typeof storeSettingsMissingSchema>
export type StoreSettingsConflict = Static<typeof storeSettingsConflictSchema>
export type AdminStoreSettingsError = Static<typeof adminStoreSettingsErrorSchema>
