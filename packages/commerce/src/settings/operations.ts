import type {
  AdminStoreSettings,
  AdminStoreSettingsError,
  AdminStoreSettingsUpdate,
} from '@store-kit/contracts/admin-settings'
import { database } from '@store-kit/db'
import { Result } from 'better-result'

const toAdminStoreSettings = (
  settings: NonNullable<Awaited<ReturnType<typeof database.query.settings.getStore>>>,
): AdminStoreSettings => ({
  deliveryFeeMnt: settings.deliveryFeeMnt,
  bankName: settings.bankName,
  bankAccountName: settings.bankAccountName,
  bankAccountNumber: settings.bankAccountNumber,
  updatedAt: settings.updatedAt,
})

const settingsMissing = () => ({
  _tag: 'StoreSettingsMissing' as const,
  message: 'Store settings are not available. Seed the required checkout settings first.',
})

export const getAdminStoreSettings = async () => {
  const settings = await database.query.settings.getStore()
  return settings
    ? Result.ok<AdminStoreSettings, AdminStoreSettingsError>(toAdminStoreSettings(settings))
    : Result.err<AdminStoreSettings, AdminStoreSettingsError>(settingsMissing())
}

export const updateAdminStoreSettings = async (input: AdminStoreSettingsUpdate) => {
  const write = await database.query.settings.updateStore({
    ...input,
    bankName: input.bankName.trim(),
    bankAccountName: input.bankAccountName.trim(),
    bankAccountNumber: input.bankAccountNumber.trim(),
    updatedAt: Math.max(Date.now(), input.expectedUpdatedAt + 1),
  })
  if (!write.persisted)
    return Result.err<AdminStoreSettings, AdminStoreSettingsError>(settingsMissing())
  if (!write.updated)
    return Result.err<AdminStoreSettings, AdminStoreSettingsError>({
      _tag: 'StoreSettingsConflict',
      message: 'Store settings changed. Reload the current data and try again.',
    })
  return Result.ok<AdminStoreSettings, AdminStoreSettingsError>(
    toAdminStoreSettings(write.persisted),
  )
}

export const settingsOperations = {
  getStore: getAdminStoreSettings,
  updateStore: updateAdminStoreSettings,
}
