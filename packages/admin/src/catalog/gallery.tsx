import type { AdminCatalogProductDetail } from '@store-kit/contracts/admin-catalog'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'
import { toast } from 'solid-sonner'

import { AdminEmptyState } from '../components/foundation'
import { updateCatalogProductCache } from './cache'
import { CatalogFailure, mutationFailure, mutationTransportError } from './errors'
import { GalleryImageEditor } from './gallery-image-editor'
import { GalleryUpload } from './gallery-upload'
import type { CatalogRequests } from './query-options'
import { catalogMutation } from './query-options'

type ProductGalleryProps = {
  product: AdminCatalogProductDetail
  requests: CatalogRequests
  onCleanupWarning: (message: string) => void
  onDirtyChange: (dirty: boolean) => void
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
}

export function ProductGallery(props: ProductGalleryProps) {
  const queryClient = useQueryClient()
  const reorderMutation = useMutation(() => catalogMutation.reorderImages(props.requests))
  const [uploadDirty, setUploadDirty] = createSignal(false)
  const [dirtyImageIds, setDirtyImageIds] = createSignal<string[]>([])

  const setImageDirty = (imageId: string, dirty: boolean) =>
    setDirtyImageIds(current =>
      dirty ? [...new Set([...current, imageId])] : current.filter(id => id !== imageId),
    )

  createEffect(() => props.onDirtyChange(uploadDirty() || dirtyImageIds().length > 0))
  onCleanup(() => props.onDirtyChange(false))

  const reorder = async (imageId: string, direction: -1 | 1) => {
    const imageIds = props.product.images.map(image => image.id)
    const index = imageIds.indexOf(imageId)
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= imageIds.length) return
    const ordered = [...imageIds]
    const [moved] = ordered.splice(index, 1)
    if (!moved) return
    ordered.splice(destination, 0, moved)

    reorderMutation.reset()
    const result = await reorderMutation
      .mutateAsync({
        productId: props.product.id,
        input: { imageIds: ordered, expectedUpdatedAt: props.product.updatedAt },
      })
      .catch(() => undefined)
    if (!result?.isOk()) return

    await updateCatalogProductCache(queryClient, result.value)
    toast.success('Зургийн дарааллыг шинэчиллээ.')
  }

  const reload = async () => {
    reorderMutation.reset()
    setUploadDirty(false)
    setDirtyImageIds([])
    return props.onReload()
  }

  return (
    <section aria-labelledby="gallery-title" class="border-b py-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-base font-semibold" id="gallery-title">
            Зураг
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            JPEG, PNG, WebP эсвэл AVIF. Нэг зураг 10 MiB хүртэл.
          </p>
        </div>
        <span class="text-xs text-muted-foreground tabular-nums">
          {props.product.images.length} зураг
        </span>
      </div>

      <GalleryUpload
        product={props.product}
        requests={props.requests}
        onDirtyChange={setUploadDirty}
        onReload={reload}
      />

      <Show when={reorderMutation.isError || reorderMutation.data?.isErr()}>
        <div class="mt-3">
          <CatalogFailure
            failure={mutationFailure(reorderMutation)}
            onReload={() => void reload()}
            title="Зургийн дарааллыг шинэчилж чадсангүй"
            transportError={mutationTransportError(reorderMutation)}
          />
        </div>
      </Show>

      <div class="mt-4 border-y bg-card">
        <Show
          when={props.product.images.length > 0}
          fallback={
            <AdminEmptyState
              description="Анхны зургаа тайлбарын хамт оруулна уу."
              title="Барааны зураг алга"
            />
          }
        >
          <For each={props.product.images.map(image => image.id)}>
            {(imageId, index) => (
              <Show when={props.product.images.find(image => image.id === imageId)} keyed>
                {image => (
                  <GalleryImageEditor
                    image={image}
                    imageCount={props.product.images.length}
                    index={index()}
                    pendingMove={reorderMutation.isPending}
                    productId={props.product.id}
                    productUpdatedAt={props.product.updatedAt}
                    requests={props.requests}
                    variants={props.product.variants}
                    onCleanupWarning={props.onCleanupWarning}
                    onDirtyChange={dirty => setImageDirty(imageId, dirty)}
                    onMove={direction => void reorder(imageId, direction)}
                    onReload={reload}
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
