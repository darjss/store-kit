import type { PublicOrder } from '@store-kit/contracts/orders'
import type {
  BankTransferClaimError,
  PaymentRefresh,
  PaymentRefreshError,
  PaymentStatus,
} from '@store-kit/contracts/payments'
import { Result } from 'better-result'
import type { Result as BetterResult } from 'better-result'
import { match } from 'dismatch'
import { createContext, createMemo, createSignal, onMount, useContext } from 'solid-js'
import type { Accessor, JSX, ParentProps } from 'solid-js'

import { orderQuery } from '~/query-options/orders'
import { paymentMutation } from '~/query-options/payments'
import { useMutationResult, useQueryResult } from '~/query-options/result'
import { shouldPollOrderStatus } from '~/status'
import { privateOrderStorageKey } from '~/storage'

const pollingInterval = 5_000

export const orderStatusPollingInterval = (
  result: BetterResult<PublicOrder, unknown> | undefined,
) =>
  result?.match<number | false>({
    err: () => false,
    ok: order => (shouldPollOrderStatus(order) ? pollingInterval : false),
  }) ?? false

const paymentStatuses = {
  pending: { type: 'pending' },
  claimed: { type: 'claimed' },
  paid: { type: 'paid' },
} as const

export type OrderStatusState =
  | { _tag: 'Hydrating' }
  | { _tag: 'MissingToken' }
  | { _tag: 'Loading' }
  | { _tag: 'TransportError' }
  | { _tag: 'InvalidStatusToken' }
  | { _tag: 'Ready'; order: PublicOrder }

export type BankTransferClaimOutcome =
  | { _tag: 'BankTransferPending' }
  | { _tag: 'BankTransferClaimed' }
  | { _tag: 'BankTransferPaid' }

export type BankTransferClaimFailure =
  | { _tag: 'InvalidStatusToken' }
  | { _tag: 'BankTransferClaimNotAllowed'; paymentStatus: PaymentStatus }
  | { _tag: 'StaffNotificationFailed'; retryable: boolean }
  | { _tag: 'TransportError' }

export type QPayRefreshOutcome =
  | { _tag: 'PaymentPending' }
  | { _tag: 'PaymentConfirmed' }
  | { _tag: 'PaymentNeedsStaffAction' }

export type QPayRefreshFailure =
  | { _tag: 'InvalidStatusToken' }
  | { _tag: 'PaymentVerificationFailed'; retryable: boolean }
  | { _tag: 'PaymentMismatch' }
  | { _tag: 'InsufficientStock'; variantIds: string[] }
  | { _tag: 'TransportError' }

type ClaimResult = BetterResult<BankTransferClaimOutcome, BankTransferClaimFailure>
type RefreshResult = BetterResult<QPayRefreshOutcome, QPayRefreshFailure>

export type OrderStatusContextValue = {
  state: Accessor<OrderStatusState>
  claimOutcome: Accessor<ClaimResult | undefined>
  refreshOutcome: Accessor<RefreshResult | undefined>
  isRefreshingStatus: Accessor<boolean>
  isClaimingBankTransfer: Accessor<boolean>
  isRefreshingQPay: Accessor<boolean>
  refreshStatus: () => Promise<unknown>
  claimBankTransfer: () => Promise<ClaimResult>
  refreshQPay: () => Promise<RefreshResult>
}

const OrderStatusContext = createContext<OrderStatusContextValue>()

const claimSuccess = (paymentStatus: keyof typeof paymentStatuses) =>
  match(paymentStatuses[paymentStatus])<BankTransferClaimOutcome>({
    pending: () => ({ _tag: 'BankTransferPending' }),
    claimed: () => ({ _tag: 'BankTransferClaimed' }),
    paid: () => ({ _tag: 'BankTransferPaid' }),
  })

const claimFailure = (error: BankTransferClaimError) =>
  match(
    error,
    '_tag',
  )<BankTransferClaimFailure>({
    InvalidStatusToken: () => ({ _tag: 'InvalidStatusToken' }),
    BankTransferClaimNotAllowed: ({ paymentStatus }) => ({
      _tag: 'BankTransferClaimNotAllowed',
      paymentStatus,
    }),
    StaffNotificationFailed: ({ retryable }) => ({
      _tag: 'StaffNotificationFailed',
      retryable,
    }),
  })

const refreshSuccessState = (value: PaymentRefresh) => {
  if (value.paymentStatus === 'pending') return { type: 'pending' } as const
  return value.needsStaffAction
    ? ({ type: 'needs-staff-action' } as const)
    : ({ type: 'confirmed' } as const)
}

const refreshSuccess = (value: PaymentRefresh) =>
  match(refreshSuccessState(value))<QPayRefreshOutcome>({
    'pending': () => ({ _tag: 'PaymentPending' }),
    'confirmed': () => ({ _tag: 'PaymentConfirmed' }),
    'needs-staff-action': () => ({ _tag: 'PaymentNeedsStaffAction' }),
  })

