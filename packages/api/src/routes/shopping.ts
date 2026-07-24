import { commerce } from '@store-kit/commerce'
import { normalizeCheckoutInput } from '@store-kit/commerce/checkout'
import { checkoutInputSchema } from '@store-kit/contracts/checkout'
import { orderIdPattern } from '@store-kit/contracts/orders'
import type { PublicOrder } from '@store-kit/contracts/orders'
import type {
  BankTransferClaim,
  BankTransferClaimError,
  PaymentRefresh,
  PaymentRefreshError,
} from '@store-kit/contracts/payments'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

import { nullablePublicImage } from '~/media'
import { contractBody } from '~/typebox-contract'

export const shoppingRoutes = new Elysia({ aot: false, prefix: '/api' })
  .onAfterHandle(({ set }) => {
    set.headers['cache-control'] = 'private, no-store'
  })
  .post(
    '/checkout',
    async ({ body }) => Result.serialize(await commerce.checkout.createOrder(body)),
    {
      body: contractBody(checkoutInputSchema, normalizeCheckoutInput),
    },
  )
  .get(
    '/orders/:id/status',
    async ({ params, headers }) =>
      Result.serialize(
        (await commerce.orders.getPrivateStatus(params.id, headers['x-order-token'] ?? '')).map(
          order =>
            ({
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
                image: nullablePublicImage({
                  r2Key: line.imageR2Key,
                  width: line.imageWidth,
                  height: line.imageHeight,
                  alt: line.imageAlt,
                }),
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
            }) satisfies PublicOrder,
        ),
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
    async ({ params, headers }) =>
      Result.serialize<PaymentRefresh, PaymentRefreshError>(
        await commerce.payments.refreshQPayPayment(params.id, headers['x-order-token'] ?? ''),
      ),
    {
      params: t.Object({ id: t.String({ pattern: orderIdPattern }) }),
      headers: t.Object(
        { 'x-order-token': t.Optional(t.String()) },
        { additionalProperties: true },
      ),
    },
  )
