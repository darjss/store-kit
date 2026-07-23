import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../client'
import { product, productImage, productVariant, productVariantImage } from '../schema/catalog'
import { order, orderLine, payment } from '../schema/shopping'
import type { CartLineInput, NewOrder, NewOrderLine, NewPayment } from '../schemas/shopping'

export type NewOrderAggregate = {
  order: NewOrder
  lines: NewOrderLine[]
  payment: NewPayment
}

export const findCartVariants = async (items: CartLineInput[]) => {
  if (items.length === 0) return []
  const variantIds = [...new Set(items.map(item => item.variantId))]

  return db
    .select({
      variantId: productVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productStatus: product.status,
      variantName: productVariant.name,
      sku: productVariant.sku,
      options: productVariant.options,
      unitPriceMnt: productVariant.priceMnt,
      stockQuantity: productVariant.stockQuantity,
      active: productVariant.active,
      imageR2Key: sql<string | null>`coalesce(
        (
          select ${productImage.r2Key} from ${productVariantImage}
          inner join ${productImage} on ${productImage.id} = ${productVariantImage.imageId}
          where ${productVariantImage.variantId} = ${productVariant.id}
          order by ${productImage.sortOrder}
          limit 1
        ),
        (
          select ${productImage.r2Key} from ${productImage}
          where ${productImage.productId} = ${product.id}
          order by ${productImage.sortOrder}
          limit 1
        )
      )`,
    })
    .from(productVariant)
    .innerJoin(product, eq(productVariant.productId, product.id))
    .where(inArray(productVariant.id, variantIds))
    .orderBy(productVariant.id)
}

export const findCheckoutSettings = () =>
  db.query.checkoutSettings.findFirst({ where: { id: 'default' } })

export const insertOrderWithLinesAndPayment = async (aggregate: NewOrderAggregate) => {
  await db.batch([
    db.insert(order).values(aggregate.order),
    ...aggregate.lines.map(line => db.insert(orderLine).values(line)),
    db.insert(payment).values(aggregate.payment),
  ])
}

export const findPrivateOrder = (id: string, statusTokenHash: string) =>
  db.query.order.findFirst({
    where: { id, statusTokenHash },
    with: { lines: true, payment: true },
  })

export const findOrderByNumber = (number: string) => db.query.order.findFirst({ where: { number } })

export const markBankTransferClaimed = async (orderId: string, claimedAt: number) => {
  const [updated] = await db
    .update(payment)
    .set({ status: 'claimed', claimedAt, updatedAt: claimedAt })
    .where(
      and(
        eq(payment.orderId, orderId),
        eq(payment.method, 'bank_transfer'),
        eq(payment.status, 'pending'),
      ),
    )
    .returning()
  return updated
}

export const findPaymentByProviderInvoiceId = (providerInvoiceId: string) =>
  db.query.payment.findFirst({ where: { providerInvoiceId } })

export const findPaymentByOrderId = (orderId: string) =>
  db.query.payment.findFirst({ where: { orderId } })
