import type {
  AdminStoreSettings,
  AdminStoreSettingsError,
  AdminStoreSettingsUpdate,
} from '@store-kit/contracts/admin-settings'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export type SettingsResultResponse = {
  data: SerializedResult<AdminStoreSettings, AdminStoreSettingsError> | null
}

export type SettingsRequests = {
  getStore: () => Promise<SettingsResultResponse>
  updateStore: (input: AdminStoreSettingsUpdate) => Promise<SettingsResultResponse>
}

const deserialize = async (
  request: Promise<SettingsResultResponse>,
): Promise<Result<AdminStoreSettings, AdminStoreSettingsError>> => {
  const { data } = await request
  if (data === null) throw new Error('The store settings response did not include result data.')

  const result = Result.deserialize<AdminStoreSettings, AdminStoreSettingsError>(data)
  if (result.isOk()) return Result.ok<AdminStoreSettings, AdminStoreSettingsError>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<AdminStoreSettings, AdminStoreSettingsError>(result.error)
}

export const settingsKeys = {
  all: ['admin', 'settings'] as const,
  store: () => [...settingsKeys.all, 'store'] as const,
}

const store = (requests: SettingsRequests) =>
  queryOptions({
    queryKey: settingsKeys.store(),
    queryFn: () => deserialize(requests.getStore()),
    retry: false,
  })

const updateStore = (requests: SettingsRequests) =>
  mutationOptions({
    mutationFn: (input: AdminStoreSettingsUpdate) => deserialize(requests.updateStore(input)),
  })

export const settingsQuery = { store }
export const settingsMutation = { updateStore }
