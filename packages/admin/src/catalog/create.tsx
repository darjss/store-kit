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

const slugFromName = (name: string) =>
  name
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)

const defaultValues: AdminProductCreate = {
  name: '',
  slug: '',
  shortDescription: null,
  description: null,
  status: 'draft',
  featured: false,
  brandId: null,
  categoryId: null,
  initialVariant: {
    sku: '',
    name: 'Default',
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
    <section class="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-7">
      <div class="mb-3">
        <Button onClick={() => props.onBack()} size="sm" type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" />
          Back to catalog
        </Button>
      </div>
      <PageHeader
        description="Create the product and its required first variant in one atomic save."
        title="New product"
        titleId="new-product-title"
      />

      <div class="mt-5">
        <Show
          when={!selectorsQuery.isPending}
          fallback={
            <div aria-busy="true" class="space-y-5" role="status">
              <span class="sr-only">Loading product form…</span>
              <Skeleton class="h-8 w-40" />
              <Skeleton class="h-32 w-full" />
              <Skeleton class="h-32 w-full" />
            </div>
          }
        >
          <Show
            when={!selectorsQuery.isError}
            fallback={
              <RetryState
                message="The product form could not load its brand and category choices."
                onRetry={() => void selectorsQuery.refetch()}
                pending={selectorsQuery.isFetching}
              />
            }
          >
            <Show
              when={!expectedError()}
              fallback={
                <InlineAlert title="Could not load product form" tone="destructive">
                  {expectedError()?.message ?? 'The selector request failed.'}
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
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  const [slugEdited, setSlugEdited] = createSignal(false)
  const [created, setCreated] = createSignal(false)
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
        queryClient.setQueryData(catalogKeys.detail(result.value.id), result)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        ])
        toast.success('Product created.')
        setCreated(true)
        props.onCreated(result.value.id)
      } catch (error) {
        setRequestError(transportMessage(error))
      }
    },
  }))

  return (
    <form
      aria-label="Create product"
      class="pb-20"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <UnsavedChangesGuard isDirty={() => form.state.isDirty && !created()} />
      <section aria-labelledby="new-product-section" class="border-b pb-5">
        <div class="mb-4 grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <h2 class="text-sm font-semibold" id="new-product-section">
            Product
          </h2>
          <p class="text-xs text-muted-foreground">Name, URL, and storefront copy.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 sm:pl-48">
          <form.Field name="name">
            {field => (
              <Field>
                <FieldLabel for="new-product-name">Name</FieldLabel>
                <Input
                  autofocus
                  id="new-product-name"
                  placeholder="Tanchjim Bunny"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => {
                    const name = event.currentTarget.value
                    field().handleChange(name)
                    if (!slugEdited()) form.setFieldValue('slug', slugFromName(name))
                  }}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="slug">
            {field => (
              <Field>
                <FieldLabel for="new-product-slug">Slug</FieldLabel>
                <Input
                  class="font-mono"
                  id="new-product-slug"
                  placeholder="tanchjim-bunny"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => {
                    setSlugEdited(true)
                    field().handleChange(event.currentTarget.value)
                  }}
                />
                <FieldDescription>Filled from the name until you edit it.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="shortDescription">
            {field => (
              <Field class="sm:col-span-2">
                <FieldLabel for="new-product-short-description">Short description</FieldLabel>
                <Textarea
                  class="min-h-20 resize-y"
                  id="new-product-short-description"
                  placeholder="A concise catalog summary"
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
                <FieldLabel for="new-product-description">Description</FieldLabel>
                <Textarea
                  class="min-h-32 resize-y"
                  id="new-product-description"
                  placeholder="Full product description"
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
        </div>
      </section>

      <section aria-labelledby="new-organization-section" class="border-b py-5">
        <div class="mb-4 grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <h2 class="text-sm font-semibold" id="new-organization-section">
            Organization
          </h2>
          <p class="text-xs text-muted-foreground">Optional existing catalog references.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 sm:pl-48">
          <form.Field name="brandId">
            {field => (
              <Field>
                <FieldLabel for="new-product-brand">Brand</FieldLabel>
                <NativeSelect
                  class="w-full"
                  id="new-product-brand"
                  value={field().state.value ?? ''}
                  onChange={event => field().handleChange(event.currentTarget.value || null)}
                >
                  <NativeSelectOption value="">No brand</NativeSelectOption>
                  <For each={props.selectors.brands}>
                    {brand => (
                      <NativeSelectOption value={brand.id}>{brand.name}</NativeSelectOption>
                    )}
                  </For>
                </NativeSelect>
              </Field>
            )}
          </form.Field>
          <form.Field name="categoryId">
            {field => (
              <Field>
                <FieldLabel for="new-product-category">Category</FieldLabel>
                <NativeSelect
                  class="w-full"
                  id="new-product-category"
                  value={field().state.value ?? ''}
                  onChange={event => field().handleChange(event.currentTarget.value || null)}
                >
                  <NativeSelectOption value="">No category</NativeSelectOption>
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

      <section aria-labelledby="new-publishing-section" class="border-b py-5">
        <div class="mb-4 grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <h2 class="text-sm font-semibold" id="new-publishing-section">
            Publishing
          </h2>
          <p class="text-xs text-muted-foreground">Draft is the safe default.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 sm:pl-48">
          <form.Field name="status">
            {field => (
              <Field>
                <FieldLabel for="new-product-status">Status</FieldLabel>
                <NativeSelect
                  class="w-full"
                  id="new-product-status"
                  value={field().state.value}
                  onChange={event =>
                    field().handleChange(
                      event.currentTarget.value === 'active' ? 'active' : 'draft',
                    )
                  }
                >
                  <NativeSelectOption value="draft">Draft</NativeSelectOption>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
          </form.Field>
          <form.Field name="featured">
            {field => (
              <Field>
                <div class="flex h-8 items-center justify-between border-y px-1">
                  <FieldLabel for="new-product-featured">Featured</FieldLabel>
                  <Switch
                    checked={field().state.value}
                    id="new-product-featured"
                    onChange={checked => field().handleChange(checked)}
                  />
                </div>
                <FieldDescription>
                  Use only for deliberate storefront merchandising.
                </FieldDescription>
              </Field>
            )}
          </form.Field>
        </div>
      </section>

      <section aria-labelledby="new-variant-section" class="py-5">
        <div class="mb-4 grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-5">
          <h2 class="text-sm font-semibold" id="new-variant-section">
            Initial variant
          </h2>
          <p class="text-xs text-muted-foreground">Required and created active with the product.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 sm:pl-48">
          <form.Field name="initialVariant.sku">
            {field => (
              <Field>
                <FieldLabel for="new-variant-sku">SKU</FieldLabel>
                <Input
                  class="font-mono"
                  id="new-variant-sku"
                  placeholder="BUNNY-BLACK"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="initialVariant.name">
            {field => (
              <Field>
                <FieldLabel for="new-variant-name">Display name</FieldLabel>
                <Input
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
          <form.Field name="initialVariant.priceMnt">
            {field => (
              <Field>
                <FieldLabel for="new-variant-price">Price (MNT)</FieldLabel>
                <Input
                  id="new-variant-price"
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
          <form.Field name="initialVariant.compareAtPriceMnt">
            {field => (
              <Field>
                <FieldLabel for="new-variant-compare-price">Compare-at price (MNT)</FieldLabel>
                <Input
                  id="new-variant-compare-price"
                  min="0"
                  placeholder="None"
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
          <form.Field name="initialVariant.stockQuantity">
            {field => (
              <Field>
                <FieldLabel for="new-variant-stock">Stock quantity</FieldLabel>
                <Input
                  id="new-variant-stock"
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
          <form.Field name="initialVariant.sortOrder">
            {field => (
              <Field>
                <FieldLabel for="new-variant-sort">Sort order</FieldLabel>
                <Input
                  id="new-variant-sort"
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
                <FieldLabel>Options</FieldLabel>
                <OptionRows
                  value={field().state.value}
                  onChange={value => field().handleChange(value)}
                />
                <FieldDescription>Simple key/value pairs such as size and color.</FieldDescription>
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
        </div>
      </section>

      <CatalogFailure
        failure={failure()}
        title="Could not create product"
        transportError={requestError()}
      />

      <div class="sticky bottom-0 mt-5 flex flex-col gap-2 border-t bg-background/95 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end">
        <p class="mr-auto text-xs text-muted-foreground">
          Product and initial variant are saved together.
        </p>
        <form.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button disabled={!state().canSubmit || state().pending} type="submit">
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Creating product…' : 'Create product'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
