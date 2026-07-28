import type {
  AdminStoreSettings,
  AdminStoreSettingsError,
  AdminStoreSettingsUpdate,
} from '@store-kit/contracts/admin-settings'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { deserializeResult } from '../query-options/result'
import type { ResultResponse } from '../query-options/result'

export type SettingsResultResponse = ResultResponse<AdminStoreSettings, AdminStoreSettingsError>

export type SettingsRequests = {
  getStore: () => Promise<SettingsResultResponse>
  updateStore: (input: AdminStoreSettingsUpdate) => Promise<SettingsResultResponse>
}

const deserialize = (request: Promise<SettingsResultResponse>) =>
  deserializeResult(request, 'store settings')

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
