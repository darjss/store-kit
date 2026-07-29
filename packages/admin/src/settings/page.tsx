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
    <div aria-busy="true" class="mt-4 border-y bg-card" role="status">
      <span class="sr-only">Loading store settings…</span>
      <div class="grid gap-5 px-4 py-5 sm:px-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
        <div>
          <Skeleton class="h-4 w-40 max-w-full" />
          <Skeleton class="mt-2 h-3 w-full" />
          <Skeleton class="mt-1 h-3 w-4/5" />
        </div>
        <div>
          <div class="border-b pb-4">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="mt-2 h-8 w-full max-w-xs" />
            <Skeleton class="mt-2 h-3 w-72 max-w-full" />
          </div>
          <div class="grid gap-4 border-b py-4 md:grid-cols-2">
            <div>
              <Skeleton class="h-3 w-20" />
              <Skeleton class="mt-2 h-8 w-full" />
              <Skeleton class="mt-2 h-3 w-48 max-w-full" />
            </div>
            <div>
              <Skeleton class="h-3 w-24" />
              <Skeleton class="mt-2 h-8 w-full" />
              <Skeleton class="mt-2 h-3 w-48 max-w-full" />
            </div>
          </div>
          <div class="pt-4">
            <Skeleton class="h-3 w-28" />
            <Skeleton class="mt-2 h-8 w-full max-w-md" />
            <Skeleton class="mt-2 h-3 w-64 max-w-full" />
          </div>
        </div>
      </div>
      <div class="flex min-h-12 items-center justify-between border-t bg-popover px-4 py-2 sm:px-5">
        <Skeleton class="h-3 w-24" />
        <Skeleton class="h-8 w-32" />
      </div>
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
    <section class="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-7">
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
          <div class="mt-4">
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
            <div class="mt-4">
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
            <div class="mt-4">
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
