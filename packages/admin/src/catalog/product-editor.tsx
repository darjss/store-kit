import { adminProductUpdateSchema } from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogProductDetail,
  AdminCatalogSelectors,
  AdminProductUpdate,
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
  Spinner,
  Textarea,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Show, createEffect, on, onCleanup } from 'solid-js'
import type { JSX } from 'solid-js'
import { toast } from 'solid-sonner'

import { AdminSwitch } from '../components/foundation'
import { updateCatalogProductCache } from './cache'
import {
  CatalogFailure,
  mutationFailure,
  mutationTransportError,
  validationMessages,
} from './errors'
import type { CatalogRequests } from './query-options'
import { catalogMutation } from './query-options'

const productValues = (product: AdminCatalogProductDetail): AdminProductUpdate => ({
  expectedUpdatedAt: product.updatedAt,
  name: product.name,
  slug: product.slug,
  shortDescription: product.shortDescription,
  description: product.description,
  status: product.status === 'active' ? 'active' : 'draft',
  featured: product.featured,
  brandId: product.brand?.id ?? null,
  categoryId: product.category?.id ?? null,
})

const sameEditableProduct = (left: AdminProductUpdate, right: AdminProductUpdate) =>
  left.name === right.name &&
  left.slug === right.slug &&
  left.shortDescription === right.shortDescription &&
  left.description === right.description &&
  left.status === right.status &&
  left.featured === right.featured &&
  left.brandId === right.brandId &&
  left.categoryId === right.categoryId

