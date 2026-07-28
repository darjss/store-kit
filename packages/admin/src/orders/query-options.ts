import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderList,
  AdminOrderListFilters,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { deserializeResult } from '../query-options/result'
import type { ResultResponse } from '../query-options/result'

export type OrderResultResponse<Value> = ResultResponse<Value, AdminOrderError>

export type OrderRequests = {
  listOrders: (filters: AdminOrderListFilters) => Promise<OrderResultResponse<AdminOrderList>>
  getOrder: (orderId: string) => Promise<OrderResultResponse<AdminOrderDetail>>
  updateStatus: (
    orderId: string,
    input: AdminOrderStatusUpdate,
  ) => Promise<OrderResultResponse<AdminOrderDetail>>
}

const deserialize = <Value>(request: Promise<OrderResultResponse<Value>>) =>
  deserializeResult(request, 'order')

export const orderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: AdminOrderListFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (orderId: string) => [...orderKeys.details(), orderId] as const,
}

const list = (requests: OrderRequests, filters: AdminOrderListFilters) =>
  queryOptions({
    queryKey: orderKeys.list(filters),
    queryFn: () => deserialize(requests.listOrders(filters)),
    retry: false,
  })

const detail = (requests: OrderRequests, orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => deserialize(requests.getOrder(orderId)),
    retry: false,
  })

const updateStatus = (requests: OrderRequests) =>
  mutationOptions({
    mutationFn: ({ orderId, input }: { orderId: string; input: AdminOrderStatusUpdate }) =>
      deserialize(requests.updateStatus(orderId, input)),
  })

export const orderQuery = { list, detail }
export const orderMutation = { updateStatus }
