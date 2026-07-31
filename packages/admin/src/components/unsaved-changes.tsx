import type { Accessor } from 'solid-js'
import { onCleanup, onMount } from 'solid-js'

export function UnsavedChangesGuard(props: { isDirty: Accessor<boolean> }) {
  onMount(() => {
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      if (!props.isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventAccidentalExit)
    onCleanup(() => window.removeEventListener('beforeunload', preventAccidentalExit))
  })
  return null
}
