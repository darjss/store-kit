import { ArrowLeft } from '@solar-icons/solid/Linear'
import { adminProductCreateSchema } from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
  AdminCatalogSelectors,
  AdminProductCreate,
} from '@store-kit/contracts/admin-catalog'
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
  Skeleton,
  Spinner,
  Switch,
  Textarea,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Show, createSignal } from 'solid-js'
import { toast } from 'solid-sonner'

import { InlineAlert, PageHeader, RetryState } from '../components/foundation'
import { UnsavedChangesGuard } from '../components/unsaved-changes'
import { useQueryResult } from '../query-options/result'
import { CatalogFailure, OptionRows, transportMessage, validationMessages } from './forms'
import type { CatalogRequests } from './query-options'
import { catalogKeys, catalogMutation, catalogQuery } from './query-options'

const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/avif'

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

type CatalogCreatePageProps = {
  requests: CatalogRequests
  onBack: () => void
  onCreated: (productId: string) => void
}

export function CatalogCreatePage(props: CatalogCreatePageProps) {
  const selectorsQuery = useQueryResult(() => catalogQuery.selectors(props.requests))
  const selectors = () => selectorsQuery.data?.match({ ok: value => value, err: () => undefined })
  const expectedError = () =>
    selectorsQuery.data?.match<AdminCatalogError | undefined>({
      ok: () => undefined,
      err: error => error,
    })

  return (
    <section class="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-7">
      <div class="mb-3">
        <Button
          class="min-h-11! px-2! md:h-8!"
          onClick={() => props.onBack()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" />
          Барааны жагсаалт руу буцах
        </Button>
      </div>
      <PageHeader
        description="Эхлээд худалдахад хэрэгтэй үндсэн мэдээллээ оруулна уу."
        title="Шинэ бараа"
        titleId="new-product-title"
      />

      <div class="mt-5">
        <Show
          when={!selectorsQuery.isPending}
          fallback={
            <div aria-busy="true" class="space-y-5" role="status">
              <span class="sr-only">Барааны маягтыг ачаалж байна…</span>
              <Skeleton class="h-12 w-full" />
              <Skeleton class="h-40 w-full" />
              <Skeleton class="h-40 w-full" />
            </div>
          }
        >
          <Show
            when={!selectorsQuery.isError}
            fallback={
              <RetryState
                message="Брэнд, ангиллын сонголтыг ачаалж чадсангүй."
                onRetry={() => void selectorsQuery.refetch()}
                pending={selectorsQuery.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Маягт нээгдсэнгүй" tone="destructive">
                  {expectedError()?.message ?? 'Сонголтуудыг ачаалж чадсангүй.'}
                </InlineAlert>
              }
            >
              <Show when={selectors()} keyed>
                {value => (
                  <CreateProductForm
                    onCreated={productId => props.onCreated(productId)}
                    requests={props.requests}
                    selectors={value}
                  />
                )}
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  )
}

type CreateProductFormProps = {
  requests: CatalogRequests
  selectors: AdminCatalogSelectors
  onCreated: (productId: string) => void
}

function CreateProductForm(props: CreateProductFormProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation(() => catalogMutation.createProduct(props.requests))
  const uploadMutation = useMutation(() => catalogMutation.uploadImage(props.requests))
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  const [slugEdited, setSlugEdited] = createSignal(false)
  const [skuEdited, setSkuEdited] = createSignal(false)
  const [created, setCreated] = createSignal(false)
  const [image, setImage] = createSignal<File>()
  const [imageAlt, setImageAlt] = createSignal('')
  const form = createForm(() => ({
    defaultValues,
    validators: {
      onBlur: toStandardSchema(adminProductCreateSchema),
      onSubmit: toStandardSchema(adminProductCreateSchema),
    },
    onSubmit: async ({ value }) => {
      setFailure()
      setRequestError()
      try {
        const result = await mutation.mutateAsync(value)
        if (result.isErr()) {
          setFailure(result.error)
          return
        }

        setCreated(true)
        let product = result.value
        const selectedImage = image()
        if (selectedImage) {
          try {
            const uploadResult = await uploadMutation.mutateAsync({
              productId: product.id,
              input: {
                file: selectedImage,
                alt: imageAlt().trim() || value.name,
                variantIds: [],
                expectedUpdatedAt: product.updatedAt,
              },
            })
            if (uploadResult.isOk()) product = uploadResult.value
            else
              toast.warning(
                'Барааг хадгалсан ч зургийг оруулж чадсангүй. Засах хэсгээс дахин оруулна уу.',
              )
          } catch {
            toast.warning(
              'Барааг хадгалсан ч зургийг оруулж чадсангүй. Засах хэсгээс дахин оруулна уу.',
            )
          }
        }

        queryClient.setQueryData(
          catalogKeys.detail(product.id),
          result.map(() => product),
        )
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        ])
        toast.success('Бараа үүслээ.')
        props.onCreated(product.id)
      } catch (error) {
        setRequestError(transportMessage(error))
      }
    },
  }))

  return (
    <form
      aria-label="Шинэ бараа үүсгэх"
      class="pb-20"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <UnsavedChangesGuard isDirty={() => (form.state.isDirty || Boolean(image())) && !created()} />

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
          <Field class="sm:col-span-2">
            <FieldLabel for="new-product-image">Барааны зураг</FieldLabel>
            <Input
              accept={acceptedImageTypes}
              class="min-h-12! text-base!"
              id="new-product-image"
              type="file"
              onChange={event => setImage(event.currentTarget.files?.[0])}
            />
            <FieldDescription>
              JPEG, PNG, WebP эсвэл AVIF. 10 MiB хүртэл. Зургийг бараатай хамт оруулна.
            </FieldDescription>
          </Field>
          <Show when={image()}>
            <Field class="sm:col-span-2">
              <FieldLabel for="new-product-image-alt">Зургийн тайлбар</FieldLabel>
              <Input
                class="min-h-12! text-base!"
                id="new-product-image-alt"
                maxlength="300"
                placeholder="Хоосон орхивол барааны нэрийг ашиглана"
                value={imageAlt()}
                onInput={event => setImageAlt(event.currentTarget.value)}
              />
            </Field>
          </Show>

          <form.Field name="name">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-name">Барааны нэр</FieldLabel>
                <Input
                  autofocus
                  class="min-h-12! text-base!"
                  id="new-product-name"
                  placeholder="Жишээ: Tanchjim Bunny"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => {
                    const name = event.currentTarget.value
                    field().handleChange(name)
                    if (!slugEdited()) form.setFieldValue('slug', slugFromName(name))
                    if (!skuEdited()) form.setFieldValue('initialVariant.sku', skuFromName(name))
                  }}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>

          <form.Field name="initialVariant.priceMnt">
            {field => (
              <Field>
                <FieldLabel for="new-variant-price">Үнэ (₮)</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums"
                  id="new-variant-price"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  type="number"
                  value={Number.isNaN(field().state.value) ? '' : field().state.value}
                  onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="initialVariant.stockQuantity">
            {field => (
              <Field>
                <FieldLabel for="new-variant-stock">Эхний үлдэгдэл</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums"
                  id="new-variant-stock"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  type="number"
                  value={Number.isNaN(field().state.value) ? '' : field().state.value}
                  onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>

          <form.Field name="initialVariant.sku">
            {field => (
              <Field>
                <FieldLabel for="new-variant-sku">Барааны код</FieldLabel>
                <Input
                  class="min-h-12! font-mono text-base!"
                  id="new-variant-sku"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => {
                    setSkuEdited(true)
                    field().handleChange(event.currentTarget.value)
                  }}
                />
                <FieldDescription>
                  Нэрээс автоматаар үүснэ. Шаардлагатай бол засаж болно.
                </FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>

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

      <div class="my-5 flex items-center gap-3 border-y bg-background py-3">
        <form.Subscribe selector={state => state.isDirty}>
          {dirty => (
            <p class="mr-auto text-sm text-muted-foreground">
              {dirty() || image() ? 'Хадгалаагүй өөрчлөлттэй' : 'Мэдээллээ оруулна уу'}
            </p>
          )}
        </form.Subscribe>
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
                  onInput={event => {
                    setSlugEdited(true)
                    field().handleChange(event.currentTarget.value)
                  }}
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
                  <Switch
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
          <form.Field name="initialVariant.name">
            {field => (
              <Field>
                <FieldLabel for="new-variant-name">Хувилбарын нэр</FieldLabel>
                <Input
                  class="min-h-12! text-base!"
                  id="new-variant-name"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="initialVariant.compareAtPriceMnt">
            {field => (
              <Field>
                <FieldLabel for="new-variant-compare-price">Өмнөх үнэ (₮)</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums"
                  id="new-variant-compare-price"
                  inputmode="numeric"
                  min="0"
                  placeholder="Байхгүй"
                  step="1"
                  type="number"
                  value={field().state.value ?? ''}
                  onInput={event =>
                    field().handleChange(
                      event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber,
                    )
                  }
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="initialVariant.sortOrder">
            {field => (
              <Field>
                <FieldLabel for="new-variant-sort">Харагдах дараалал</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums"
                  id="new-variant-sort"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  type="number"
                  value={Number.isNaN(field().state.value) ? '' : field().state.value}
                  onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="initialVariant.options">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel>Сонголтууд</FieldLabel>
                <OptionRows
                  value={field().state.value}
                  onChange={value => field().handleChange(value)}
                />
                <FieldDescription>Жишээ: хэмжээ — M, өнгө — хар.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
        </div>
      </details>

      <div class="mt-5">
        <CatalogFailure
          failure={failure()}
          title="Барааг үүсгэж чадсангүй"
          transportError={requestError()}
        />
      </div>
    </form>
  )
}
