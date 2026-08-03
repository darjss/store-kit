import { adminProductCreateSchema } from '@store-kit/contracts/admin-catalog'
import type { AdminCatalogSelectors, AdminProductCreate } from '@store-kit/contracts/admin-catalog'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Spinner,
  Textarea,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Show } from 'solid-js'
import { toast } from 'solid-sonner'

import { AdminSwitch } from '../components/foundation'
import { UnsavedChangesGuard } from '../components/unsaved-changes'
import { updateCatalogProductCache } from './cache'
import { CreateProductImage, createProductImageForm } from './create-image'
import { InitialVariantDetails, InitialVariantEssentials } from './create-initial-variant'
import {
  CatalogFailure,
  mutationFailure,
  mutationTransportError,
  validationMessages,
} from './errors'
import { catalogMutation } from './query-options'

const nameHash = (name: string) => {
  let hash = 2_166_136_261
  for (const character of name) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(36)
}

const slugFromName = (name: string) => {
  const ascii = name
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 150)
  return ascii || `baraa-${nameHash(name.trim() || 'baraa')}`
}

const skuFromName = (name: string) => {
  const readable = slugFromName(name).replaceAll('-', '').slice(0, 12).toUpperCase()
  return `SKU-${readable}`
}

const defaultValues: AdminProductCreate = {
  name: '',
  slug: slugFromName(''),
  shortDescription: null,
  description: null,
  status: 'draft',
  featured: false,
  brandId: null,
  categoryId: null,
  initialVariant: {
    sku: skuFromName(''),
    name: 'Үндсэн',
    options: {},
    priceMnt: 0,
    compareAtPriceMnt: null,
    stockQuantity: 0,
    sortOrder: 0,
  },
}

export const createProductFormState = (onSubmit: (value: AdminProductCreate) => Promise<void>) =>
  createForm(() => ({
    defaultValues,
    validators: {
      onBlur: toStandardSchema(adminProductCreateSchema),
      onSubmit: toStandardSchema(adminProductCreateSchema),
    },
    onSubmit: ({ value }) => onSubmit(value),
  }))

export type ProductCreateForm = ReturnType<typeof createProductFormState>

type CreateProductFormProps = {
  selectors: AdminCatalogSelectors
  onCreated: (productId: string) => void
}

