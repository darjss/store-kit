import type {
  AdminOrderDetail,
  AdminOrderError,
  AdminOrderList,
  AdminOrderListFilters,
  AdminOrderStatusUpdate,
} from '@store-kit/contracts/admin-orders'
import type { OrderStatus } from '@store-kit/contracts/orders'
import type { PaymentStatus } from '@store-kit/contracts/payments'
import type { PrivateOrderError } from '@store-kit/contracts/private-orders'
import { database } from '@store-kit/db'
import { Result } from 'better-result'

import { invalidStatusToken } from '~/errors/orders'

import { hashStatusToken } from './status-token'

type PrivateOrder = NonNullable<Awaited<ReturnType<typeof database.query.orders.findPrivate>>>

const getPrivateStatus = async (orderId: string, statusToken: string) => {
  const order = await database.query.orders.findPrivate(orderId, await hashStatusToken(statusToken))
  if (!order) return Result.err<PrivateOrder, PrivateOrderError>(invalidStatusToken())
  return Result.ok<PrivateOrder, PrivateOrderError>(order)
}

const allowedAdminTransitions = (
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): OrderStatus[] => {
  if (status === 'new')
    return paymentStatus === 'pending' || paymentStatus === 'failed' ? ['cancelled'] : []
  if (status === 'confirmed') return ['preparing']
  if (status === 'preparing') return ['delivering']
  if (status === 'delivering') return ['completed']
  return []
}

const toAdminOrderDetail = (
  order: NonNullable<Awaited<ReturnType<typeof database.query.orders.findWithPayment>>>,
): AdminOrderDetail | undefined => {
  if (!order.payment) return undefined
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    district: order.district,
    khoroo: order.khoroo,
    address: order.address,
    deliveryNotes: order.deliveryNotes,
    subtotalMnt: order.subtotalMnt,
    deliveryFeeMnt: order.deliveryFeeMnt,
    totalMnt: order.totalMnt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    lines: order.lines.map(line => ({
      productName: line.productName,
      variantName: line.variantName,
      sku: line.sku,
      options: line.options,
      unitPriceMnt: line.unitPriceMnt,
      quantity: line.quantity,
      lineTotalMnt: line.lineTotalMnt,
    })),
    payment: {
      method: order.payment.method,
      status: order.payment.status,
      amountMnt: order.payment.amountMnt,
      claimedAt: order.payment.claimedAt,
      paidAt: order.payment.paidAt,
    },
    allowedTransitions: allowedAdminTransitions(order.status, order.payment.status),
  }
}

const adminOrderNotFound = (orderId: string) => ({
  _tag: 'AdminOrderNotFound' as const,
  orderId,
  message: 'The order no longer exists.',
})

export const listAdminOrders = async (filters: AdminOrderListFilters = {}) => {
  const normalized = {
    ...filters,
    query: filters.query?.trim() || undefined,
    limit: filters.limit ?? 24,
    offset: filters.offset ?? 0,
  } satisfies AdminOrderListFilters
  return Result.ok<AdminOrderList, AdminOrderError>(
    await database.query.orders.listAdminOrders(normalized),
  )
}

export const getAdminOrder = async (orderId: string) => {
  const record = await database.query.orders.findWithPayment(orderId)
  const detail = record ? toAdminOrderDetail(record) : undefined
  return detail
    ? Result.ok<AdminOrderDetail, AdminOrderError>(detail)
    : Result.err<AdminOrderDetail, AdminOrderError>(adminOrderNotFound(orderId))
}

export const updateAdminOrderStatus = async (orderId: string, input: AdminOrderStatusUpdate) => {
  const write = await database.query.orders.updateAdminOrderStatus({
    orderId,
    ...input,
    updatedAt: Math.max(Date.now(), input.expectedUpdatedAt + 1),
  })
  if (!write.persisted?.payment)
    return Result.err<AdminOrderDetail, AdminOrderError>(adminOrderNotFound(orderId))
  if (write.persisted.updatedAt !== input.expectedUpdatedAt && !write.updated)
    return Result.err<AdminOrderDetail, AdminOrderError>({
      _tag: 'AdminOrderConflict',
      orderId,
      message: 'This order changed. Reload the current data and try again.',
    })

  if (write.updated) {
    const detail = toAdminOrderDetail(write.persisted)
    if (detail) return Result.ok<AdminOrderDetail, AdminOrderError>(detail)
  }

  const allowedStatuses = allowedAdminTransitions(
    write.persisted.status,
    write.persisted.payment.status,
  )
  return Result.err<AdminOrderDetail, AdminOrderError>({
    _tag: 'OrderStatusTransitionNotAllowed',
    currentStatus: write.persisted.status,
    requestedStatus: input.status,
    allowedStatuses,
    message: 'This order cannot move to the requested status.',
  })
}

export const orderOperations = {
  getPrivateStatus,
  listAdminOrders,
  getAdminOrder,
  updateAdminStatus: updateAdminOrderStatus,
}
