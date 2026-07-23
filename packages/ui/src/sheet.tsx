import * as Dialog from '@kobalte/core/dialog'
import type { ParentProps } from 'solid-js'

export function SheetRoot(props: Dialog.DialogRootProps) {
  return <Dialog.Root {...props} />
}

export function SheetTrigger(props: ParentProps) {
  return <Dialog.Trigger data-slot="sheet-trigger">{props.children}</Dialog.Trigger>
}

export function SheetContent(props: ParentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay data-slot="sheet-overlay" />
      <Dialog.Content data-slot="sheet-content">{props.children}</Dialog.Content>
    </Dialog.Portal>
  )
}

export function SheetTitle(props: ParentProps) {
  return <Dialog.Title data-slot="sheet-title">{props.children}</Dialog.Title>
}

export function SheetClose(props: ParentProps) {
  return <Dialog.CloseButton data-slot="sheet-close">{props.children}</Dialog.CloseButton>
}

export const Sheet = {
  Root: SheetRoot,
  Trigger: SheetTrigger,
  Content: SheetContent,
  Title: SheetTitle,
  Close: SheetClose,
}
