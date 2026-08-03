import type { AdminCatalogError } from '@store-kit/contracts/admin-catalog'
import { Button } from '@store-kit/ui'
import type { Result } from 'better-result'
import { Show } from 'solid-js'

import { InlineAlert } from '../components/foundation'

export const validationMessages = (errors: readonly unknown[]) =>
  errors.map(error => ({
    message:
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Зөв утга оруулна уу.',
  }))

export const transportMessage = (_error: unknown) =>
  'Хүсэлтийг илгээж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.'

export function mutationFailure<Value>(mutation: {
  data: Result<Value, AdminCatalogError> | undefined
}) {
  return mutation.data?.isErr() ? mutation.data.error : undefined
}

export const mutationTransportError = (mutation: { error: unknown; isError: boolean }) =>
  mutation.isError ? transportMessage(mutation.error) : undefined

type CatalogFailureProps = {
  failure: AdminCatalogError | undefined
  transportError: string | undefined
  onReload?: () => void
  title?: string
}

export function CatalogFailure(props: CatalogFailureProps) {
  const message = () => props.failure?.message ?? props.transportError
  const conflict = () => props.failure?._tag === 'AdminCatalogConflict'

  return (
    <Show when={message()}>
      {text => (
        <InlineAlert
          action={
            <Show when={conflict() && props.onReload}>
              <Button
                class="min-h-11 md:min-h-8"
                onClick={() => props.onReload?.()}
                type="button"
                variant="outline"
              >
                Одоогийн мэдээллийг дахин ачаалах
              </Button>
            </Show>
          }
          title={
            conflict()
              ? 'Барааны мэдээлэл өөрчлөгдсөн байна'
              : (props.title ?? 'Өөрчлөлтийг хадгалж чадсангүй')
          }
          tone="destructive"
        >
          {text()}
          <Show when={conflict()}>
            <span class="mt-1 block">Дахин ачаалбал таны хадгалаагүй өөрчлөлт арилна.</span>
          </Show>
        </InlineAlert>
      )}
    </Show>
  )
}
