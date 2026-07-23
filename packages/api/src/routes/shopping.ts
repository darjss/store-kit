import { commerce } from '@store-kit/commerce'
import { verifyQPayCallback, verifyQPayPayment } from '@store-kit/commerce/qpay'
import { sendPaidOrderMessage } from '@store-kit/commerce/telegram'
import { orderIdPattern } from '@store-kit/contracts/orders'
import type { PrivateOrderError, PublicOrder } from '@store-kit/contracts/orders'
import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentRefresh,
  PaymentRefreshError,
} from '@store-kit/contracts/payments'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

const paymentVerificationFailed = () => ({
  _tag: 'PaymentVerificationFailed' as const,
  message: 'QPay төлбөрийг одоогоор шалгаж чадсангүй.',
  retryable: true,
})

export const shoppingRoutes = new Elysia({ aot: false, prefix: '/api' })
  .onAfterHandle(({ set }) => {
    set.headers['cache-control'] = 'private, no-store'
  })
  .post(
    '/checkout',
    async ({ body }) => Result.serialize(await commerce.checkout.createOrder(body)),
    {
      body: t.Any(),
    },
  )
  .get(
    '/orders/:id/status',
    async ({ params, headers }) => {
      const result = await commerce.orders.getPrivateStatus(
        params.id,
        headers['x-order-token'] ?? '',
      )
      if (result.status === 'error')
        return Result.serialize(Result.err<PublicOrder, PrivateOrderError>(result.error))

      const order = result.value
      return Result.serialize(
        Result.ok<PublicOrder, PrivateOrderError>({
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
            imageR2Key: line.imageR2Key,
            unitPriceMnt: line.unitPriceMnt,
            quantity: line.quantity,
            lineTotalMnt: line.lineTotalMnt,
          })),
          payment: order.payment
            ? {
                method: order.payment.method,
                status: order.payment.status,
                amountMnt: order.payment.amountMnt,
                claimedAt: order.payment.claimedAt,
                paidAt: order.payment.paidAt,
              }
            : null,
        }),
      )
    },
    {
      params: t.Object({ id: t.String({ pattern: orderIdPattern }) }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
  .post(
    '/orders/:id/payment/claim',
    async ({ params, headers }) =>
      Result.serialize<BankTransferClaim, BankTransferClaimError>(
        await commerce.payments.claimBankTransfer(params.id, headers['x-order-token'] ?? ''),
      ),
    {
      params: t.Object({ id: t.String({ pattern: orderIdPattern }) }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
  .post(
    '/orders/:id/payment/refresh',
    async ({ params, headers }) => {
      const order = await commerce.orders.getPrivateStatus(
        params.id,
        headers['x-order-token'] ?? '',
      )
      if (order.status === 'error')
        return Result.serialize(Result.err<PaymentRefresh, PaymentRefreshError>(order.error))
      const invoiceId = order.value.payment?.providerInvoiceId
      if (!invoiceId)
        return Result.serialize(
          Result.err<PaymentRefresh, PaymentRefreshError>({
            _tag: 'PaymentMismatch',
            message: 'QPay нэхэмжлэл олдсонгүй.',
          }),
        )
      const verified = await verifyQPayPayment(invoiceId)
      if (verified.status === 'error')
        return Result.serialize(
          Result.err<PaymentRefresh, PaymentRefreshError>(paymentVerificationFailed()),
        )
      if (!verified.value)
        return Result.serialize(
          Result.ok<PaymentRefresh, PaymentRefreshError>({ paymentStatus: 'pending' }),
        )
      const confirmation = await commerce.payments.confirmOrderPayment(params.id, {
        ...verified.value,
        method: 'qpay',
      })
      return confirmation.status === 'ok'
        ? Result.serialize(Result.ok<PaymentRefresh, PaymentRefreshError>(confirmation.value))
        : Result.serialize(Result.err<PaymentRefresh, PaymentRefreshError>(confirmation.error))
    },
    {
      params: t.Object({ id: t.String({ pattern: orderIdPattern }) }),
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
      const localPayment = await commerce.payments.findQPayOrder(verified.value.invoiceId)
      if (!localPayment) return { ok: true }
      {
        const confirmation = await commerce.payments.confirmOrderPayment(localPayment.orderId, {
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
