import type { AdminStoreSettingsUpdate } from '@store-kit/contracts/admin-settings'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { deserializeResult } from '../query-options/result'

export const settingsKeys = {
  all: ['admin', 'settings'] as const,
  store: () => [...settingsKeys.all, 'store'] as const,
}

const store = () =>
  queryOptions({
    queryKey: settingsKeys.store(),
    queryFn: () => deserializeResult(api.api.admin.settings.store.get(), 'store settings'),
    retry: false,
  })

const updateStore = () =>
  mutationOptions({
    mutationFn: (input: AdminStoreSettingsUpdate) =>
      deserializeResult(api.api.admin.settings.store.put(input), 'store settings'),
  })

export const settingsQuery = { store }
export const settingsMutation = { updateStore }
