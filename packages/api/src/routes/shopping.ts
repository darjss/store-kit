import {
  claimBankTransfer,
  createCheckoutOrder,
  getPrivateOrderStatus,
} from '@store-kit/commerce/checkout'
import { confirmOrderPayment, findQPayOrder } from '@store-kit/commerce/payments'
import { verifyQPayCallback, verifyQPayPayment } from '@store-kit/commerce/qpay'
import { sendPaidOrderMessage } from '@store-kit/commerce/telegram'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

const line = t.Object({ variantId: t.String(), quantity: t.Integer({ minimum: 1, maximum: 10 }) })
export const shoppingRoutes = new Elysia({ aot: false, prefix: '/api' })
  .onAfterHandle(({ set }) => {
    set.headers['cache-control'] = 'private, no-store'
  })
  .post('/checkout', async ({ body }) => Result.serialize(await createCheckoutOrder(body)), {
    body: t.Object({
      items: t.Array(line, { minItems: 1, maxItems: 20 }),
      customer: t.Object({ name: t.String(), phone: t.String() }),
      delivery: t.Object({
        district: t.UnionEnum([
          'Багануур',
          'Багахангай',
          'Баянгол',
          'Баянзүрх',
          'Налайх',
          'Сонгинохайрхан',
          'Сүхбаатар',
          'Хан-Уул',
          'Чингэлтэй',
        ]),
        khoroo: t.String(),
        address: t.String(),
        notes: t.Optional(t.String()),
      }),
      paymentMethod: t.UnionEnum(['qpay', 'bank_transfer']),
    }),
  })
  .get(
    '/orders/:id/status',
    async ({ params, headers }) =>
      Result.serialize(await getPrivateOrderStatus(params.id, headers['x-order-token'] ?? '')),
    {
      params: t.Object({ id: t.String() }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
  .post(
    '/orders/:id/payment/claim',
    async ({ params, headers }) =>
      Result.serialize<unknown, unknown>(
        await claimBankTransfer(params.id, headers['x-order-token'] ?? ''),
      ),
    {
      params: t.Object({ id: t.String() }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
  .post(
    '/orders/:id/payment/refresh',
    async ({ params, headers }) => {
      const order = await getPrivateOrderStatus(params.id, headers['x-order-token'] ?? '')
      if (order.status === 'error') return Result.serialize(order)
      const invoiceId = order.value.payment?.providerInvoiceId
      if (!invoiceId)
        return Result.serialize(
          Result.err({ _tag: 'PaymentMismatch', message: 'QPay нэхэмжлэл олдсонгүй.' }),
        )
      const verified = await verifyQPayPayment(invoiceId)
      if (verified.status === 'error') return Result.serialize(verified)
      if (!verified.value) return Result.serialize(Result.ok({ paymentStatus: 'pending' as const }))
      return Result.serialize(
        await confirmOrderPayment(params.id, { ...verified.value, method: 'qpay' }),
      )
    },
    {
      params: t.Object({ id: t.String() }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
  .post(
    '/webhooks/qpay',
    async ({ body }) => {
      const verified = await verifyQPayCallback(body.payment_id)
      if (verified.status === 'error') return { ok: true }
      const localPayment = await findQPayOrder(verified.value.invoiceId)
      if (!localPayment) return { ok: true }
      {
        const confirmation = await confirmOrderPayment(localPayment.orderId, {
          paymentId: verified.value.paymentId,
          amountMnt: verified.value.amountMnt,
          method: 'qpay',
        })
        if (confirmation.status === 'ok' && confirmation.value.newlyPaid) {
          const label = confirmation.value.needsStaffAction
            ? `ЯАРАЛТАЙ: үлдэгдэл хүрэлцэхгүй · ${localPayment.orderId}`
            : localPayment.orderId
          await sendPaidOrderMessage(label, localPayment.amountMnt)
        }
      }
      return { ok: true }
    },
    { body: t.Object({ payment_id: t.String() }) },
  )
