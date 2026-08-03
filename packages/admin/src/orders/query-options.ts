import type {
  AdminOrderListFilters,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { deserializeResult } from '../query-options/result'

export const orderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: AdminOrderListFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (orderId: string) => [...orderKeys.details(), orderId] as const,
}

const list = (filters: AdminOrderListFilters) =>
  queryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: () => deserializeResult(api.api.admin.orders.get({ query: filters }), 'order'),
    retry: false,
  })

const detail = (orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => deserializeResult(api.api.admin.orders({ orderId }).get(), 'order'),
    retry: false,
  })

const updateStatus = () =>
  mutationOptions({
    mutationFn: ({ orderId, input }: { orderId: string; input: AdminOrderStatusUpdate }) =>
      deserializeResult(api.api.admin.orders({ orderId }).status.patch(input), 'order'),
  })

export const orderQuery = { list, detail }
export const orderMutation = { updateStatus }
