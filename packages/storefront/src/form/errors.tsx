import { match } from 'dismatch'
import { createMemo, createSignal } from 'solid-js'
import type { Accessor, JSX } from 'solid-js'

import { useFieldContext, useFormContext } from './context'

export type FieldErrorState = {
  visible: boolean
  errors: unknown[]
}

export type FormErrorSummaryItem = {
  name: string
  errors: unknown[]
}

export type FormErrorSummaryState = {
  visible: boolean
  items: FormErrorSummaryItem[]
}

export const fieldErrorIsVisible = (isTouched: boolean, submissionAttempts: number) =>
  isTouched || submissionAttempts > 0

type FieldErrorStateProps = {
  children: (state: Accessor<FieldErrorState>) => JSX.Element
}

export function FormFieldErrorState(props: FieldErrorStateProps) {
  const field = useFieldContext<unknown>()
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.submissionAttempts}>
      {submissionAttempts =>
        props.children(() => {
          const meta = field().state.meta
          return {
            visible: !meta.isValid && fieldErrorIsVisible(meta.isTouched, submissionAttempts()),
            errors: meta.errors,
          }
        })
      }
    </form.Subscribe>
  )
}

type FormErrorSummaryProps = {
  children: (state: Accessor<FormErrorSummaryState>) => JSX.Element
}

export function FormErrorSummary(props: FormErrorSummaryProps) {
  const form = useFormContext()

  return (
    <form.Subscribe
      selector={state => ({
        fieldMeta: state.fieldMeta,
        submissionAttempts: state.submissionAttempts,
      })}
    >
      {formState =>
        props.children(() => {
          const state = formState()
          const fieldMeta = state.fieldMeta as Record<string, { errors: unknown[] } | undefined>
          const items = Object.entries(fieldMeta).flatMap(([name, meta]) =>
            meta && meta.errors.length > 0 ? [{ name, errors: meta.errors }] : [],
          )

          return {
            visible: state.submissionAttempts > 0 && items.length > 0,
            items,
          }
        })
      }
    </form.Subscribe>
  )
}

type FormFailureState<DomainError, Action> =
  | { type: 'none' }
  | { type: 'transport'; error: unknown; actions: Action[] }
  | { type: 'domain'; error: DomainError; actions: Action[] }

type FormErrorControllerOptions<DomainError, Action> = {
  domainError: Accessor<DomainError | undefined>
  transportError: Accessor<unknown>
  domainActions: (error: DomainError) => Action[]
  transportActions: Action[]
}

export function createFormErrorController<DomainError, Action>(
  options: FormErrorControllerOptions<DomainError, Action>,
) {
  let formElement: HTMLFormElement | undefined
  let summaryElement: HTMLElement | undefined
  let actionHandler: ((action: Action) => void | Promise<void>) | undefined
  const [focusTarget, setFocusTarget] = createSignal<string>()

  const state = createMemo<FormFailureState<DomainError, Action>>(() => {
    const domainError = options.domainError()
    const transportError = options.transportError()
    const outcome: FormFailureState<DomainError, Action> =
      domainError !== undefined
        ? {
            type: 'domain',
            error: domainError,
            actions: options.domainActions(domainError),
          }
        : transportError
          ? { type: 'transport', error: transportError, actions: options.transportActions }
          : { type: 'none' }

    return match(
      outcome,
      'type',
    )<FormFailureState<DomainError, Action>>({
      domain: ({ error, actions }) => ({ type: 'domain', error, actions }),
      transport: ({ error, actions }) => ({ type: 'transport', error, actions }),
      none: () => ({ type: 'none' }),
    })
  })

  const focusFirstInvalid = (name?: string) => {
    setFocusTarget(name ?? 'first-invalid')
    queueMicrotask(() => {
      const controls = formElement?.querySelectorAll<HTMLElement>('[name]') ?? []
      const namedControl = name
        ? [...controls].find(control => control.getAttribute('name') === name)
        : undefined
      const firstInvalid =
        namedControl ??
        [...controls].find(control => control.getAttribute('aria-invalid') === 'true')

      ;(firstInvalid ?? summaryElement)?.focus()
    })
  }

  return {
    state,
    focusTarget,
    focusFirstInvalid,
    performAction: (action: Action) => actionHandler?.(action),
    setActionHandler: (handler: (action: Action) => void | Promise<void>) => {
      actionHandler = handler
    },
    setFormElement: (element: HTMLFormElement) => {
      formElement = element
    },
    setSummaryElement: (element: HTMLElement) => {
      summaryElement = element
    },
  }
}
