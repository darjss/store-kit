import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@store-kit/ui'
import { useBlocker } from '@tanstack/solid-router'
import type { Accessor } from 'solid-js'

export function UnsavedChangesGuard(props: {
  isDirty: Accessor<boolean>
  includeSearchChanges?: boolean
}) {
  const blocker = useBlocker({
    enableBeforeUnload: props.isDirty,
    shouldBlockFn: ({ current, next }) =>
      props.isDirty() &&
      (Boolean(props.includeSearchChanges) || current.pathname !== next.pathname),
    withResolver: true,
  })

  return (
    <Dialog
      open={blocker().status === 'blocked'}
      onOpenChange={open => {
        const pending = blocker()
        if (!open && pending.status === 'blocked') pending.reset()
      }}
    >
      <DialogContent class="max-w-md rounded-lg border bg-popover p-4">
        <DialogHeader>
          <DialogTitle>Хадгалаагүй өөрчлөлтийг орхих уу?</DialogTitle>
          <DialogDescription>Энэ хуудсанд оруулсан хадгалаагүй мэдээлэл арилна.</DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-5">
          <Button
            onClick={() => {
              const pending = blocker()
              if (pending.status === 'blocked') pending.reset()
            }}
            type="button"
            variant="outline"
          >
            Үргэлжлүүлэн засах
          </Button>
          <Button
            onClick={() => {
              const pending = blocker()
              if (pending.status === 'blocked') pending.proceed()
            }}
            type="button"
            variant="destructive"
          >
            Өөрчлөлтийг орхих
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
