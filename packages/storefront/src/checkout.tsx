import type { CartCorrection, CartValidationError } from '@store-kit/contracts/cart'
import type {
  CheckoutCreated,
  CheckoutDetails,
  CheckoutError,
  CheckoutInput,
} from '@store-kit/contracts/checkout'
import { checkoutDetailsSchema } from '@store-kit/contracts/checkout'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import { Result } from 'better-result'
import { match } from 'dismatch'
import { createContext, createMemo, createSignal, splitProps, useContext } from 'solid-js'
import type { Accessor, ComponentProps, JSX } from 'solid-js'

import { cartItems, cartLineInputs, clearCart, openCart } from './cart/store'
import { createFormErrorController, useAppForm } from './form'
import { cartQuery } from './query-options/cart'
import { checkoutMutation } from './query-options/checkout'
import { useMutationResult, useQueryResult } from './query-options/result'

type LocalCartChanged = {
  _tag: 'CartChanged'
  corrections: CartCorrection[]
}

export type CheckoutDomainError =
  | Exclude<CheckoutError, { _tag: 'CartChanged' }>
  | CartValidationError
  | LocalCartChanged

export type CheckoutCorrectionAction = 'open-cart' | 'retry' | 'use-bank-transfer'

type CheckoutRootProps = {
  children: JSX.Element
  defaultValues: CheckoutDetails
}

const decodePointerToken = (token: string) => token.replaceAll('~1', '/').replaceAll('~0', '~')

const jsonPointerToFieldName = (pointer: string) =>
  pointer
    .split('/')
    .slice(1)
    .map(decodePointerToken)
    .reduce(
      (name, token) =>
        /^\d+$/.test(token) ? `${name}[${token}]` : name ? `${name}.${token}` : token,
      '',
    )

const checkoutDetailsValidator = toStandardSchema(checkoutDetailsSchema)

const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').replace(/^976/, '')

export const normalizeCheckoutDetails = (details: CheckoutDetails): CheckoutDetails => {
  const notes = details.delivery.notes?.trim()
  return {
    customer: {
      name: details.customer.name.trim(),
      phone: normalizePhone(details.customer.phone),
    },
    delivery: {
      district: details.delivery.district,
      khoroo: details.delivery.khoroo.trim(),
      address: details.delivery.address.trim(),
      ...(notes ? { notes } : {}),
    },
    paymentMethod: details.paymentMethod,
  }
}

const openCartActions = (): CheckoutCorrectionAction[] => ['open-cart']

export const checkoutDomainActions = (error: CheckoutDomainError) =>
  match(
    error,
    '_tag',
  )<CheckoutCorrectionAction[]>({
    CartEmpty: () => [],
    CartChanged: openCartActions,
    InvalidCart: openCartActions,
    InvalidCheckoutDetails: () => [],
    DeliveryUnavailable: () => [],
    PaymentSetupFailed: failure =>
      failure.canUseBankTransfer ? ['retry', 'use-bank-transfer'] : ['retry'],
  })

function createCheckoutState(props: CheckoutRootProps) {
  const mutation = useMutationResult(() => checkoutMutation.create())
  const cartValidation = useQueryResult(() => ({
    ...cartQuery.validate([...cartItems()]),
    enabled: false,
  }))
  const [result, setResult] = createSignal<Result<CheckoutCreated, CheckoutDomainError>>()
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
  const errors = createFormErrorController<CheckoutDomainError, CheckoutCorrectionAction>({
    domainError,
    transportError,
    domainActions: checkoutDomainActions,
    transportActions: ['retry'],
  })

  const submit = async (details: CheckoutDetails) => {
    setResult()
    const normalizedDetails = normalizeCheckoutDetails(details)
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
              corrections: cart.corrections,
            }),
          )
          return
        }

        const input: CheckoutInput = { ...normalizedDetails, items }
        const checkoutResult = await mutation.mutateAsync(input)
        checkoutResult.match({
          err: error => {
            setResult(Result.err<CheckoutCreated, CheckoutDomainError>(error))
            if (error._tag === 'InvalidCheckoutDetails') {
              errors.focusFirstInvalid(
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
    defaultValues: props.defaultValues,
    canSubmitWhenInvalid: true,
    validators: {
      onChange: checkoutDetailsValidator,
      onBlur: checkoutDetailsValidator,
      onSubmit: checkoutDetailsValidator,
    },
    onSubmit: ({ value }) => submit(value),
    onSubmitInvalid: () => errors.focusFirstInvalid(),
  }))

  errors.setActionHandler(action => {
    if (action === 'open-cart') {
      openCart()
      return
    }
    if (action === 'use-bank-transfer') {
      form.setFieldValue('paymentMethod', 'bank_transfer')
      return
    }
    void form.handleSubmit().catch(() => undefined)
  })

  return {
    form,
    result,
    created,
    domainError,
    pending,
    transportError,
    errors,
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
    <checkout.form.AppForm>
      <form
        {...formProps}
        ref={checkout.errors.setFormElement}
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
    </checkout.form.AppForm>
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
