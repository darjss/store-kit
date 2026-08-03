import { Skeleton } from '@store-kit/ui'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Match, Switch } from 'solid-js'
import { toast } from 'solid-sonner'

import { InlineAlert, PageHeader, RetryState } from '../components/foundation'
import { useQueryResult } from '../query-options/result'
import { StoreSettingsForm } from './form'
import { settingsKeys, settingsMutation, settingsQuery } from './query-options'

function SettingsFormSkeleton() {
  return (
    <div
      aria-busy="true"
      class="-mx-4 mt-4 border-y bg-card sm:mx-0 sm:rounded-lg sm:border-x"
      role="status"
    >
      <span class="sr-only">Дэлгүүрийн тохиргоог ачаалж байна…</span>
      <div class="border-b px-4 py-5 sm:px-6">
        <Skeleton class="h-5 w-64 max-w-full" />
        <Skeleton class="mt-2 h-4 w-full max-w-2xl" />
        <Skeleton class="mt-1 h-4 w-4/5 max-w-2xl" />
      </div>
      <div class="mx-auto max-w-2xl px-4 sm:px-6">
        <For each={[0, 1]}>
          {index => (
            <section class={index === 0 ? 'border-b py-5' : 'py-5'}>
              <Skeleton class="h-5 w-36" />
              <Skeleton class="mt-2 h-4 w-full max-w-lg" />
              <Skeleton class="mt-5 h-4 w-28" />
              <Skeleton class="mt-2 h-12 w-full" />
              <Skeleton class="mt-2 h-3 w-72 max-w-full" />
              {index === 1 && (
                <>
                  <Skeleton class="mt-5 h-4 w-36" />
                  <Skeleton class="mt-2 h-12 w-full" />
                  <Skeleton class="mt-5 h-4 w-28" />
                  <Skeleton class="mt-2 h-12 w-full" />
                </>
              )}
            </section>
          )}
        </For>
      </div>
      <div class="flex min-h-16 items-center justify-between border-t bg-popover px-4 py-2 sm:px-6">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-12 w-36" />
      </div>
    </div>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const query = useQueryResult(() => settingsQuery.store())
  const mutation = useMutation(() => settingsMutation.updateStore())
  const settings = () => query.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () => query.data?.match({ ok: () => undefined, err: error => error })

  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    toast.success('Дэлгүүрийн тохиргоо хадгалагдлаа.')
  }

  return (
    <section class="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-7">
      <PageHeader
        description="Шинэ захиалгад ашиглах хүргэлтийн үнэ болон банкны дансыг удирдана."
        title="Дэлгүүрийн тохиргоо"
        titleId="store-settings-title"
      />

      <Switch>
        <Match when={query.isPending}>
          <SettingsFormSkeleton />
        </Match>
        <Match when={query.isError}>
          <div class="mt-4">
            <RetryState
              message="Интернэт холболтоо шалгаад дэлгүүрийн тохиргоог дахин ачаална уу."
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
                    ? 'Дэлгүүрийн тохиргоог эхлүүлэх шаардлагатай'
                    : 'Дэлгүүрийн тохиргоо авах боломжгүй байна'
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