export function CreateProductForm(props: CreateProductFormProps) {
  const queryClient = useQueryClient()
  const createMutation = useMutation(() => catalogMutation.createProduct())
  const uploadMutation = useMutation(() => catalogMutation.uploadImage())
  const imageForm = createProductImageForm()
  const form = createProductFormState(async value => {
    createMutation.reset()
    const result = await createMutation.mutateAsync(value).catch(() => undefined)
    if (!result?.isOk()) return

    let product = result.value
    const image = imageForm.state.values
    if (image.file) {
      uploadMutation.reset()
      const uploadResult = await uploadMutation
        .mutateAsync({
          productId: product.id,
          input: {
            file: image.file,
            alt: image.alt.trim() || value.name,
            variantIds: [],
            expectedUpdatedAt: product.updatedAt,
          },
        })
        .catch(() => undefined)
      if (uploadResult?.isOk()) product = uploadResult.value
      else
        toast.warning(
          'Барааг хадгалсан ч зургийг оруулж чадсангүй. Засах хэсгээс дахин оруулна уу.',
        )
    }

    await updateCatalogProductCache(queryClient, product)
    toast.success('Бараа үүслээ.')
    props.onCreated(product.id)
  })
  const formDirty = form.useSelector(state => state.isDirty)
  const imageDirty = imageForm.useSelector(state => state.isDirty)

  return (
    <form
      aria-label="Шинэ бараа үүсгэх"
      class="pb-40 lg:pb-0"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <UnsavedChangesGuard
        isDirty={() => (formDirty() || imageDirty()) && !createMutation.data?.isOk()}
      />

      <section aria-labelledby="new-product-essential-title" class="border-b pb-6">
        <div class="mb-5">
          <h2 class="text-base font-semibold" id="new-product-essential-title">
            Үндсэн мэдээлэл
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Барааг ноорог төлөвөөр хадгална. Дараа нь хүссэн үедээ нийтэлж болно.
          </p>
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <CreateProductImage form={imageForm} />

          <form.Field name="name">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-name">Барааны нэр</FieldLabel>
                <Input
                  autofocus
                  class="min-h-12! text-base!"
                  id="new-product-name"
                  placeholder="Жишээ: Монгол арьсан цүнх"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => {
                    const name = event.currentTarget.value
                    field().handleChange(name)
                    if (!form.getFieldMeta('slug')?.isTouched)
                      form.setFieldValue('slug', slugFromName(name), {
                        dontUpdateMeta: true,
                        dontValidate: true,
                      })
                    if (!form.getFieldMeta('initialVariant.sku')?.isTouched)
                      form.setFieldValue('initialVariant.sku', skuFromName(name), {
                        dontUpdateMeta: true,
                        dontValidate: true,
                      })
                  }}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>

          <InitialVariantEssentials form={form} />

          <form.Field name="categoryId">
            {field => (
              <Field>
                <FieldLabel for="new-product-category">Ангилал</FieldLabel>
                <NativeSelect
                  class="min-h-12! w-full text-base!"
                  id="new-product-category"
                  value={field().state.value ?? ''}
                  onChange={event => field().handleChange(event.currentTarget.value || null)}
                >
                  <NativeSelectOption value="">Ангилалгүй</NativeSelectOption>
                  <For each={props.selectors.categories.filter(category => category.active)}>
                    {category => (
                      <NativeSelectOption value={category.id}>{category.name}</NativeSelectOption>
                    )}
                  </For>
                </NativeSelect>
              </Field>
            )}
          </form.Field>
        </div>
      </section>

      <div class="my-5 hidden items-center gap-3 border-y bg-background py-3 lg:flex">
        <p class="mr-auto text-sm text-muted-foreground">
          {formDirty() || imageDirty() ? 'Хадгалаагүй өөрчлөлттэй' : 'Мэдээллээ оруулна уу'}
        </p>
        <form.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button
              class="min-h-12! min-w-36 px-5! md:h-9!"
              disabled={!state().canSubmit || state().pending}
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending
                ? uploadMutation.isPending
                  ? 'Зураг оруулж байна…'
                  : 'Хадгалж байна…'
                : 'Бараа үүсгэх'}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <details class="group border-b py-2">
        <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Дэлгэрэнгүй мэдээлэл
          <span aria-hidden="true" class="text-muted-foreground group-open:rotate-180">
            ▾
          </span>
        </summary>
        <p class="mb-5 text-sm text-muted-foreground">
          Дэлгүүрт харагдах тайлбар, холбоос, брэнд болон онцлох тохиргоо.
        </p>
        <div class="grid gap-5 pb-5 sm:grid-cols-2">
          <form.Field name="slug">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-slug">Үүсгэсэн холбоос</FieldLabel>
                <Input
                  class="min-h-12! font-mono text-base!"
                  id="new-product-slug"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldDescription>Нэрээс автоматаар үүснэ.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="brandId">
            {field => (
              <Field>
                <FieldLabel for="new-product-brand">Брэнд</FieldLabel>
                <NativeSelect
                  class="min-h-12! w-full text-base!"
                  id="new-product-brand"
                  value={field().state.value ?? ''}
                  onChange={event => field().handleChange(event.currentTarget.value || null)}
                >
                  <NativeSelectOption value="">Брэндгүй</NativeSelectOption>
                  <For each={props.selectors.brands}>
                    {brand => (
                      <NativeSelectOption value={brand.id}>{brand.name}</NativeSelectOption>
                    )}
                  </For>
                </NativeSelect>
              </Field>
            )}
          </form.Field>
          <form.Field name="status">
            {field => (
              <Field>
                <FieldLabel for="new-product-status">Нийтлэх төлөв</FieldLabel>
                <NativeSelect
                  class="min-h-12! w-full text-base!"
                  id="new-product-status"
                  value={field().state.value}
                  onChange={event =>
                    field().handleChange(
                      event.currentTarget.value === 'active' ? 'active' : 'draft',
                    )
                  }
                >
                  <NativeSelectOption value="draft">Ноорог</NativeSelectOption>
                  <NativeSelectOption value="active">Идэвхтэй</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
          </form.Field>
          <form.Field name="shortDescription">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-short-description">Товч тайлбар</FieldLabel>
                <Textarea
                  class="min-h-24 resize-y text-base!"
                  id="new-product-short-description"
                  placeholder="Жагсаалтад харагдах товч тайлбар"
                  value={field().state.value ?? ''}
                  onBlur={() => field().handleBlur()}
                  onInput={event =>
                    field().handleChange(
                      event.currentTarget.value.trim() ? event.currentTarget.value : null,
                    )
                  }
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="description">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-description">Дэлгэрэнгүй тайлбар</FieldLabel>
                <Textarea
                  class="min-h-36 resize-y text-base!"
                  id="new-product-description"
                  placeholder="Барааны онцлог, хэрэглээний мэдээлэл"
                  value={field().state.value ?? ''}
                  onBlur={() => field().handleBlur()}
                  onInput={event =>
                    field().handleChange(
                      event.currentTarget.value.trim() ? event.currentTarget.value : null,
                    )
                  }
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="featured">
            {field => (
              <Field class="sm:col-span-2">
                <div class="flex min-h-12 items-center justify-between gap-3 border-y py-2">
                  <div>
                    <FieldLabel for="new-product-featured">Онцлох бараа</FieldLabel>
                    <FieldDescription>Дэлгүүрийн онцлох хэсэгт харуулна.</FieldDescription>
                  </div>
                  <AdminSwitch
                    checked={field().state.value}
                    id="new-product-featured"
                    onChange={checked => field().handleChange(checked)}
                  />
                </div>
              </Field>
            )}
          </form.Field>
        </div>
      </details>

      <details class="group border-b py-2">
        <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Үнэ ба хувилбарын нэмэлт тохиргоо
          <span aria-hidden="true" class="text-muted-foreground group-open:rotate-180">
            ▾
          </span>
        </summary>
        <p class="mb-5 text-sm text-muted-foreground">
          Хямдралын өмнөх үнэ, сонголт, харагдах дарааллыг шаардлагатай үед тохируулна.
        </p>
        <div class="grid gap-5 pb-5 sm:grid-cols-2">
          <InitialVariantDetails form={form} />
        </div>
      </details>

      <div class="mt-5">
        <CatalogFailure
          failure={mutationFailure(createMutation)}
          title="Барааг үүсгэж чадсангүй"
          transportError={mutationTransportError(createMutation)}
        />
      </div>

      <div
        class="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t bg-popover px-4 py-2 lg:hidden"
        data-mobile-create-action
      >
        <form.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button
              class="min-h-12! w-full"
              disabled={!state().canSubmit || state().pending}
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending
                ? uploadMutation.isPending
                  ? 'Зураг оруулж байна…'
                  : 'Хадгалж байна…'
                : 'Бараа үүсгэх'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
