import { GalleryAdd } from '@solar-icons/solid/Linear'
import type { AdminCatalogProductDetail } from '@store-kit/contracts/admin-catalog'
import {
  Button,
  Checkbox,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Spinner,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Show, createEffect, onCleanup } from 'solid-js'
import { toast } from 'solid-sonner'

import { updateCatalogProductCache } from './cache'
import { CatalogFailure, mutationFailure, mutationTransportError } from './errors'
import { ImageFilePicker } from './image-file-picker'
import { catalogMutation } from './query-options'

type GalleryUploadProps = {
  product: AdminCatalogProductDetail
  onDirtyChange: (dirty: boolean) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function GalleryUpload(props: GalleryUploadProps) {
  const queryClient = useQueryClient()
  const uploadMutation = useMutation(() => catalogMutation.uploadImage())
  let fileInput: HTMLInputElement | undefined
  const form = createForm(() => ({
    defaultValues: {
      file: undefined as File | undefined,
      alt: '',
      variantIds: [] as string[],
      expectedUpdatedAt: props.product.updatedAt,
    },
    onSubmit: async ({ value }) => {
      if (!value.file || !value.alt.trim()) return
      uploadMutation.reset()
      const result = await uploadMutation
        .mutateAsync({
          productId: props.product.id,
          input: {
            file: value.file,
            alt: value.alt.trim(),
            variantIds: value.variantIds,
            expectedUpdatedAt: value.expectedUpdatedAt,
          },
        })
        .catch(() => undefined)
      if (!result?.isOk()) return

      await updateCatalogProductCache(queryClient, result.value)
      form.reset({
        file: undefined,
        alt: '',
        variantIds: [],
        expectedUpdatedAt: result.value.updatedAt,
      })
      if (fileInput) fileInput.value = ''
      toast.success('Барааны зураг орлоо.')
    },
  }))
  const dirty = form.useSelector(state => state.isDirty)

  createEffect(() => props.onDirtyChange(dirty()))
  onCleanup(() => props.onDirtyChange(false))

  const reload = async () => {
    const product = await props.onReload()
    if (!product) return
    uploadMutation.reset()
    form.reset({
      file: undefined,
      alt: '',
      variantIds: [],
      expectedUpdatedAt: product.updatedAt,
    })
    if (fileInput) fileInput.value = ''
  }

  return (
    <form
      aria-label="Барааны зураг оруулах"
      class="mt-4 grid gap-3 border-y bg-card px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)_auto] md:items-end"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="file">
        {field => (
          <Field>
            <FieldLabel for="catalog-image-file">Зургийн файл</FieldLabel>
            <ImageFilePicker
              file={field().state.value}
              id="catalog-image-file"
              inputRef={element => {
                fileInput = element
              }}
              onChange={field().handleChange}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name="alt">
        {field => (
          <Field>
            <FieldLabel for="catalog-image-alt">Зургийн тайлбар</FieldLabel>
            <Input
              class="min-h-12! text-base! md:h-8! md:text-sm!"
              id="catalog-image-alt"
              maxlength="300"
              placeholder="Зураг дээрх барааг товч тайлбарлана уу"
              value={field().state.value}
              onInput={event => field().handleChange(event.currentTarget.value)}
            />
          </Field>
        )}
      </form.Field>
      <div class="flex gap-1.5">
        <form.Subscribe selector={state => state.values}>
          {values => (
            <Button
              class="min-h-11! md:h-8!"
              disabled={uploadMutation.isPending || !values().file || !values().alt.trim()}
              type="submit"
            >
              <Show
                when={uploadMutation.isPending}
                fallback={
                  <>
                    <GalleryAdd aria-hidden="true" />
                    Зураг оруулах
                  </>
                }
              >
                <Spinner aria-hidden="true" />
                Оруулж байна…
              </Show>
            </Button>
          )}
        </form.Subscribe>
        <Show when={dirty()}>
          <Button
            class="min-h-11! md:h-8!"
            onClick={() => {
              form.reset()
              if (fileInput) fileInput.value = ''
            }}
            type="button"
            variant="ghost"
          >
            Цэвэрлэх
          </Button>
        </Show>
      </div>
      <Show when={props.product.variants.length > 0}>
        <form.Field name="variantIds">
          {field => (
            <div class="md:col-span-3">
              <FieldLabel>Хувилбарт холбох</FieldLabel>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                <For each={props.product.variants}>
                  {variant => (
                    <Checkbox
                      checked={field().state.value.includes(variant.id)}
                      onChange={checked =>
                        field().handleChange(
                          checked
                            ? [...new Set([...field().state.value, variant.id])]
                            : field().state.value.filter(id => id !== variant.id),
                        )
                      }
                    >
                      {variant.name}
                    </Checkbox>
                  )}
                </For>
              </div>
              <FieldDescription class="mt-1">
                Сонгохгүй бол зураг бүх хувилбарт харагдана.
              </FieldDescription>
            </div>
          )}
        </form.Field>
      </Show>
      <Show when={uploadMutation.isError || uploadMutation.data?.isErr()}>
        <div class="md:col-span-3">
          <CatalogFailure
            failure={mutationFailure(uploadMutation)}
            onReload={() => void reload()}
            title="Зургийг оруулж чадсангүй"
            transportError={mutationTransportError(uploadMutation)}
          />
        </div>
      </Show>
    </form>
  )
}
