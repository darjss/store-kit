import { adminProductUpdateSchema } from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
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
  Switch,
  Textarea,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import type { Result } from 'better-result'
import { For, Show, createEffect, createSignal, on, onCleanup } from 'solid-js'
import type { JSX } from 'solid-js'

import { InlineAlert } from '../components/foundation'

export const validationMessages = (errors: readonly unknown[]) =>
  errors.map(error => ({
    message:
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Enter a valid value.',
  }))

export const transportMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The request failed. Check your connection and try again.'

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
              <Button onClick={() => props.onReload?.()} size="sm" type="button" variant="outline">
                Reload current record — local edits will be discarded
              </Button>
            </Show>
          }
          title={conflict() ? 'Catalog data changed' : (props.title ?? 'Could not save changes')}
          tone="destructive"
        >
          {text()}
        </InlineAlert>
      )}
    </Show>
  )
}

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
  onSave: (
    input: AdminProductUpdate,
  ) => Promise<Result<AdminCatalogProductDetail, AdminCatalogError>>
  onDirtyChange: (dirty: boolean) => void
  onProduct: (product: AdminCatalogProductDetail) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function ProductEditor(props: ProductEditorProps) {
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  let baseline = productValues(props.product)
  const form = createForm(() => ({
    defaultValues: baseline,
    validators: {
      onBlur: toStandardSchema(adminProductUpdateSchema),
      onSubmit: toStandardSchema(adminProductUpdateSchema),
    },
    onSubmit: async ({ value }) => {
      setFailure()
      setRequestError()
      try {
        const result = await props.onSave(value)
        result.match({
          ok: product => {
            baseline = productValues(product)
            form.reset(baseline)
            props.onProduct(product)
          },
          err: error => setFailure(error),
        })
      } catch (error) {
        setRequestError(transportMessage(error))
      }
    },
  }))

  createEffect(() => props.onDirtyChange(form.state.isDirty))
  onCleanup(() => props.onDirtyChange(false))

  createEffect(
    on(
      () => props.product,
      product => {
        const current = productValues(product)
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
    setFailure()
    setRequestError()
    baseline = productValues(product)
    form.reset(baseline)
  }

  return (
    <form
      aria-label="Product editor"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-7">
        <main class="min-w-0">
          <section aria-labelledby="product-fields-title" class="border-b pb-6">
            <div class="mb-4">
              <h2 class="text-sm font-semibold" id="product-fields-title">
                Product
              </h2>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Storefront identity and customer-facing product copy.
              </p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <form.Field name="name">
                {field => (
                  <Field>
                    <FieldLabel for={`${props.product.id}-name`}>Name</FieldLabel>
                    <Input
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
              <form.Field name="slug">
                {field => (
                  <Field>
                    <FieldLabel for={`${props.product.id}-slug`}>Slug</FieldLabel>
                    <Input
                      class="font-mono"
                      id={`${props.product.id}-slug`}
                      value={field().state.value}
                      aria-invalid={!field().state.meta.isValid}
                      onBlur={() => field().handleBlur()}
                      onInput={event => field().handleChange(event.currentTarget.value)}
                    />
                    <FieldDescription>Lowercase letters, numbers, and hyphens.</FieldDescription>
                    <FieldError errors={validationMessages(field().state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="shortDescription">
                {field => (
                  <Field class="sm:col-span-2">
                    <FieldLabel for={`${props.product.id}-short-description`}>
                      Short description
                    </FieldLabel>
                    <Textarea
                      class="min-h-20 resize-y"
                      id={`${props.product.id}-short-description`}
                      placeholder="A concise catalog summary"
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
                  <Field class="sm:col-span-2">
                    <FieldLabel for={`${props.product.id}-description`}>Description</FieldLabel>
                    <Textarea
                      class="min-h-40 resize-y"
                      id={`${props.product.id}-description`}
                      placeholder="Full product description"
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
          </section>
          {props.mainAfter}
        </main>

        <aside class="min-w-0 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div class="space-y-5 lg:sticky lg:top-16">
            <section aria-labelledby="publishing-title" class="border-b pb-5">
              <h2 class="mb-3 text-sm font-semibold" id="publishing-title">
                Publishing
              </h2>
              <div class="space-y-4">
                <form.Field name="status">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-status`}>Status</FieldLabel>
                      <NativeSelect
                        class="w-full"
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
                        <NativeSelectOption value="draft">Draft</NativeSelectOption>
                        <NativeSelectOption value="active">Active</NativeSelectOption>
                      </NativeSelect>
                      <FieldError errors={validationMessages(field().state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="featured">
                  {field => (
                    <Field>
                      <div class="flex min-h-8 items-center justify-between gap-3 border-y py-2">
                        <FieldLabel for={`${props.product.id}-featured`}>Featured</FieldLabel>
                        <Switch
                          checked={field().state.value}
                          id={`${props.product.id}-featured`}
                          onChange={checked => field().handleChange(checked)}
                        />
                      </div>
                      <FieldDescription>
                        Include in deliberate storefront merchandising.
                      </FieldDescription>
                    </Field>
                  )}
                </form.Field>
              </div>
            </section>

            <section aria-labelledby="organization-title" class="border-b pb-5">
              <h2 class="mb-3 text-sm font-semibold" id="organization-title">
                Organization
              </h2>
              <div class="space-y-4">
                <form.Field name="brandId">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-brand`}>Brand</FieldLabel>
                      <NativeSelect
                        class="w-full"
                        id={`${props.product.id}-brand`}
                        value={field().state.value ?? ''}
                        onBlur={() => field().handleBlur()}
                        onChange={event => field().handleChange(event.currentTarget.value || null)}
                      >
                        <NativeSelectOption value="">No brand</NativeSelectOption>
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
                <form.Field name="categoryId">
                  {field => (
                    <Field>
                      <FieldLabel for={`${props.product.id}-category`}>Category</FieldLabel>
                      <NativeSelect
                        class="w-full"
                        id={`${props.product.id}-category`}
                        value={field().state.value ?? ''}
                        onBlur={() => field().handleBlur()}
                        onChange={event => field().handleChange(event.currentTarget.value || null)}
                      >
                        <NativeSelectOption value="">No category</NativeSelectOption>
                        <For each={props.selectors.categories}>
                          {category => (
                            <NativeSelectOption value={category.id}>
                              {category.name}
                              {category.active ? '' : ' (inactive)'}
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

            <CatalogFailure
              failure={failure()}
              onReload={() => void reload()}
              transportError={requestError()}
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
                  <div class="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span class="text-muted-foreground">Save state</span>
                    <span
                      class={
                        state().dirty
                          ? 'text-(--admin-warning-foreground)'
                          : 'text-muted-foreground'
                      }
                    >
                      {state().pending ? 'Saving…' : state().dirty ? 'Unsaved changes' : 'Saved'}
                    </span>
                  </div>
                  <Button
                    class="w-full"
                    disabled={!state().canSubmit || !state().dirty || state().pending}
                    type="submit"
                  >
                    <Show when={state().pending}>
                      <Spinner aria-hidden="true" />
                    </Show>
                    {state().pending ? 'Saving product…' : 'Save product'}
                  </Button>
                </div>
              )}
            </form.Subscribe>

            <form.Subscribe selector={state => state.isDirty}>
              {dirty => props.railAfter(dirty() || props.lifecycleBlocked)}
            </form.Subscribe>
          </div>
        </aside>
      </div>
    </form>
  )
}

type OptionRowsProps = {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  disabled?: boolean
}

export function OptionRows(props: OptionRowsProps) {
  const entries = () => Object.entries(props.value)
  const [keyErrors, setKeyErrors] = createSignal<Record<string, string>>({})
  const addOption = () => {
    let index = 1
    let key = 'Option'
    while (key in props.value) {
      index += 1
      key = `Option ${index}`
    }
    props.onChange({ ...props.value, [key]: '' })
  }
  const updateKey = (oldKey: string, key: string) => {
    if (!key) {
      setKeyErrors(errors => ({ ...errors, [oldKey]: 'Option names cannot be empty.' }))
      return false
    }
    if (key !== oldKey && key in props.value) {
      setKeyErrors(errors => ({ ...errors, [oldKey]: 'Option names must be unique.' }))
      return false
    }
    setKeyErrors(errors =>
      Object.fromEntries(Object.entries(errors).filter(([name]) => name !== oldKey)),
    )
    if (key === oldKey) return true
    props.onChange(
      Object.fromEntries(entries().map(([name, value]) => [name === oldKey ? key : name, value])),
    )
    return true
  }

  return (
    <div class="space-y-2">
      <Show
        when={entries().length > 0}
        fallback={
          <p class="text-xs text-muted-foreground">No options. Use this for a default variant.</p>
        }
      >
        <For each={entries()}>
          {([name, value]) => (
            <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
              <div>
                <Input
                  aria-invalid={Boolean(keyErrors()[name])}
                  aria-label="Option name"
                  disabled={props.disabled}
                  value={name}
                  onChange={event => {
                    if (!updateKey(name, event.currentTarget.value.trim()))
                      event.currentTarget.value = name
                  }}
                />
                <Show when={keyErrors()[name]}>
                  {message => (
                    <p class="mt-1 text-xs text-destructive" role="alert">
                      {message()}
                    </p>
                  )}
                </Show>
              </div>
              <Input
                aria-label={`${name} value`}
                disabled={props.disabled}
                placeholder="Value"
                value={value}
                onInput={event =>
                  props.onChange({ ...props.value, [name]: event.currentTarget.value })
                }
              />
              <Button
                aria-label={`Remove ${name} option`}
                disabled={props.disabled}
                onClick={() => {
                  setKeyErrors(errors =>
                    Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name)),
                  )
                  props.onChange(Object.fromEntries(entries().filter(([key]) => key !== name)))
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          )}
        </For>
      </Show>
      <Button
        disabled={props.disabled || entries().length >= 20}
        onClick={addOption}
        size="sm"
        type="button"
        variant="outline"
      >
        Add option
      </Button>
    </div>
  )
}
