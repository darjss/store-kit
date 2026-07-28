import { Skeleton } from '@store-kit/ui'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { Match, Switch } from 'solid-js'
import { toast } from 'solid-sonner'

import { InlineAlert, PageHeader, RetryState } from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import { StoreSettingsForm } from './form'
import type { SettingsRequests } from './query-options'
import { settingsKeys, settingsMutation, settingsQuery } from './query-options'

function SettingsFormSkeleton() {
  return (
    <div aria-busy="true" class="mt-6 rounded-lg border p-4 sm:p-5" role="status">
      <span class="sr-only">Loading store settings…</span>
      <Skeleton class="h-6 w-64 max-w-full" />
      <Skeleton class="mt-2 h-4 w-full max-w-xl" />
      <div class="mt-5 border-t pt-5">
        <Skeleton class="h-4 w-24" />
        <Skeleton class="mt-2 h-9 w-full max-w-xs" />
        <Skeleton class="mt-2 h-3 w-72 max-w-full" />
      </div>
      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <Skeleton class="h-4 w-20" />
          <Skeleton class="mt-2 h-9 w-full" />
          <Skeleton class="mt-2 h-3 w-64 max-w-full" />
        </div>
        <div>
          <Skeleton class="h-4 w-24" />
          <Skeleton class="mt-2 h-9 w-full" />
          <Skeleton class="mt-2 h-3 w-64 max-w-full" />
        </div>
      </div>
      <div class="mt-5">
        <Skeleton class="h-4 w-28" />
        <Skeleton class="mt-2 h-9 w-full max-w-md" />
        <Skeleton class="mt-2 h-3 w-80 max-w-full" />
      </div>
      <Skeleton class="mt-6 h-9 w-36" />
    </div>
  )
}

export type SettingsPageProps = {
  requests: SettingsRequests
}

export function SettingsPage(props: SettingsPageProps) {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => settingsQuery.store(props.requests))
  const mutation = useMutation(() => settingsMutation.updateStore(props.requests))
  const settings = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () => query.data?.match({ ok: () => undefined, err: error => error })

  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    toast.success('Store settings saved.')
  }

  return (
    <section class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        description="Manage the delivery fee and bank-transfer details used by new checkouts."
        title="Store settings"
        titleId="store-settings-title"
      />

      <Switch>
        <Match when={query.isPending}>
          <SettingsFormSkeleton />
        </Match>
        <Match when={query.isError}>
          <div class="mt-6">
            <RetryState
              message="Check your connection, then retry the store settings request."
              onRetry={() => {
                void query.refetch()
              }}
              pending={query.isFetching}
            />
          </div>
        </Match>
        <Match when={expectedError()}>
          {error => (
            <div class="mt-6">
              <InlineAlert
                title={
                  error()._tag === 'StoreSettingsMissing'
                    ? 'Store settings need setup'
                    : 'Store settings are unavailable'
                }
                tone="destructive"
              >
                {error().message}
              </InlineAlert>
            </div>
          )}
        </Match>
        <Match when={settings()}>
          {currentSettings => (
            <div class="mt-6">
              <StoreSettingsForm
                settings={currentSettings()}
                onReload={async () => {
                  const response = await query.refetch()
                  if (response.error) throw response.error
                  return response.data?.match({ ok: value => value, err: () => undefined })
                }}
                onSave={input => mutation.mutateAsync(input)}
                onSaved={saved}
              />
            </div>
          )}
        </Match>
      </Switch>
    </section>
  )
}
