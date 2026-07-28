import {
  adminProductUpdateSchema,
  adminStockUpdateSchema,
  adminVariantUpdateSchema,
} from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogVariant,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Spinner,
  Switch,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import type { Result } from 'better-result'
import { Show, createSignal } from 'solid-js'

import { InlineAlert } from '../components/foundation'

type SaveResult = Result<AdminCatalogProductDetail, AdminCatalogError>
type SaveHandler<Input> = (input: Input) => Promise<SaveResult>

const messages = (errors: readonly unknown[]) =>
  errors.map(error => ({
    message:
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Enter a valid value.',
  }))

const transportMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The save request failed. Try again.'

const productStatus = (value: string): AdminProductUpdate['status'] => {
  if (value === 'active' || value === 'archived') return value
  return 'draft'
}

type FormFailureProps = {
  failure: AdminCatalogError | undefined
  transportError: string | undefined
  onReload: () => void
}

function FormFailure(props: FormFailureProps) {
  const message = () => props.failure?.message ?? props.transportError
  const conflict = () => props.failure?._tag === 'AdminCatalogConflict'

  return (
    <Show when={message()}>
      {text => (
        <InlineAlert
          action={
            <Show when={conflict()}>
              <Button onClick={() => props.onReload()} size="sm" type="button" variant="outline">
                Reload current data
              </Button>
            </Show>
          }
          title={conflict() ? 'Catalog data changed' : 'Could not save changes'}
          tone="destructive"
        >
          {text()}
        </InlineAlert>
      )}
    </Show>
  )
}

type ProductVisibilityFormProps = {
  product: AdminCatalogProductDetail
  onSave: SaveHandler<AdminProductUpdate>
  onReload: () => void
}

export function ProductVisibilityForm(props: ProductVisibilityFormProps) {
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [transportError, setTransportError] = createSignal<string>()
  const validator = toStandardSchema(adminProductUpdateSchema)
  const defaultValues: AdminProductUpdate = {
    expectedUpdatedAt: props.product.updatedAt,
    status: props.product.status,
    featured: props.product.featured,
  }
  const form = createForm(() => ({
    defaultValues,
    validators: { onBlur: validator, onSubmit: validator },
    onSubmit: async ({ value }) => {
      setFailure()
      setTransportError()
      try {
        const result = await props.onSave(value)
        if (result.isErr()) setFailure(result.error)
      } catch (error) {
        setTransportError(transportMessage(error))
      }
    },
  }))

  return (
    <form
      aria-label="Product visibility"
      class="rounded-lg border bg-background p-4"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div class="mb-4 flex flex-col gap-1">
        <h2 class="text-lg leading-6 font-semibold">Visibility</h2>
        <p class="text-sm text-muted-foreground">
          Control whether this product is available to the storefront and featured placements.
        </p>
      </div>
      <FieldGroup class="gap-4 sm:flex-row sm:items-end">
        <form.Field name="status">
          {field => (
            <Field class="sm:max-w-52">
              <FieldLabel for={`${props.product.id}-status`}>Product status</FieldLabel>
              <NativeSelect
                class="w-full"
                id={`${props.product.id}-status`}
                value={field().state.value ?? 'draft'}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onChange={event => field().handleChange(productStatus(event.currentTarget.value))}
              >
                <NativeSelectOption value="draft">Draft</NativeSelectOption>
                <NativeSelectOption value="active">Active</NativeSelectOption>
                <NativeSelectOption value="archived">Archived</NativeSelectOption>
              </NativeSelect>
              <FieldError errors={messages(field().state.meta.errors)} />
            </Field>
          )}
        </form.Field>
        <form.Field name="featured">
          {field => (
            <Field class="sm:max-w-64">
              <div class="flex h-9 items-center justify-between gap-4 rounded-md border px-3">
                <FieldLabel for={`${props.product.id}-featured`}>Featured product</FieldLabel>
                <Switch
                  checked={field().state.value ?? false}
                  id={`${props.product.id}-featured`}
                  onChange={checked => field().handleChange(checked)}
                />
              </div>
              <FieldDescription>Use only for deliberate storefront merchandising.</FieldDescription>
            </Field>
          )}
        </form.Field>
        <form.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button class="w-32" disabled={!state().canSubmit || state().pending} type="submit">
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Saving…' : 'Save product'}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
      <div class="mt-4">
        <FormFailure
          failure={failure()}
          onReload={() => props.onReload()}
          transportError={transportError()}
        />
      </div>
    </form>
  )
}

type VariantEditorProps = {
  variant: AdminCatalogVariant
  onSaveCommercial: SaveHandler<AdminVariantUpdate>
  onSaveStock: SaveHandler<AdminStockUpdate>
  onReload: () => void
}

