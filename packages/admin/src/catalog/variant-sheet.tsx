import {
  adminVariantCreateSchema,
  adminVariantUpdateSchema,
} from '@store-kit/contracts/admin-catalog'
import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogVariant,
  AdminVariantCreate,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Spinner,
  Switch,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { Show, createSignal } from 'solid-js'
import { toast } from 'solid-sonner'

import { InlineAlert, StatusBadge } from '../components/foundation'
import { UnsavedChangesGuard } from '../components/unsaved-changes'
import { CatalogFailure, OptionRows, transportMessage, validationMessages } from './forms'
import type { CatalogRequests } from './query-options'
import { catalogKeys, catalogMutation } from './query-options'

type VariantInput = AdminVariantCreate | AdminVariantUpdate

const createValues = (product: AdminCatalogProductDetail): AdminVariantCreate => ({
  expectedProductUpdatedAt: product.updatedAt,
  sku: '',
  name: 'Үндсэн',
  options: {},
  priceMnt: 0,
  compareAtPriceMnt: null,
  stockQuantity: 0,
  active: true,
  sortOrder: Math.max(0, ...product.variants.map(variant => variant.sortOrder + 10)),
})

const updateValues = (variant: AdminCatalogVariant): AdminVariantUpdate => ({
  expectedUpdatedAt: variant.updatedAt,
  sku: variant.sku,
  name: variant.name,
  options: variant.options,
  priceMnt: variant.priceMnt,
  compareAtPriceMnt: variant.compareAtPriceMnt,
  stockQuantity: variant.stockQuantity,
  active: variant.active,
  sortOrder: variant.sortOrder,
})

