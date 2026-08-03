import { AltArrowLeft, AltArrowRight, TrashBinTrash } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogImage,
  AdminCatalogProductDetail,
  AdminCatalogVariant,
  MediaCleanup,
} from '@store-kit/contracts/admin-catalog'
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { Image } from '@unpic/solid/base'
import { For, Show, createEffect, createSignal, on, onCleanup } from 'solid-js'
import { toast } from 'solid-sonner'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { updateCatalogProductCache } from './cache'
import { CatalogFailure, mutationFailure, mutationTransportError } from './errors'
import { catalogMutation } from './query-options'

const cleanupMessage = (cleanup: MediaCleanup) => {
  if (cleanup === 'pending')
    return 'Барааны бүртгэл устсан боловч зургийн файлыг цэвэрлэх шаардлагатай байна.'
  if (cleanup === 'retained-for-orders')
    return 'Өмнөх захиалгад ашигласан тул зургийн файлыг хадгалж үлдээлээ.'
  return undefined
}

const imageDomain = (url: string) => {
  try {
    return new URL(url).hostname || undefined
  } catch {
    return undefined
  }
}

type GalleryImageEditorProps = {
  image: AdminCatalogImage
  imageCount: number
  index: number
  variants: AdminCatalogVariant[]
  pendingMove: boolean
  productId: string
  productUpdatedAt: number
  onCleanupWarning: (message: string) => void
  onDirtyChange: (dirty: boolean) => void
  onMove: (direction: -1 | 1) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function GalleryImageEditor(props: GalleryImageEditorProps) {
  const queryClient = useQueryClient()
  const updateMutation = useMutation(() => catalogMutation.updateImage())
  const deleteMutation = useMutation(() => catalogMutation.deleteImage())
  const [removeOpen, setRemoveOpen] = createSignal(false)
  const values = () => ({
    alt: props.image.alt,
    variantIds: [...props.image.variantIds],
    expectedUpdatedAt: props.productUpdatedAt,
  })
  const form = createForm(() => ({
    defaultValues: values(),
    onSubmit: async ({ value }) => {
      updateMutation.reset()
      const result = await updateMutation
        .mutateAsync({
          productId: props.productId,
          imageId: props.image.id,
          input: {
            alt: value.alt.trim(),
            variantIds: value.variantIds,
            expectedUpdatedAt: value.expectedUpdatedAt,
          },
        })
        .catch(() => undefined)
      if (!result?.isOk()) return

      await updateCatalogProductCache(queryClient, result.value)
      const image = result.value.images.find(item => item.id === props.image.id)
      if (image)
        form.reset({
          alt: image.alt,
          variantIds: [...image.variantIds],
          expectedUpdatedAt: result.value.updatedAt,
        })
      toast.success('Зургийн мэдээллийг хадгаллаа.')
    },
  }))
  const formState = form.useSelector(state => ({
    alt: state.values.alt,
    dirty: state.isDirty,
  }))

  createEffect(
    on(
      () => [props.image, props.productUpdatedAt] as const,
      () => {
        if (!formState().dirty) form.reset(values())
      },
      { defer: true },
    ),
  )
  createEffect(() => props.onDirtyChange(formState().dirty))
  onCleanup(() => props.onDirtyChange(false))

  const reload = async () => {
    const product = await props.onReload()
    if (!product) return
    updateMutation.reset()
    deleteMutation.reset()
    const image = product.images.find(item => item.id === props.image.id)
    if (image)
      form.reset({
        alt: image.alt,
        variantIds: [...image.variantIds],
        expectedUpdatedAt: product.updatedAt,
      })
  }

  const remove = async () => {
    deleteMutation.reset()
    const result = await deleteMutation
      .mutateAsync({
        productId: props.productId,
        imageId: props.image.id,
        input: { expectedUpdatedAt: props.productUpdatedAt },
      })
      .catch(() => undefined)
    if (!result?.isOk()) return

    const message = cleanupMessage(result.value.mediaCleanup)
    if (message) {
      props.onCleanupWarning(message)
      toast.warning(message)
    } else toast.success('Зургийг хаслаа.')
    setRemoveOpen(false)
    await updateCatalogProductCache(queryClient, result.value.product)
  }

  const failure = () => mutationFailure(updateMutation) ?? mutationFailure(deleteMutation)
  const requestError = () =>
    mutationTransportError(updateMutation) ?? mutationTransportError(deleteMutation)

  return (
    <article class="grid gap-4 border-t px-3 py-4 first:border-t-0 md:grid-cols-[7rem_minmax(0,1fr)]">
      <Image
        alt={props.image.alt}
        breakpoints={[112, 224]}
        class="aspect-square size-28 rounded-md bg-muted object-cover"
        height={props.image.height}
        layout="fixed"
        operations={{ quality: 80, format: 'auto', fit: 'scale-down' }}
        options={
          imageDomain(props.image.url) ? { domain: imageDomain(props.image.url) } : undefined
        }
        sizes="112px"
        src={props.image.url}
        transformer={cloudflare}
        unstyled
        width={props.image.width}
      />
      <form
        class="min-w-0"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <form.Field name="alt">
            {field => (
              <Field>
                <FieldLabel for={`${props.image.id}-alt`}>Зургийн тайлбар</FieldLabel>
                <Input
                  class="min-h-12! text-base! md:h-8! md:text-sm!"
                  id={`${props.image.id}-alt`}
                  maxlength="300"
                  value={field().state.value}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
              </Field>
            )}
          </form.Field>
          <div class="flex flex-wrap gap-1.5">
            <Button
              aria-label="Зургийг урагш зөөх"
              class="min-h-11! min-w-11! md:size-8!"
              disabled={formState().dirty || props.index === 0 || props.pendingMove}
              onClick={() => props.onMove(-1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <AltArrowLeft aria-hidden="true" />
            </Button>
            <Button
              aria-label="Зургийг хойш зөөх"
              class="min-h-11! min-w-11! md:size-8!"
              disabled={
                formState().dirty || props.index === props.imageCount - 1 || props.pendingMove
              }
              onClick={() => props.onMove(1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <AltArrowRight aria-hidden="true" />
            </Button>
            <Button
              class="min-h-11! md:h-8!"
              disabled={!formState().dirty || !formState().alt.trim() || updateMutation.isPending}
              size="sm"
              type="submit"
              variant="outline"
            >
              {updateMutation.isPending ? 'Хадгалж байна…' : 'Зураг хадгалах'}
            </Button>
            <Button
              aria-label="Зураг хасах"
              class="min-h-11! min-w-11! md:size-8!"
              disabled={formState().dirty || deleteMutation.isPending}
              onClick={() => setRemoveOpen(true)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <TrashBinTrash aria-hidden="true" />
            </Button>
          </div>
        </div>
        <Show when={props.variants.length > 0}>
          <form.Field name="variantIds">
            {field => (
              <div class="mt-3 border-t pt-3">
                <FieldLabel>Холбосон хувилбар</FieldLabel>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  <For each={props.variants}>
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
              </div>
            )}
          </form.Field>
        </Show>
        <div class="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
          <span>Байрлал {props.index + 1}</span>
          <span>
            {props.image.width} × {props.image.height}
          </span>
          <button
            class="min-h-11 underline underline-offset-2 md:min-h-8"
            onClick={() => void reload()}
            type="button"
          >
            Зургийн засварыг буцаах
          </button>
        </div>
        <Show when={failure() || requestError()}>
          <div class="mt-3">
            <CatalogFailure
              failure={failure()}
              onReload={() => void reload()}
              title="Зургийн үйлдлийг гүйцэтгэж чадсангүй"
              transportError={requestError()}
            />
          </div>
        </Show>
      </form>

      <Dialog open={removeOpen()} onOpenChange={setRemoveOpen}>
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Зургийг хасах уу?</DialogTitle>
            <DialogDescription>
              Зураг бараанаас хасагдана. Өмнөх захиалгад ашигласан файл хэвээр үлдэнэ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Болих
            </DialogClose>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Хасаж байна…' : 'Зураг хасах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