type ProductEditorProps = {
  product: AdminCatalogProductDetail
  selectors: AdminCatalogSelectors
  mainAfter: JSX.Element
  lifecycleBlocked: boolean
  railAfter: (dirty: boolean) => JSX.Element
  requests: CatalogRequests
  onDirtyChange: (dirty: boolean) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function ProductEditor(props: ProductEditorProps) {
  const queryClient = useQueryClient()
  const updateMutation = useMutation(() => catalogMutation.updateProduct(props.requests))
  let baseline = productValues(props.product)
  const form = createForm(() => ({
    defaultValues: baseline,
    validators: {
      onBlur: toStandardSchema(adminProductUpdateSchema),
      onSubmit: toStandardSchema(adminProductUpdateSchema),
    },
    onSubmit: async ({ value }) => {
      updateMutation.reset()
      const result = await updateMutation
        .mutateAsync({ productId: props.product.id, input: value })
        .catch(() => undefined)
      if (!result?.isOk()) return

      baseline = productValues(result.value)
      form.reset(baseline)
      await updateCatalogProductCache(queryClient, result.value)
      toast.success('Барааны өөрчлөлтийг хадгаллаа.')
    },
  }))
  const dirty = form.useSelector(state => state.isDirty)

  createEffect(() => props.onDirtyChange(dirty()))
  onCleanup(() => props.onDirtyChange(false))

  createEffect(
    on(
      () => props.product,
      product => {
        const current = productValues(product)
        if (!dirty()) {
          baseline = current
          form.reset(current)
          return
        }
        if (!sameEditableProduct(current, baseline)) return
        baseline = current
        form.setFieldValue('expectedUpdatedAt', current.expectedUpdatedAt, {
          dontUpdateMeta: true,
          dontValidate: true,
        })
      },
      { defer: true },
    ),
  )

  const reload = async () => {
    const product = await props.onReload()
    if (!product) return
    updateMutation.reset()
    baseline = productValues(product)
    form.reset(baseline)
  }

  return (
    <form
      aria-label="Бараа засах"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-7">
        <section
          aria-labelledby="product-fields-title"
          class="min-w-0 border-b pb-6 lg:col-start-1"
        >
          <div class="mb-4">
            <h2 class="text-base font-semibold" id="product-fields-title">
              Барааны мэдээлэл
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Худалдан авагчид харагдах нэр, тайлбарыг энд засна.
            </p>
          </div>
          <div class="grid gap-5">
            <form.Field name="name">
              {field => (
                <Field>
                  <FieldLabel for={`${props.product.id}-name`}>Барааны нэр</FieldLabel>
                  <Input
                    class="min-h-12! text-base! md:h-8! md:text-sm!"
                    id={`${props.product.id}-name`}
                    value={field().state.value}
                    aria-invalid={!field().state.meta.isValid}
                    onBlur={() => field().handleBlur()}
                    onInput={event => field().handleChange(event.currentTarget.value)}
                  />
                  <FieldError errors={validationMessages(field().state.meta.errors)} />
                </Field>
              )}
            </form.Field>

            <details class="group border-y py-1">
              <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Тайлбар ба холбоос
                <span aria-hidden="true" class="text-muted-foreground group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div class="grid gap-5 pb-4">
                <form.Field name="slug">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-slug`}>Үүсгэсэн холбоос</FieldLabel>
                      <Input
                        class="min-h-12! font-mono text-base! md:h-8! md:text-sm!"
                        id={`${props.product.id}-slug`}
                        value={field().state.value}
                        aria-invalid={!field().state.meta.isValid}
                        onBlur={() => field().handleBlur()}
                        onInput={event => field().handleChange(event.currentTarget.value)}
                      />
                      <FieldDescription>Жижиг латин үсэг, тоо, зураас ашиглана.</FieldDescription>
                      <FieldError errors={validationMessages(field().state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="shortDescription">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-short-description`}>
                        Товч тайлбар
                      </FieldLabel>
                      <Textarea
                        class="min-h-24 resize-y text-base! md:text-sm!"
                        id={`${props.product.id}-short-description`}
                        placeholder="Жагсаалтад харагдах товч тайлбар"
                        value={field().state.value ?? ''}
                        aria-invalid={!field().state.meta.isValid}
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
                    <Field>
                      <FieldLabel for={`${props.product.id}-description`}>
                        Дэлгэрэнгүй тайлбар
                      </FieldLabel>
                      <Textarea
                        class="min-h-40 resize-y text-base! md:text-sm!"
                        id={`${props.product.id}-description`}
                        placeholder="Барааны онцлог, хэрэглээний мэдээлэл"
                        value={field().state.value ?? ''}
                        aria-invalid={!field().state.meta.isValid}
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
              </div>
            </details>
          </div>
        </section>

        <aside class="min-w-0 border-b pb-1 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-b-0 lg:border-l lg:pl-6">
          <div class="space-y-5 lg:sticky lg:top-16">
            <section aria-labelledby="publishing-title" class="border-b pb-5">
              <h2 class="mb-3 text-base font-semibold" id="publishing-title">
                Төлөв ба ангилал
              </h2>
              <div class="space-y-5">
                <form.Field name="status">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-status`}>Нийтлэх төлөв</FieldLabel>
                      <NativeSelect
                        class="min-h-12! w-full text-base! md:h-8! md:text-sm!"
                        id={`${props.product.id}-status`}
                        value={field().state.value}
                        aria-invalid={!field().state.meta.isValid}
                        onBlur={() => field().handleBlur()}
                        onChange={event =>
                          field().handleChange(
                            event.currentTarget.value === 'active' ? 'active' : 'draft',
                          )
                        }
                      >
                        <NativeSelectOption value="draft">Ноорог</NativeSelectOption>
                        <NativeSelectOption value="active">Идэвхтэй</NativeSelectOption>
                      </NativeSelect>
                      <FieldError errors={validationMessages(field().state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="categoryId">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-category`}>Ангилал</FieldLabel>
                      <NativeSelect
                        class="min-h-12! w-full text-base! md:h-8! md:text-sm!"
                        id={`${props.product.id}-category`}
                        value={field().state.value ?? ''}
                        onBlur={() => field().handleBlur()}
                        onChange={event => field().handleChange(event.currentTarget.value || null)}
                      >
                        <NativeSelectOption value="">Ангилалгүй</NativeSelectOption>
                        <For each={props.selectors.categories}>
                          {category => (
                            <NativeSelectOption value={category.id}>
                              {category.name}
                              {category.active ? '' : ' (идэвхгүй)'}
                            </NativeSelectOption>
                          )}
                        </For>
                      </NativeSelect>
                      <FieldError errors={validationMessages(field().state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
              </div>
            </section>

            <details class="group border-b pb-2">
              <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Нэмэлт тохиргоо
                <span aria-hidden="true" class="text-muted-foreground group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div class="space-y-5 pb-3">
                <form.Field name="brandId">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-brand`}>Брэнд</FieldLabel>
                      <NativeSelect
                        class="min-h-12! w-full text-base! md:h-8! md:text-sm!"
                        id={`${props.product.id}-brand`}
                        value={field().state.value ?? ''}
                        onBlur={() => field().handleBlur()}
                        onChange={event => field().handleChange(event.currentTarget.value || null)}
                      >
                        <NativeSelectOption value="">Брэндгүй</NativeSelectOption>
                        <For each={props.selectors.brands}>
                          {brand => (
                            <NativeSelectOption value={brand.id}>{brand.name}</NativeSelectOption>
                          )}
                        </For>
                      </NativeSelect>
                      <FieldError errors={validationMessages(field().state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="featured">
                  {field => (
                    <Field>
                      <div class="flex min-h-12 items-center justify-between gap-3 border-y py-2">
                        <div>
                          <FieldLabel for={`${props.product.id}-featured`}>Онцлох бараа</FieldLabel>
                          <FieldDescription>Онцлох хэсэгт харуулна.</FieldDescription>
                        </div>
                        <AdminSwitch
                          checked={field().state.value}
                          id={`${props.product.id}-featured`}
                          onChange={checked => field().handleChange(checked)}
                        />
                      </div>
                    </Field>
                  )}
                </form.Field>
              </div>
            </details>

            <CatalogFailure
              failure={mutationFailure(updateMutation)}
              onReload={() => void reload()}
              transportError={mutationTransportError(updateMutation)}
            />

            <form.Subscribe
              selector={state => ({
                canSubmit: state.canSubmit,
                dirty: state.isDirty,
                pending: state.isSubmitting,
              })}
            >
              {state => (
                <div class="border-b pb-5">
                  <div class="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span class="text-muted-foreground">Хадгалалт</span>
                    <span
                      class={
                        state().dirty
                          ? 'text-(--admin-warning-foreground)'
                          : 'text-muted-foreground'
                      }
                    >
                      {state().pending
                        ? 'Хадгалж байна…'
                        : state().dirty
                          ? 'Хадгалаагүй өөрчлөлттэй'
                          : 'Хадгалсан'}
                    </span>
                  </div>
                  <Button
                    class="min-h-12! w-full md:h-9!"
                    disabled={!state().canSubmit || !state().dirty || state().pending}
                    type="submit"
                  >
                    <Show when={state().pending}>
                      <Spinner aria-hidden="true" />
                    </Show>
                    {state().pending ? 'Хадгалж байна…' : 'Өөрчлөлт хадгалах'}
                  </Button>
                </div>
              )}
            </form.Subscribe>

            <form.Subscribe selector={state => state.isDirty}>
              {dirty => props.railAfter(dirty() || props.lifecycleBlocked)}
            </form.Subscribe>
          </div>
        </aside>

        <div class="min-w-0 lg:col-start-1">{props.mainAfter}</div>
      </div>
    </form>
  )
}
