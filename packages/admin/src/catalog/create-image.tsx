import { Field, FieldDescription, FieldLabel, Input } from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { Show, createSignal, onCleanup } from 'solid-js'

import { ImageFilePicker } from './image-file-picker'

export const createProductImageForm = () =>
  createForm(() => ({
    defaultValues: {
      file: undefined as File | undefined,
      alt: '',
    },
  }))

type ProductImageForm = ReturnType<typeof createProductImageForm>

export function CreateProductImage(props: { form: ProductImageForm }) {
  const [preview, setPreview] = createSignal<string>()

  const selectFile = (file: File | undefined) => {
    const currentPreview = preview()
    if (currentPreview) URL.revokeObjectURL(currentPreview)
    setPreview(file ? URL.createObjectURL(file) : undefined)
  }
  onCleanup(() => {
    const currentPreview = preview()
    if (currentPreview) URL.revokeObjectURL(currentPreview)
  })

  return (
    <>
      <props.form.Field name="file">
        {field => (
          <Field class="sm:col-span-2">
            <FieldLabel for="new-product-image">Барааны зураг</FieldLabel>
            <ImageFilePicker
              file={field().state.value}
              id="new-product-image"
              onChange={file => {
                field().handleChange(file)
                selectFile(file)
              }}
            />
            <FieldDescription>
              JPEG, PNG, WebP эсвэл AVIF. 10 MiB хүртэл. Зургийг бараатай хамт оруулна.
            </FieldDescription>
          </Field>
        )}
      </props.form.Field>
      <Show when={preview()}>
        {objectUrl => (
          <figure class="sm:col-span-2">
            <img
              alt={
                props.form.state.values.alt.trim() || 'Сонгосон барааны зургийн урьдчилсан харагдац'
              }
              class="aspect-square size-32 rounded-md bg-muted object-cover"
              data-product-image-preview
              src={objectUrl()}
            />
            <figcaption class="mt-2 text-sm text-muted-foreground">
              Хадгалахаас өмнөх харагдац
            </figcaption>
          </figure>
        )}
      </Show>
      <Show when={preview()}>
        <props.form.Field name="alt">
          {field => (
            <Field class="sm:col-span-2">
              <FieldLabel for="new-product-image-alt">Зургийн тайлбар</FieldLabel>
              <Input
                class="min-h-12! text-base!"
                id="new-product-image-alt"
                maxlength="300"
                placeholder="Хоосон орхивол барааны нэрийг ашиглана"
                value={field().state.value}
                onInput={event => field().handleChange(event.currentTarget.value)}
              />
            </Field>
          )}
        </props.form.Field>
      </Show>
    </>
  )
}