export function VariantEditor(props: VariantEditorProps) {
  const [commercialFailure, setCommercialFailure] = createSignal<AdminCatalogError>()
  const [commercialTransportError, setCommercialTransportError] = createSignal<string>()
  const [stockFailure, setStockFailure] = createSignal<AdminCatalogError>()
  const [stockTransportError, setStockTransportError] = createSignal<string>()
  const commercialValidator = toStandardSchema(adminVariantUpdateSchema)
  const stockValidator = toStandardSchema(adminStockUpdateSchema)
  const commercialDefaultValues: AdminVariantUpdate = {
    expectedUpdatedAt: props.variant.updatedAt,
    priceMnt: props.variant.priceMnt,
    compareAtPriceMnt: props.variant.compareAtPriceMnt,
    active: props.variant.active,
  }

  const commercialForm = createForm(() => ({
    defaultValues: commercialDefaultValues,
    validators: { onBlur: commercialValidator, onSubmit: commercialValidator },
    onSubmit: async ({ value }) => {
      setCommercialFailure()
      setCommercialTransportError()
      try {
        const result = await props.onSaveCommercial(value)
        if (result.isErr()) setCommercialFailure(result.error)
      } catch (error) {
        setCommercialTransportError(transportMessage(error))
      }
    },
  }))

  const stockForm = createForm(() => ({
    defaultValues: {
      expectedUpdatedAt: props.variant.updatedAt,
      stockQuantity: props.variant.stockQuantity,
    },
    validators: { onBlur: stockValidator, onSubmit: stockValidator },
    onSubmit: async ({ value }) => {
      setStockFailure()
      setStockTransportError()
      try {
        const result = await props.onSaveStock(value)
        if (result.isErr()) setStockFailure(result.error)
      } catch (error) {
        setStockTransportError(transportMessage(error))
      }
    },
  }))

  return (
    <div class="min-w-160 space-y-3">
      <form
        aria-label={`Commercial settings for ${props.variant.name}`}
        class="flex items-start gap-3"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          event.stopPropagation()
          void commercialForm.handleSubmit()
        }}
      >
        <commercialForm.Field name="priceMnt">
          {field => (
            <Field class="w-32 shrink-0">
              <FieldLabel class="sr-only" for={`${props.variant.id}-price`}>
                Price in MNT
              </FieldLabel>
              <Input
                id={`${props.variant.id}-price`}
                min="0"
                step="1"
                type="number"
                value={
                  field().state.value === undefined || Number.isNaN(field().state.value)
                    ? ''
                    : field().state.value
                }
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
              />
              <FieldDescription>Price MNT</FieldDescription>
              <FieldError errors={messages(field().state.meta.errors)} />
            </Field>
          )}
        </commercialForm.Field>
        <commercialForm.Field name="compareAtPriceMnt">
          {field => (
            <Field class="w-36 shrink-0">
              <FieldLabel class="sr-only" for={`${props.variant.id}-compare-price`}>
                Compare-at price in MNT
              </FieldLabel>
              <Input
                id={`${props.variant.id}-compare-price`}
                min="0"
                placeholder="None"
                step="1"
                type="number"
                value={field().state.value ?? ''}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onInput={event =>
                  field().handleChange(
                    event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber,
                  )
                }
              />
              <FieldDescription>Compare-at MNT</FieldDescription>
              <FieldError errors={messages(field().state.meta.errors)} />
            </Field>
          )}
        </commercialForm.Field>
        <commercialForm.Field name="active">
          {field => (
            <Field class="w-20 shrink-0 items-center">
              <div class="flex h-9 items-center gap-2">
                <Switch
                  checked={field().state.value ?? false}
                  id={`${props.variant.id}-active`}
                  onChange={checked => field().handleChange(checked)}
                />
                <FieldLabel for={`${props.variant.id}-active`}>Active</FieldLabel>
              </div>
            </Field>
          )}
        </commercialForm.Field>
        <commercialForm.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button
              class="mt-0 w-27"
              disabled={!state().canSubmit || state().pending}
              size="sm"
              type="submit"
              variant="outline"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Saving…' : 'Save details'}
            </Button>
          )}
        </commercialForm.Subscribe>
      </form>

      <form
        aria-label={`Inventory for ${props.variant.name}`}
        class="flex items-start gap-3 border-t pt-3"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          event.stopPropagation()
          void stockForm.handleSubmit()
        }}
      >
        <stockForm.Field name="stockQuantity">
          {field => (
            <Field class="w-32 shrink-0">
              <FieldLabel class="sr-only" for={`${props.variant.id}-stock`}>
                Stock quantity
              </FieldLabel>
              <Input
                id={`${props.variant.id}-stock`}
                min="0"
                step="1"
                type="number"
                value={Number.isNaN(field().state.value) ? '' : field().state.value}
                aria-invalid={!field().state.meta.isValid}
                onBlur={() => field().handleBlur()}
                onInput={event => field().handleChange(event.currentTarget.valueAsNumber)}
              />
              <FieldDescription>Stock quantity</FieldDescription>
              <FieldError errors={messages(field().state.meta.errors)} />
            </Field>
          )}
        </stockForm.Field>
        <stockForm.Subscribe
          selector={state => ({ canSubmit: state.canSubmit, pending: state.isSubmitting })}
        >
          {state => (
            <Button
              class="w-27"
              disabled={!state().canSubmit || state().pending}
              size="sm"
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending ? 'Saving…' : 'Save stock'}
            </Button>
          )}
        </stockForm.Subscribe>
      </form>

      <FormFailure
        failure={commercialFailure() ?? stockFailure()}
        onReload={() => props.onReload()}
        transportError={commercialTransportError() ?? stockTransportError()}
      />
    </div>
  )
}