type VariantInspectorProps = {
  product: AdminCatalogProductDetail
  requests: CatalogRequests
  selection: string | undefined
  onClose: () => void
  onProduct: (product: AdminCatalogProductDetail) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function VariantInspector(props: VariantInspectorProps) {
  const variant = () => props.product.variants.find(item => item.id === props.selection)
  const creating = () => props.selection === 'new'

  return (
    <Sheet.Root
      open={props.selection !== undefined}
      onOpenChange={open => !open && props.onClose()}
    >
      <SheetContent class="w-full! max-w-full! gap-0 sm:max-w-xl!" side="right">
        <Show
          when={creating() || variant()}
          fallback={
            <div class="flex min-h-0 flex-1 flex-col p-4 pt-14">
              <InlineAlert title="Хувилбар олдсонгүй" tone="destructive">
                Энэ хувилбар барааны одоогийн мэдээлэлд байхгүй байна.
              </InlineAlert>
              <Button
                class="mt-4 min-h-11! self-start"
                onClick={() => props.onClose()}
                variant="outline"
              >
                Хаах
              </Button>
            </div>
          }
        >
          <SheetHeader class="border-b pr-14">
            <SheetTitle>{creating() ? 'Хувилбар нэмэх' : 'Хувилбар засах'}</SheetTitle>
            <SheetDescription>
              {creating()
                ? 'Өөр үнэ, үлдэгдэл эсвэл сонголттой хувилбар нэмнэ.'
                : `${variant()?.name ?? ''} · ${variant()?.sku ?? ''}`}
            </SheetDescription>
          </SheetHeader>
          <Show
            when={creating()}
            fallback={
              <Show when={variant()}>
                {value => (
                  <VariantForm
                    product={props.product}
                    requests={props.requests}
                    variant={value()}
                    onClose={() => props.onClose()}
                    onProduct={product => props.onProduct(product)}
                    onReload={() => props.onReload()}
                  />
                )}
              </Show>
            }
          >
            <VariantForm
              product={props.product}
              requests={props.requests}
              onClose={() => props.onClose()}
              onProduct={product => props.onProduct(product)}
              onReload={() => props.onReload()}
            />
          </Show>
        </Show>
      </SheetContent>
    </Sheet.Root>
  )
}

type VariantFormProps = {
  product: AdminCatalogProductDetail
  requests: CatalogRequests
  variant?: AdminCatalogVariant
  onClose: () => void
  onProduct: (product: AdminCatalogProductDetail) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

function VariantForm(props: VariantFormProps) {
  const queryClient = useQueryClient()
  const createMutation = useMutation(() => catalogMutation.createVariant(props.requests))
  const updateMutation = useMutation(() => catalogMutation.updateVariant(props.requests))
  const activationMutation = useMutation(() =>
    catalogMutation.updateVariantActivation(props.requests),
  )
  const deleteMutation = useMutation(() => catalogMutation.deleteVariant(props.requests))
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  const [deleteOpen, setDeleteOpen] = createSignal(false)
  const [saved, setSaved] = createSignal(false)
  const installProduct = (product: AdminCatalogProductDetail) => {
    queryClient.setQueryData(catalogKeys.detail(product.id), Result.ok(product))
    props.onProduct(product)
    void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }
  const validator = toStandardSchema(
    props.variant ? adminVariantUpdateSchema : adminVariantCreateSchema,
  )
  const form = createForm(() => ({
    defaultValues: (props.variant
      ? updateValues(props.variant)
      : createValues(props.product)) as VariantInput,
    validators: { onBlur: validator, onSubmit: validator },
    onSubmit: async ({ value }) => {
      setFailure()
      setRequestError()
      try {
        const result =
          'expectedProductUpdatedAt' in value
            ? await createMutation.mutateAsync({ productId: props.product.id, input: value })
            : await updateMutation.mutateAsync({
                productId: props.product.id,
                variantId: props.variant!.id,
                input: value,
              })
        if (result.isErr()) {
          setFailure(result.error)
          return
        }
        toast.success(props.variant ? 'Хувилбарыг хадгаллаа.' : 'Хувилбар үүслээ.')
        setSaved(true)
        props.onClose()
        installProduct(result.value)
      } catch (error) {
        setRequestError(transportMessage(error))
      }
    },
  }))

  const reload = async () => {
    const product = await props.onReload()
    if (!product) return
    setFailure()
    setRequestError()
    if (props.variant) {
      const current = product.variants.find(variant => variant.id === props.variant!.id)
      if (current) form.reset(updateValues(current))
      return
    }
    form.reset(createValues(product))
  }

  const changeActivation = async () => {
    if (!props.variant) return
    setFailure()
    setRequestError()
    try {
      const result = await activationMutation.mutateAsync({
        productId: props.product.id,
        variantId: props.variant.id,
        input: {
          expectedUpdatedAt: props.variant.updatedAt,
          active: !props.variant.active,
        },
      })
      if (result.isErr()) {
        setFailure(result.error)
        return
      }
      const updated = result.value.variants.find(variant => variant.id === props.variant!.id)
      if (updated) form.reset(updateValues(updated))
      toast.success(updated?.active ? 'Хувилбарыг идэвхжүүллээ.' : 'Хувилбарыг идэвхгүй болголоо.')
      installProduct(result.value)
    } catch (error) {
      setRequestError(transportMessage(error))
    }
  }

  const deleteVariant = async () => {
    if (!props.variant) return
    setFailure()
    setRequestError()
    try {
      const result = await deleteMutation.mutateAsync({
        productId: props.product.id,
        variantId: props.variant.id,
        input: {
          expectedProductUpdatedAt: props.product.updatedAt,
          expectedVariantUpdatedAt: props.variant.updatedAt,
        },
      })
      if (result.isErr()) {
        setDeleteOpen(false)
        setFailure(result.error)
        return
      }
      setDeleteOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogKeys.detail(props.product.id) }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
      toast.success('Хувилбарыг бүрмөсөн устгалаа.')
      setSaved(true)
      props.onClose()
    } catch (error) {
      setDeleteOpen(false)
      setRequestError(transportMessage(error))
    }
  }

  return (
    <form
      aria-label={props.variant ? `${props.variant.name} хувилбарыг засах` : 'Хувилбар нэмэх'}
      class="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <UnsavedChangesGuard includeSearchChanges isDirty={() => form.state.isDirty && !saved()} />
      <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <Show
          when={props.variant}
          fallback={
            <form.Field name="active">
              {field => (
                <div class="flex min-h-12 items-center justify-between gap-3 border-y py-2">
                  <div>
                    <FieldLabel for="new-variant-active">Шууд борлуулах</FieldLabel>
                    <div class="mt-1 text-sm text-muted-foreground">
                      Бараа идэвхтэй үед энэ хувилбарыг борлуулж болно.
                    </div>
                  </div>
                  <Switch
                    checked={field().state.value}
                    id="new-variant-active"
                    onChange={checked => field().handleChange(checked)}
                  />
                </div>
              )}
            </form.Field>
          }
        >
          {variant => (
            <div class="flex min-h-12 items-center justify-between gap-3 border-y py-2">
              <div>
                <div class="text-sm font-medium">Борлуулах төлөв</div>
                <div class="mt-1 text-sm text-muted-foreground">
                  Бараа идэвхтэй үед энэ хувилбарыг борлуулж болно.
                </div>
              </div>
              <StatusBadge>{variant().active ? 'Идэвхтэй' : 'Идэвхгүй'}</StatusBadge>
            </div>
          )}
        </Show>

        <div class="grid gap-5 sm:grid-cols-2">
          <form.Field name="sku">
            {field => (
              <Field>
                <FieldLabel for="variant-sku">Барааны код</FieldLabel>
                <Input
                  class="min-h-12! font-mono text-base! sm:h-8! sm:text-sm!"
                  id="variant-sku"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="name">
            {field => (
              <Field>
                <FieldLabel for="variant-name">Хувилбарын нэр</FieldLabel>
                <Input
                  class="min-h-12! text-base! sm:h-8! sm:text-sm!"
                  id="variant-name"
                  value={field().state.value}
                  aria-invalid={!field().state.meta.isValid}
                  onBlur={() => field().handleBlur()}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldError errors={validationMessages(field().state.meta.errors)} />
              </Field>
            )}
          </form.Field>
          <form.Field name="priceMnt">
            {field => (
              <Field>
                <FieldLabel for="variant-price">Үнэ (₮)</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums sm:h-8! sm:text-sm!"
                  id="variant-price"
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
          <form.Field name="stockQuantity">
            {field => (
              <Field>
                <FieldLabel for="variant-stock">Үлдэгдэл</FieldLabel>
                <Input
                  class="min-h-12! text-base! tabular-nums sm:h-8! sm:text-sm!"
                  id="variant-stock"
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
        </div>

        <details class="group border-y py-1">
          <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Нэмэлт тохиргоо
            <span aria-hidden="true" class="text-muted-foreground group-open:rotate-180">
              ▾
            </span>
          </summary>
          <p class="mb-4 text-sm text-muted-foreground">
            Өмнөх үнэ, сонголт болон харагдах дарааллыг шаардлагатай үед тохируулна.
          </p>
          <div class="grid gap-5 pb-4 sm:grid-cols-2">
            <form.Field name="compareAtPriceMnt">
              {field => (
                <Field>
                  <FieldLabel for="variant-compare-price">Өмнөх үнэ (₮)</FieldLabel>
                  <Input
                    class="min-h-12! text-base! tabular-nums sm:h-8! sm:text-sm!"
                    id="variant-compare-price"
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
            <form.Field name="sortOrder">
              {field => (
                <Field>
                  <FieldLabel for="variant-sort">Харагдах дараалал</FieldLabel>
                  <Input
                    class="min-h-12! text-base! tabular-nums sm:h-8! sm:text-sm!"
                    id="variant-sort"
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
            <form.Field name="options">
              {field => (
                <Field class="sm:col-span-2">
                  <FieldLabel>Сонголтууд</FieldLabel>
                  <OptionRows
                    value={field().state.value}
                    onChange={value => field().handleChange(value)}
                  />
                  <FieldDescription>
                    20 хүртэлх хэмжээ, өнгө зэрэг сонголт оруулж болно.
                  </FieldDescription>
                  <FieldError errors={validationMessages(field().state.meta.errors)} />
                </Field>
              )}
            </form.Field>
          </div>
        </details>

        <CatalogFailure
          failure={failure()}
          onReload={() => void reload()}
          transportError={requestError()}
        />

        <Show when={props.variant}>
          {variant => (
            <form.Subscribe selector={state => state.isDirty}>
              {dirty => (
                <section aria-labelledby="variant-actions-title" class="border-t pt-4">
                  <h3 class="text-sm font-medium" id="variant-actions-title">
                    Хувилбарын үйлдэл
                  </h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Бүрмөсөн устгахаас өмнө идэвхгүй болгоно. Идэвхтэй бараа дор хаяж нэг идэвхтэй
                    хувилбартай байна.
                  </p>
                  <Show when={dirty()}>
                    <p class="mt-2 text-sm text-(--admin-warning-foreground)">
                      Төлөв өөрчлөх эсвэл устгахаас өмнө засвараа хадгална уу.
                    </p>
                  </Show>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <Button
                      class="min-h-11! sm:h-8!"
                      disabled={dirty() || activationMutation.isPending}
                      onClick={() => void changeActivation()}
                      type="button"
                      variant="outline"
                    >
                      {activationMutation.isPending
                        ? 'Шинэчилж байна…'
                        : variant().active
                          ? 'Идэвхгүй болгох'
                          : 'Идэвхжүүлэх'}
                    </Button>
                    <Button
                      class="min-h-11! sm:h-8!"
                      disabled={dirty() || variant().active || deleteMutation.isPending}
                      onClick={() => setDeleteOpen(true)}
                      type="button"
                      variant="destructive"
                    >
                      Бүрмөсөн устгах
                    </Button>
                  </div>
                </section>
              )}
            </form.Subscribe>
          )}
        </Show>
      </div>

      <div class="flex shrink-0 items-center justify-end gap-2 border-t p-4">
        <Button
          class="min-h-12! sm:h-9!"
          onClick={() => props.onClose()}
          type="button"
          variant="outline"
        >
          Болих
        </Button>
        <form.Subscribe
          selector={state => ({
            canSubmit: state.canSubmit,
            dirty: state.isDirty,
            pending: state.isSubmitting,
          })}
        >
          {state => (
            <Button
              class="min-h-12! sm:h-9!"
              disabled={
                !state().canSubmit ||
                state().pending ||
                (props.variant !== undefined && !state().dirty)
              }
              type="submit"
            >
              <Show when={state().pending}>
                <Spinner aria-hidden="true" />
              </Show>
              {state().pending
                ? 'Хадгалж байна…'
                : props.variant
                  ? 'Хувилбар хадгалах'
                  : 'Хувилбар нэмэх'}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <Dialog open={deleteOpen()} onOpenChange={setDeleteOpen}>
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Хувилбарыг бүрмөсөн устгах уу?</DialogTitle>
            <DialogDescription>
              {props.variant?.name} устна. Өмнөх захиалгын мэдээлэл хэвээр үлдэнэ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Болих
            </DialogClose>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => void deleteVariant()}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Устгаж байна…' : 'Бүрмөсөн устгах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
