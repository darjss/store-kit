import type { OrderStatus, PublicOrderPayment } from '@store-kit/contracts/orders'
import type { PaymentStatus } from '@store-kit/contracts/payments'

const orderStatusLabels = {
  new: 'Төлбөр хүлээж байна',
  confirmed: 'Баталгаажсан',
  preparing: 'Бэлтгэж байна',
  delivering: 'Хүргэлтэд гарсан',
  completed: 'Хүлээлгэн өгсөн',
  cancelled: 'Цуцлагдсан',
} satisfies Record<OrderStatus, string>

const paymentStatusLabels = {
  pending: 'Төлбөр хүлээж байна',
  claimed: 'Шилжүүлгийг шалгаж байна',
  confirming: 'Баталгаажуулж байна',
  paid: 'Төлөгдсөн',
  failed: 'Төлбөр амжилтгүй',
} satisfies Record<PaymentStatus, string>

export const orderStatusLabel = (status: OrderStatus) => orderStatusLabels[status]
export const paymentStatusLabel = (status: PaymentStatus) => paymentStatusLabels[status]

export const shouldPollOrderStatus = (order: {
  status: OrderStatus
  payment: Pick<PublicOrderPayment, 'status'> | null
}) =>
  order.status !== 'completed' &&
  order.status !== 'cancelled' &&
  (order.payment?.status === 'pending' || order.payment?.status === 'claimed')
