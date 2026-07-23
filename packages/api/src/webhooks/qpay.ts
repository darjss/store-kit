import { commerce } from '@store-kit/commerce'
import { verifyQPayCallback } from '@store-kit/commerce/qpay'
import { sendPaidOrderMessage } from '@store-kit/commerce/telegram'
import { Elysia, t } from 'elysia'

export const qpayWebhook = new Elysia({ aot: false, prefix: '/api/webhooks' }).post(
  '/qpay',
  async ({ body, set }) => {
    set.headers['cache-control'] = 'no-store'
    const verified = await verifyQPayCallback(body.payment_id)
    if (verified.status === 'error') return { ok: true }

    const localPayment = await commerce.payments.findQPayOrder(verified.value.invoiceId)
    if (!localPayment) return { ok: true }

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
    return { ok: true }
  },
  { body: t.Object({ payment_id: t.String() }) },
)
