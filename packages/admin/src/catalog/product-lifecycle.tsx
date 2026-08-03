import { Archive, Restart, TrashBinTrash } from '@solar-icons/solid/Linear'
import type { AdminCatalogProductDetail, MediaCleanup } from '@store-kit/contracts/admin-catalog'
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
  FieldLabel,
  Input,
  Spinner,
} from '@store-kit/ui'
import { createForm } from '@tanstack/solid-form'
import { useMutation, useQueryClient } from '@tanstack/solid-query'
import { Show, createSignal } from 'solid-js'
import { toast } from 'solid-sonner'

import { updateCatalogProductCache } from './cache'
import { CatalogFailure, mutationFailure, mutationTransportError } from './errors'
import { catalogKeys, catalogMutation } from './query-options'

export type LifecycleActionsProps = {
  product: AdminCatalogProductDetail
  disabled?: boolean
  onReload: () => Promise<AdminCatalogProductDetail | undefined>
  onDeleted: (cleanup: MediaCleanup) => void
}

export function LifecycleActions(props: LifecycleActionsProps) {
  const queryClient = useQueryClient()
  const archiveMutation = useMutation(() => catalogMutation.archiveProduct())
  const restoreMutation = useMutation(() => catalogMutation.restoreProduct())
  const deleteMutation = useMutation(() => catalogMutation.deleteProduct())
  const [deleteOpen, setDeleteOpen] = createSignal(false)
  const confirmationForm = createForm(() => ({
    defaultValues: { confirmation: '' },
  }))
  const confirmation = confirmationForm.useSelector(state => state.values.confirmation)
  const resetMutations = () => {
    archiveMutation.reset()
    restoreMutation.reset()
    deleteMutation.reset()
  }

  const archive = async () => {
    resetMutations()
    const result = await archiveMutation
      .mutateAsync({
        productId: props.product.id,
        input: { expectedUpdatedAt: props.product.updatedAt },
      })
      .catch(() => undefined)
    if (!result?.isOk()) return
    await updateCatalogProductCache(queryClient, result.value)
    toast.success('Барааг архивлалаа.')
  }

  const restore = async () => {
    resetMutations()
    const result = await restoreMutation
      .mutateAsync({
        productId: props.product.id,
        input: { expectedUpdatedAt: props.product.updatedAt },
      })
      .catch(() => undefined)
    if (!result?.isOk()) return
    await updateCatalogProductCache(queryClient, result.value)
    toast.success('Барааг ноорог төлөвт сэргээв.')
  }

  const remove = async () => {
    resetMutations()
    const result = await deleteMutation
      .mutateAsync({
        productId: props.product.id,
        input: { expectedUpdatedAt: props.product.updatedAt },
      })
      .catch(() => undefined)
    setDeleteOpen(false)
    if (!result?.isOk()) return

    queryClient.removeQueries({ queryKey: catalogKeys.detail(props.product.id) })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.publicProducts }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
    ])
    props.onDeleted(result.value.mediaCleanup)
  }

  const failure = () =>
    mutationFailure(archiveMutation) ??
    mutationFailure(restoreMutation) ??
    mutationFailure(deleteMutation)
  const requestError = () =>
    mutationTransportError(archiveMutation) ??
    mutationTransportError(restoreMutation) ??
    mutationTransportError(deleteMutation)

  return (
    <section aria-labelledby="lifecycle-title">
      <h2 class="text-base font-semibold" id="lifecycle-title">
        Барааны үйлдэл
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">Архивласан барааг дараа нь сэргээж болно.</p>
      <Show when={props.disabled}>
        <p class="mt-2 text-sm text-(--admin-warning-foreground)">
          Төлөв өөрчлөхөөс өмнө бараа болон зургийн засвараа хадгална уу.
        </p>
      </Show>
      <div class="mt-3 space-y-2">
        <Show
          when={props.product.status === 'archived'}
          fallback={
            <Button
              class="min-h-12! w-full justify-start md:h-9!"
              disabled={props.disabled || archiveMutation.isPending}
              onClick={() => void archive()}
              type="button"
              variant="outline"
            >
              {archiveMutation.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <Archive aria-hidden="true" />
              )}
              {archiveMutation.isPending ? 'Архивлаж байна…' : 'Барааг архивлах'}
            </Button>
          }
        >
          <Button
            class="min-h-12! w-full justify-start md:h-9!"
            disabled={props.disabled || restoreMutation.isPending}
            onClick={() => void restore()}
            type="button"
            variant="outline"
          >
            {restoreMutation.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <Restart aria-hidden="true" />
            )}
            {restoreMutation.isPending ? 'Сэргээж байна…' : 'Ноорог төлөвт сэргээх'}
          </Button>
          <Button
            class="min-h-12! w-full justify-start md:h-9!"
            disabled={props.disabled}
            onClick={() => setDeleteOpen(true)}
            type="button"
            variant="destructive"
          >
            <TrashBinTrash aria-hidden="true" />
            Бүрмөсөн устгах
          </Button>
        </Show>
      </div>

      <Show when={failure() || requestError()}>
        <div class="mt-3">
          <CatalogFailure
            failure={failure()}
            onReload={() => void props.onReload()}
            title="Үйлдлийг гүйцэтгэж чадсангүй"
            transportError={requestError()}
          />
        </div>
      </Show>

      <Dialog
        open={deleteOpen()}
        onOpenChange={open => {
          setDeleteOpen(open)
          if (!open) confirmationForm.reset()
        }}
      >
        <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
          <DialogHeader>
            <DialogTitle>Барааг бүрмөсөн устгах уу?</DialogTitle>
            <DialogDescription>
              “{props.product.name}” каталогоос устна. Өмнөх захиалгын мэдээлэл хэвээр үлдэнэ.
            </DialogDescription>
          </DialogHeader>
          <confirmationForm.Field name="confirmation">
            {field => (
              <Field class="mt-4">
                <FieldLabel for="delete-product-confirmation">
                  Баталгаажуулахын тулд УСТГАХ гэж оруулна уу
                </FieldLabel>
                <Input
                  class="font-mono"
                  id="delete-product-confirmation"
                  value={field().state.value}
                  onInput={event => field().handleChange(event.currentTarget.value)}
                />
                <FieldDescription>УСТГАХ</FieldDescription>
              </Field>
            )}
          </confirmationForm.Field>
          <DialogFooter class="mt-5">
            <DialogClose as={Button} type="button" variant="outline">
              Болих
            </DialogClose>
            <Button
              disabled={confirmation() !== 'УСТГАХ' || deleteMutation.isPending}
              onClick={() => void remove()}
              type="button"
              variant="destructive"
            >
              {deleteMutation.isPending ? 'Устгаж байна…' : 'Бүрмөсөн устгах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
