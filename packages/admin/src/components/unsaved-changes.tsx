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
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            Your local product, image, or variant edits will be lost.
          </DialogDescription>
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
            Keep editing
          </Button>
          <Button
            onClick={() => {
              const pending = blocker()
              if (pending.status === 'blocked') pending.proceed()
            }}
            type="button"
            variant="destructive"
          >
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
