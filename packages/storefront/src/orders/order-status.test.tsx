// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://127.0.0.1:1/" }

import type { PrivateOrderError, PublicOrder } from '@store-kit/contracts/orders'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { render } from 'solid-js/web'
import { afterEach, expect, test } from 'vite-plus/test'

import { OrderStatusRoot, orderStatusPollingInterval, useOrderStatus } from './order-status'
import type { OrderStatusContextValue } from './order-status'

const orderId = 'ord_01j00000000000000000000000'
const token = 'private-status-token'
const storageKey = `plugged:order-token:${orderId}`
const order: PublicOrder = {
  id: orderId,
  number: 'ORD-1001',
  status: 'new',
  customerName: 'Customer',
  customerPhone: '99000000',
  district: 'District',
  khoroo: '1',
  address: 'Address',
  deliveryNotes: null,
  subtotalMnt: 100_000,
  deliveryFeeMnt: 5_000,
  totalMnt: 105_000,
  createdAt: 1,
  updatedAt: 1,
  lines: [
    {
      productName: 'Product',
      variantName: 'Black',
      sku: 'SKU-1',
      options: { color: 'Black' },
      image: {
        url: 'https://media.example.com/products/product.webp',
        width: 800,
        height: 800,
        alt: 'Product',
      },
      unitPriceMnt: 100_000,
      quantity: 1,
      lineTotalMnt: 100_000,
    },
  ],
  payment: {
    method: 'bank_transfer',
    status: 'pending',
    amountMnt: 105_000,
    claimedAt: null,
    paidAt: null,
  },
}

const disposals: (() => void)[] = []

afterEach(() => {
  for (const dispose of disposals.splice(0)) dispose()
  document.body.replaceChildren()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})

const mountOrderStatus = (client: QueryClient) => {
  let context: OrderStatusContextValue | undefined

  function Probe() {
    context = useOrderStatus()
    return null
  }

  const host = document.createElement('div')
  document.body.append(host)
  disposals.push(
    render(
      () => (
        <QueryClientProvider client={client}>
          <OrderStatusRoot orderId={orderId} store="plugged">
            <Probe />
          </OrderStatusRoot>
        </QueryClientProvider>
      ),
      host,
    ),
  )

  if (!context) throw new Error('Order status context did not mount.')
  return context
}

const queryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

test('moves the private fragment token into session storage and reads cached query state', async () => {
  history.replaceState(null, '', `/orders/${orderId}#token=${encodeURIComponent(token)}`)
  const client = queryClient()
  const queryKey = ['order', orderId, token] as const
  client.setQueryData(queryKey, Result.ok<PublicOrder, PrivateOrderError>(order))

  const status = mountOrderStatus(client)
  await Promise.resolve()

  expect(sessionStorage.getItem(storageKey)).toBe(token)
  expect(location.hash).toBe('')
  expect(location.pathname).toBe(`/orders/${orderId}`)
  const state = status.state()
  expect(state).toEqual({ _tag: 'Ready', order })
  expect(state._tag === 'Ready' ? state.order.lines[0]?.image?.url : null).toBe(
    'https://media.example.com/products/product.webp',
  )
  expect(orderStatusPollingInterval(Result.ok<PublicOrder, PrivateOrderError>(order))).toBe(5_000)
  expect(
    orderStatusPollingInterval(
      Result.ok<PublicOrder, PrivateOrderError>({
        ...order,
        status: 'confirmed',
        payment: { ...order.payment!, status: 'paid', paidAt: 2 },
      }),
    ),
  ).toBe(false)
})

test('keeps the private query idle when no token is available', async () => {
  const client = queryClient()
  const status = mountOrderStatus(client)
  await Promise.resolve()

  expect(status.state()).toEqual({ _tag: 'MissingToken' })
  const query = client.getQueryCache().find({ queryKey: ['order', orderId, ''] })
  expect(query?.state.fetchStatus).toBe('idle')
})

test('hydrates from session storage without exposing the token in the URL', async () => {
  sessionStorage.setItem(storageKey, token)
  const client = queryClient()
  client.setQueryData(['order', orderId, token], Result.ok<PublicOrder, PrivateOrderError>(order))

  const status = mountOrderStatus(client)
  await Promise.resolve()

  expect(location.hash).toBe('')
  expect(status.state()).toEqual({ _tag: 'Ready', order })
  expect(status.isClaimingBankTransfer()).toBe(false)
  expect(status.isRefreshingQPay()).toBe(false)
  expect(status.isRefreshingStatus()).toBe(false)
})
