import type { CartValidationError } from '@store-kit/contracts/cart'
import type {
  CheckoutCreated,
  CheckoutDetails,
  CheckoutError,
  CheckoutInput,
} from '@store-kit/contracts/checkout'
import { checkoutDetailsSchema } from '@store-kit/contracts/checkout'
import { Result } from 'better-result'
import { createContext, createMemo, createSignal, splitProps, useContext } from 'solid-js'
import type { Accessor, ComponentProps, JSX } from 'solid-js'

import { cartItems, cartLineInputs, clearCart } from './cart/store'
import { useAppForm } from './form'
import { jsonPointerToFieldName, typeboxValidator } from './form/typebox-validator'
import { cartQuery } from './query-options/cart'
import { checkoutMutation } from './query-options/checkout'
import { useMutationResult, useQueryResult } from './query-options/result'

const defaultCheckoutDetails = {
  customer: { name: '', phone: '' },
  delivery: {
    district: 'Баянзүрх',
    khoroo: '',
    address: '',
    notes: '',
  },
  paymentMethod: 'qpay',
} satisfies CheckoutDetails

export type CheckoutDomainError = CheckoutError | CartValidationError

type CheckoutRootProps = {
  children: JSX.Element
  defaultValues?: CheckoutDetails
}

const focusControl = (form: HTMLFormElement | undefined, name?: string) => {
  queueMicrotask(() => {
    const control = name
      ? [...(form?.querySelectorAll<HTMLElement>('[name]') ?? [])].find(
          candidate => candidate.getAttribute('name') === name,
        )
      : form?.querySelector<HTMLElement>('[aria-invalid="true"]')
    control?.focus()
  })
}

function createCheckoutState(props: CheckoutRootProps) {
  const mutation = useMutationResult(() => checkoutMutation.create())
  const cartValidation = useQueryResult(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: false,
  }))
  const [result, setResult] = createSignal<Result<CheckoutCreated, CheckoutDomainError>>()
  let formElement: HTMLFormElement | undefined

  const submit = async (details: CheckoutDetails) => {
    setResult()
    const items = cartLineInputs()
    const cartResponse = await cartValidation.refetch()
    if (cartResponse.error || !cartResponse.data) return

    await cartResponse.data.match<Promise<void>>({
      err: async error => {
        setResult(Result.err<CheckoutCreated, CheckoutDomainError>(error))
      },
      ok: async cart => {
        if (cart.corrections.length > 0) {
          setResult(
            Result.err<CheckoutCreated, CheckoutDomainError>({
              _tag: 'CartChanged',
              message: 'Сагсны бараа өөрчлөгдсөн байна.',
              corrections: cart.corrections,
            }),
          )
          return
        }

        const input: CheckoutInput = { ...details, items }
        const checkoutResult = await mutation.mutateAsync(input)
        checkoutResult.match({
          err: error => {
            setResult(Result.err<CheckoutCreated, CheckoutDomainError>(error))
            if (error._tag === 'InvalidCheckoutDetails') {
              focusControl(
                formElement,
                error.fields[0] ? jsonPointerToFieldName(error.fields[0].path) : undefined,
              )
            }
          },
          ok: order => {
            clearCart()
            setResult(Result.ok<CheckoutCreated, CheckoutDomainError>(order))
          },
        })
      },
    })
  }

  const form = useAppForm(() => ({
    defaultValues: props.defaultValues ?? defaultCheckoutDetails,
    canSubmitWhenInvalid: true,
    validators: {
      onChange: typeboxValidator(checkoutDetailsSchema),
      onBlur: typeboxValidator(checkoutDetailsSchema),
      onSubmit: typeboxValidator(checkoutDetailsSchema),
    },
    onSubmit: ({ value }) => submit(value),
    onSubmitInvalid: () => focusControl(formElement),
  }))

  const created = createMemo(() =>
    result()?.match({
      err: () => undefined,
      ok: value => value,
    }),
  )
  const domainError = createMemo(() =>
    result()?.match({
      err: error => error,
      ok: () => undefined,
    }),
  )
  const pending = () => mutation.isPending || cartValidation.isFetching
  const transportError = () => mutation.error ?? cartValidation.error

  return {
    form,
    result,
    created,
    domainError,
    pending,
    transportError,
    setFormElement: (element: HTMLFormElement) => {
      formElement = element
    },
  }
}

type CheckoutContextValue = ReturnType<typeof createCheckoutState>
const CheckoutContext = createContext<CheckoutContextValue>()

export function useCheckout() {
  const checkout = useContext(CheckoutContext)
  if (!checkout) throw new Error('Checkout components must be inside Checkout.Root.')
  return checkout
}

function CheckoutRoot(props: CheckoutRootProps) {
  const checkout = createCheckoutState(props)
  return <CheckoutContext.Provider value={checkout}>{props.children}</CheckoutContext.Provider>
}

type CheckoutFormProps = Omit<ComponentProps<'form'>, 'onSubmit' | 'ref'>

function CheckoutForm(props: CheckoutFormProps) {
  const checkout = useCheckout()
  const [local, formProps] = splitProps(props, ['children'])

  return (
    <form
      {...formProps}
      ref={checkout.setFormElement}
      noValidate
      aria-busy={checkout.pending()}
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void checkout.form.handleSubmit().catch(() => undefined)
      }}
    >
      {local.children}
    </form>
  )
}

type CheckoutFormApi = CheckoutContextValue['form']
type CheckoutFieldProps = Parameters<CheckoutFormApi['AppField']>[0]

function CheckoutField(props: CheckoutFieldProps) {
  const checkout = useCheckout()
  return <checkout.form.AppField {...props} />
}

type CheckoutSubmitState = Accessor<{ pending: boolean; canSubmit: boolean }>
type CheckoutSubmitProps = {
  children: (state: CheckoutSubmitState) => JSX.Element
}

function CheckoutSubmit(props: CheckoutSubmitProps) {
  const checkout = useCheckout()

  return (
    <checkout.form.Subscribe
      selector={state => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
    >
      {formState =>
        props.children(() => ({
          pending: formState().isSubmitting || checkout.pending(),
          canSubmit: formState().canSubmit,
        }))
      }
    </checkout.form.Subscribe>
  )
}

export const Checkout = {
  Root: CheckoutRoot,
  Form: CheckoutForm,
  Field: CheckoutField,
  Submit: CheckoutSubmit,
}