const refreshFailure = (error: PaymentRefreshError) =>
  match(
    error,
    '_tag',
  )<QPayRefreshFailure>({
    InvalidStatusToken: () => ({ _tag: 'InvalidStatusToken' }),
    PaymentVerificationFailed: ({ retryable }) => ({
      _tag: 'PaymentVerificationFailed',
      retryable,
    }),
    PaymentMismatch: () => ({ _tag: 'PaymentMismatch' }),
    InsufficientStock: ({ variantIds }) => ({ _tag: 'InsufficientStock', variantIds }),
  })

export function OrderStatusRoot(
  props: ParentProps<{ orderId: string; store: string; children?: JSX.Element }>,
) {
  const storageKey = privateOrderStorageKey(props.store, props.orderId)
  const [token, setToken] = createSignal<string>()
  const [claimOutcome, setClaimOutcome] = createSignal<ClaimResult>()
  const [refreshOutcome, setRefreshOutcome] = createSignal<RefreshResult>()
  const status = useQueryResult(() => ({
    ...orderQuery.findPrivateStatus(props.orderId, token() ?? ''),
    enabled: Boolean(token()),
    retry: false,
    refetchInterval: query => orderStatusPollingInterval(query.state.data),
    refetchIntervalInBackground: false,
  }))
  const claim = useMutationResult(() => paymentMutation.claimBankTransfer())
  const refresh = useMutationResult(() => paymentMutation.refreshQPay())

  onMount(() => {
    const fragment = new URLSearchParams(location.hash.slice(1))
    const fragmentToken = fragment.get('token')
    if (fragmentToken) {
      sessionStorage.setItem(storageKey, fragmentToken)
      history.replaceState(history.state, '', location.pathname + location.search)
    }
    setToken(fragmentToken ?? sessionStorage.getItem(storageKey) ?? '')
  })

  const state = createMemo<OrderStatusState>(() =>
    match(
      token() === undefined
        ? { type: 'hydrating' as const }
        : !token()
          ? { type: 'missing-token' as const }
          : status.data
            ? { type: 'result' as const, result: status.data }
            : status.isError
              ? { type: 'transport-error' as const }
              : { type: 'loading' as const },
    )<OrderStatusState>({
      'hydrating': () => ({ _tag: 'Hydrating' }),
      'missing-token': () => ({ _tag: 'MissingToken' }),
      'result': ({ result }) =>
        result.match<OrderStatusState>({
          err: () => ({ _tag: 'InvalidStatusToken' }),
          ok: order => ({ _tag: 'Ready', order }),
        }),
      'transport-error': () => ({ _tag: 'TransportError' }),
      'loading': () => ({ _tag: 'Loading' }),
    }),
  )

  const refreshStatus = async () => status.refetch()

  const claimBankTransfer = async () => {
    setClaimOutcome()
    setRefreshOutcome()
    try {
      const outcome = (await claim.mutateAsync({ orderId: props.orderId, token: token() ?? '' }))
        .map(({ paymentStatus }) => claimSuccess(paymentStatus))
        .mapError(claimFailure)
      setClaimOutcome(outcome)
      await status.refetch()
      return outcome
    } catch {
      const outcome = Result.err<BankTransferClaimOutcome, BankTransferClaimFailure>({
        _tag: 'TransportError',
      })
      setClaimOutcome(outcome)
      return outcome
    }
  }

  const refreshQPay = async () => {
    setClaimOutcome()
    setRefreshOutcome()
    try {
      const outcome = (await refresh.mutateAsync({ orderId: props.orderId, token: token() ?? '' }))
        .map(refreshSuccess)
        .mapError(refreshFailure)
      setRefreshOutcome(outcome)
      await status.refetch()
      return outcome
    } catch {
      const outcome = Result.err<QPayRefreshOutcome, QPayRefreshFailure>({
        _tag: 'TransportError',
      })
      setRefreshOutcome(outcome)
      return outcome
    }
  }

  const value: OrderStatusContextValue = {
    state,
    claimOutcome,
    refreshOutcome,
    isRefreshingStatus: () => status.isFetching,
    isClaimingBankTransfer: () => claim.isPending,
    isRefreshingQPay: () => refresh.isPending,
    refreshStatus,
    claimBankTransfer,
    refreshQPay,
  }

  return <OrderStatusContext.Provider value={value}>{props.children}</OrderStatusContext.Provider>
}

export function useOrderStatus() {
  const context = useContext(OrderStatusContext)
  if (!context) throw new Error('useOrderStatus must be used inside OrderStatus.Root.')
  return context
}

export const OrderStatus = { Root: OrderStatusRoot, useContext: useOrderStatus }
