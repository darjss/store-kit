import { AltArrowLeft, AltArrowRight, GalleryAdd, TrashBinTrash } from '@solar-icons/solid/Linear'
import type {
  AdminCatalogError,
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
  FieldDescription,
  FieldLabel,
  Input,
  Spinner,
} from '@store-kit/ui'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { Image } from '@unpic/solid/base'
import { Result } from 'better-result'
import { For, Show, createEffect, createSignal, on, onCleanup, untrack } from 'solid-js'
import { toast } from 'solid-sonner'
import { generate as cloudflare } from 'unpic/providers/cloudflare'

import { AdminEmptyState } from '../components/foundation'
import { CatalogFailure, transportMessage } from './forms'
import type { CatalogRequests } from './query-options'
import { catalogKeys, catalogMutation } from './query-options'

const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/avif'

const sameVariantIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every(id => right.includes(id))

const cleanupMessage = (cleanup: MediaCleanup) => {
  if (cleanup === 'pending')
    return 'The catalog record was removed, but media cleanup is pending operator attention.'
  if (cleanup === 'retained-for-orders')
    return 'The image file was retained because historical orders still reference it.'
  return undefined
}

type ProductGalleryProps = {
  product: AdminCatalogProductDetail
  requests: CatalogRequests
  onProduct: (product: AdminCatalogProductDetail) => void
  onCleanupWarning: (message: string) => void
  onDirtyChange: (dirty: boolean) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function ProductGallery(props: ProductGalleryProps) {
  const queryClient = useQueryClient()
  const uploadMutation = useMutation(() => catalogMutation.uploadImage(props.requests))
  const updateMutation = useMutation(() => catalogMutation.updateImage(props.requests))
  const reorderMutation = useMutation(() => catalogMutation.reorderImages(props.requests))
  const deleteMutation = useMutation(() => catalogMutation.deleteImage(props.requests))
  const [file, setFile] = createSignal<File>()
  const [alt, setAlt] = createSignal('')
  const [variantIds, setVariantIds] = createSignal<string[]>([])
  const [uploadExpectedUpdatedAt, setUploadExpectedUpdatedAt] = createSignal<number>()
  const [dirtyImageIds, setDirtyImageIds] = createSignal<string[]>([])
  const [resetVersion, setResetVersion] = createSignal(0)
  const [failure, setFailure] = createSignal<AdminCatalogError>()
  const [requestError, setRequestError] = createSignal<string>()
  const [reorderingImageId, setReorderingImageId] = createSignal<string>()
  const [removingImageId, setRemovingImageId] = createSignal<string>()
  let fileInput: HTMLInputElement | undefined

  const installProduct = (product: AdminCatalogProductDetail) => {
    queryClient.setQueryData(catalogKeys.detail(product.id), Result.ok(product))
    props.onProduct(product)
    void queryClient.invalidateQueries({ queryKey: catalogKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const clearUploadDraft = () => {
    setFile()
    setAlt('')
    setVariantIds([])
    setUploadExpectedUpdatedAt()
    if (fileInput) fileInput.value = ''
  }

  const reload = async () => {
    setFailure()
    setRequestError()
    const product = await props.onReload()
    if (!product) return
    clearUploadDraft()
    setResetVersion(version => version + 1)
  }

  const beginUploadDraft = () =>
    setUploadExpectedUpdatedAt(current => current ?? props.product.updatedAt)

  const toggleUploadVariant = (variantId: string, checked: boolean) => {
    beginUploadDraft()
    setVariantIds(current =>
      checked ? [...new Set([...current, variantId])] : current.filter(id => id !== variantId),
    )
  }

  const setImageDirty = (imageId: string, dirty: boolean) =>
    setDirtyImageIds(current =>
      dirty ? [...new Set([...current, imageId])] : current.filter(id => id !== imageId),
    )

  createEffect(() =>
    props.onDirtyChange(uploadExpectedUpdatedAt() !== undefined || dirtyImageIds().length > 0),
  )
  onCleanup(() => props.onDirtyChange(false))

  const upload = async () => {
    const selected = file()
    const imageAlt = alt().trim()
    if (!selected || !imageAlt) {
      setFailure()
      setRequestError('Choose an image and enter alt text before uploading.')
      return
    }
    setFailure()
    setRequestError()
    try {
      const result = await uploadMutation.mutateAsync({
        productId: props.product.id,
        input: {
          file: selected,
          alt: imageAlt,
          variantIds: variantIds(),
          expectedUpdatedAt: uploadExpectedUpdatedAt() ?? props.product.updatedAt,
        },
      })
      if (result.isErr()) {
        setFailure(result.error)
        return
      }
      installProduct(result.value)
      clearUploadDraft()
      toast.success('Product image uploaded.')
    } catch (error) {
      setRequestError(transportMessage(error))
    }
  }

  const updateImage = async (
    image: AdminCatalogImage,
    nextAlt: string,
    nextVariantIds: string[],
    expectedUpdatedAt: number,
  ) => {
    setFailure()
    setRequestError()
    try {
      const result = await updateMutation.mutateAsync({
        productId: props.product.id,
        imageId: image.id,
        input: {
          alt: nextAlt.trim(),
          variantIds: nextVariantIds,
          expectedUpdatedAt,
        },
      })
      if (result.isErr()) {
        setFailure(result.error)
        return
      }
      installProduct(result.value)
      toast.success('Image details saved.')
      return result.value
    } catch (error) {
      setRequestError(transportMessage(error))
    }
  }

  const reorder = async (imageId: string, direction: -1 | 1) => {
    const imageIds = props.product.images.map(image => image.id)
    const index = imageIds.indexOf(imageId)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= imageIds.length) return
    const ordered = [...imageIds]
    const [moved] = ordered.splice(index, 1)
    if (!moved) return
    ordered.splice(destination, 0, moved)
    setFailure()
    setRequestError()
    setReorderingImageId(imageId)
    try {
      const result = await reorderMutation.mutateAsync({
        productId: props.product.id,
        input: { imageIds: ordered, expectedUpdatedAt: props.product.updatedAt },
      })
      if (result.isErr()) {
        setFailure(result.error)
        return
      }
      installProduct(result.value)
      toast.success('Gallery order updated.')
    } catch (error) {
      setRequestError(transportMessage(error))
    } finally {
      setReorderingImageId()
    }
  }

  const remove = async (image: AdminCatalogImage) => {
    setFailure()
    setRequestError()
    setRemovingImageId(image.id)
    try {
      const result = await deleteMutation.mutateAsync({
        productId: props.product.id,
        imageId: image.id,
        input: { expectedUpdatedAt: props.product.updatedAt },
      })
      if (result.isErr()) {
        setFailure(result.error)
        return false
      }
      const message = cleanupMessage(result.value.mediaCleanup)
      if (message) props.onCleanupWarning(message)
      installProduct(result.value.product)
      if (message) toast.warning(message)
      else toast.success('Image removed.')
      return true
    } catch (error) {
      setRequestError(transportMessage(error))
      return false
    } finally {
      setRemovingImageId()
    }
  }

  return (
    <section aria-labelledby="gallery-title" class="border-b py-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-sm font-semibold" id="gallery-title">
            Gallery
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            JPEG, PNG, WebP, or AVIF. Maximum 10 MiB per image.
          </p>
        </div>
        <span class="text-xs text-muted-foreground tabular-nums">
          {props.product.images.length} {props.product.images.length === 1 ? 'image' : 'images'}
        </span>
      </div>

      <div class="mt-4 grid gap-3 border-y bg-card px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)_auto] md:items-end">
        <Field>
          <FieldLabel for="catalog-image-file">Image file</FieldLabel>
          <Input
            accept={acceptedImageTypes}
            id="catalog-image-file"
            ref={element => {
              fileInput = element
            }}
            type="file"
            onChange={event => {
              const selected = event.currentTarget.files?.[0]
              if (selected) beginUploadDraft()
              setFile(selected)
            }}
          />
        </Field>
        <Field>
          <FieldLabel for="catalog-image-alt">Alt text</FieldLabel>
          <Input
            id="catalog-image-alt"
            maxlength="300"
            placeholder="Describe the product image"
            value={alt()}
            onInput={event => {
              beginUploadDraft()
              setAlt(event.currentTarget.value)
            }}
          />
        </Field>
        <div class="flex gap-1.5">
          <Button
            disabled={uploadMutation.isPending || !file() || !alt().trim()}
            onClick={() => void upload()}
            type="button"
          >
            <Show when={uploadMutation.isPending} fallback={<GalleryAdd aria-hidden="true" />}>
              <Spinner aria-hidden="true" />
            </Show>
            {uploadMutation.isPending ? 'Uploading…' : 'Upload image'}
          </Button>
          <Show when={uploadExpectedUpdatedAt() !== undefined}>
            <Button onClick={clearUploadDraft} type="button" variant="ghost">
              Clear
            </Button>
          </Show>
        </div>
        <Show when={props.product.variants.length > 0}>
          <div class="md:col-span-3">
            <FieldLabel>Assign upload to variants</FieldLabel>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <For each={props.product.variants}>
                {variant => (
                  <Checkbox
                    checked={variantIds().includes(variant.id)}
                    onChange={checked => toggleUploadVariant(variant.id, checked)}
                  >
                    {variant.name}
                  </Checkbox>
                )}
              </For>
            </div>
            <FieldDescription class="mt-1">
              Leave clear to use this image in the shared product gallery.
            </FieldDescription>
          </div>
        </Show>
      </div>

      <Show when={failure() || requestError()}>
        <div class="mt-3">
          <CatalogFailure
            failure={failure()}
            onReload={() => void reload()}
            title="Gallery action failed"
            transportError={requestError()}
          />
        </div>
      </Show>

      <div class="mt-4 border-y bg-card">
        <Show
          when={props.product.images.length > 0}
          fallback={
            <AdminEmptyState
              description="Upload the first product image with descriptive alt text."
              title="No product images"
            />
          }
        >
          <For each={props.product.images.map(image => image.id)}>
            {(imageId, index) => (
              <Show when={props.product.images.find(image => image.id === imageId)}>
                {image => (
                  <ImageEditor
                    image={image()}
                    index={index()}
                    imageCount={props.product.images.length}
                    pendingMove={reorderingImageId() === imageId}
                    pendingRemove={removingImageId() === imageId}
                    productUpdatedAt={props.product.updatedAt}
                    resetVersion={resetVersion()}
                    variants={props.product.variants}
                    onDirtyChange={dirty => setImageDirty(imageId, dirty)}
                    onMove={direction => void reorder(imageId, direction)}
                    onReload={() => {
                      setFailure()
                      setRequestError()
                      return props.onReload()
                    }}
                    onRemove={() => remove(image())}
                    onSave={(nextAlt, nextVariantIds, expectedUpdatedAt) =>
                      updateImage(image(), nextAlt, nextVariantIds, expectedUpdatedAt)
                    }
                  />
                )}
              </Show>
            )}
          </For>
        </Show>
      </div>
    </section>
  )
}

type ImageEditorProps = {
  image: AdminCatalogImage
  imageCount: number
  index: number
  variants: AdminCatalogVariant[]
  pendingMove: boolean
  pendingRemove: boolean
  productUpdatedAt: number
  resetVersion: number
  onDirtyChange: (dirty: boolean) => void
  onMove: (direction: -1 | 1) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
  onRemove: () => Promise<boolean>
  onSave: (
    alt: string,
    variantIds: string[],
    expectedUpdatedAt: number,
  ) => Promise<AdminCatalogProductDetail | undefined>
}

function ImageEditor(props: ImageEditorProps) {
  const [alt, setAlt] = createSignal(props.image.alt)
  const [variantIds, setVariantIds] = createSignal([...props.image.variantIds])
  const [baselineAlt, setBaselineAlt] = createSignal(props.image.alt)
  const [baselineVariantIds, setBaselineVariantIds] = createSignal([...props.image.variantIds])
  const [expectedUpdatedAt, setExpectedUpdatedAt] = createSignal(props.productUpdatedAt)
  const [saving, setSaving] = createSignal(false)
  const [removeOpen, setRemoveOpen] = createSignal(false)
  let installedResetVersion = props.resetVersion
  const dirty = () => alt() !== baselineAlt() || !sameVariantIds(variantIds(), baselineVariantIds())
  const installBaseline = (image: AdminCatalogImage, updatedAt: number) => {
    setAlt(image.alt)
    setVariantIds([...image.variantIds])
    setBaselineAlt(image.alt)
    setBaselineVariantIds([...image.variantIds])
    setExpectedUpdatedAt(updatedAt)
  }

  createEffect(
    on(
      () => [props.image, props.productUpdatedAt, props.resetVersion] as const,
      ([image, updatedAt, resetVersion]) => {
        if (resetVersion !== installedResetVersion) {
          installedResetVersion = resetVersion
          installBaseline(image, updatedAt)
          return
        }
        if (!untrack(dirty)) installBaseline(image, updatedAt)
      },
      { defer: true },
    ),
  )
  createEffect(() => props.onDirtyChange(dirty()))
  onCleanup(() => props.onDirtyChange(false))

  const save = async () => {
    if (!alt().trim()) return
    setSaving(true)
    const product = await props.onSave(alt(), variantIds(), expectedUpdatedAt())
    if (product) {
      const image = product.images.find(item => item.id === props.image.id)
      if (image) installBaseline(image, product.updatedAt)
    }
    setSaving(false)
  }

  const reload = async () => {
    const product = await props.onReload()
    if (!product) return
    const image = product.images.find(item => item.id === props.image.id)
    if (image) installBaseline(image, product.updatedAt)
  }

  const toggleVariant = (variantId: string, checked: boolean) =>
    setVariantIds(current =>
      checked ? [...new Set([...current, variantId])] : current.filter(id => id !== variantId),
    )

  return (
    <article class="grid gap-4 border-t px-3 py-4 first:border-t-0 md:grid-cols-[7rem_minmax(0,1fr)]">
      <Image
        alt={props.image.alt}
        breakpoints={[112, 224]}
        class="aspect-square size-28 rounded-md bg-muted object-cover"
        height={props.image.height}
        layout="fixed"
        operations={{ quality: 80, format: 'auto', fit: 'scale-down' }}
        options={{ domain: new URL(props.image.url).hostname }}
        sizes="112px"
        src={props.image.url}
        transformer={cloudflare}
        unstyled
        width={props.image.width}
      />
      <div class="min-w-0">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Field>
            <FieldLabel for={`${props.image.id}-alt`}>Alt text</FieldLabel>
            <Input
              id={`${props.image.id}-alt`}
              maxlength="300"
              value={alt()}
              onInput={event => setAlt(event.currentTarget.value)}
            />
          </Field>
          <div class="flex flex-wrap gap-1.5">
            <Button
              aria-label="Move image previous"
              disabled={dirty() || props.index === 0 || props.pendingMove}
              onClick={() => props.onMove(-1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <AltArrowLeft aria-hidden="true" />
            </Button>
            <Button
              aria-label="Move image next"
              disabled={dirty() || props.index === props.imageCount - 1 || props.pendingMove}
              onClick={() => props.onMove(1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <AltArrowRight aria-hidden="true" />
            </Button>
            <Button
              disabled={!dirty() || !alt().trim() || saving()}
              onClick={() => void save()}
              size="sm"
              type="button"
              variant="outline"
            >
              {saving() ? 'Saving…' : 'Save image'}
            </Button>
            <Button
              aria-label="Remove image"
              disabled={dirty() || props.pendingRemove}
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
          <div class="mt-3 border-t pt-3">
            <FieldLabel>Variant assignments</FieldLabel>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <For each={props.variants}>
                {variant => (
                  <Checkbox
                    checked={variantIds().includes(variant.id)}
                    onChange={checked => toggleVariant(variant.id, checked)}
                  >
                    {variant.name}
                  </Checkbox>
                )}
              </For>
            </div>
          </div>
        </Show>
        <div class="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground tabular-nums">
          <span>Position {props.index + 1}</span>
          <span>
            {props.image.width} × {props.image.height}
          </span>
          <button class="underline underline-offset-2" onClick={() => void reload()} type="button">
            Reset local image edits
          </button>
        </div>
      </div>

      <Dialog open={removeOpen()} onOpenChange={setRemoveOpen}>
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Remove image?</DialogTitle>
            <DialogDescription>
              The catalog image will be removed. Files used by historical orders are retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Cancel
            </DialogClose>
            <Button
              disabled={props.pendingRemove}
              onClick={async () => {
                if (await props.onRemove()) setRemoveOpen(false)
              }}
              type="button"
              variant="destructive"
            >
              {props.pendingRemove ? 'Removing…' : 'Remove image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
