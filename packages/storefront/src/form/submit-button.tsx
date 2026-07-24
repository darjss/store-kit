import { Button, Spinner } from '@store-kit/ui'
import type { ButtonProps } from '@store-kit/ui'
import { Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

import { useFormContext } from './context'

type PendingSubmitButtonProps = ButtonProps<'button'> & {
  children?: JSX.Element
  pending: boolean
  pendingChildren?: JSX.Element
  busyLabel?: string
}

export function PendingSubmitButton(props: PendingSubmitButtonProps) {
  const [local, buttonProps] = splitProps(props, [
    'pending',
    'pendingChildren',
    'busyLabel',
    'children',
    'disabled',
  ])

  return (
    <Button<'button'>
      {...buttonProps}
      type="submit"
      disabled={local.disabled || local.pending}
      aria-busy={local.pending}
    >
      <span class="relative grid place-items-center">
        <span
          class="col-start-1 row-start-1"
          classList={{ invisible: local.pending }}
          aria-hidden={local.pending}
        >
          {local.children}
        </span>
        <Show when={local.pending}>
          <span class="absolute inset-0 inline-flex items-center justify-center gap-2">
            <Spinner aria-label={local.busyLabel ?? 'Loading'} />
            <Show when={local.pendingChildren}>{local.pendingChildren}</Show>
          </span>
        </Show>
      </span>
    </Button>
  )
}

type SubmitButtonProps = Omit<PendingSubmitButtonProps, 'pending'>

export function SubmitButton(props: SubmitButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.isSubmitting}>
      {isSubmitting => <PendingSubmitButton {...props} pending={isSubmitting()} />}
    </form.Subscribe>
  )
}
