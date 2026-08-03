import { Type } from 'typebox'
import type { Static } from 'typebox'

import { adminOrderListItemSchema } from './admin-orders'
import { nonNegativeIntegerSchema, productIdSchema, variantIdSchema } from './common'

export const adminDashboardSummarySchema = Type.Object(
  {
    newOrderCount: nonNegativeIntegerSchema,
    confirmedOrderCount: nonNegativeIntegerSchema,
    preparingOrderCount: nonNegativeIntegerSchema,
    deliveringOrderCount: nonNegativeIntegerSchema,
    lowStockVariantCount: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminLowStockVariantSchema = Type.Object(
  {
    productId: productIdSchema,
    variantId: variantIdSchema,
    productName: Type.String({ minLength: 1 }),
    variantName: Type.String({ minLength: 1 }),
    sku: Type.String({ minLength: 1 }),
    stockQuantity: nonNegativeIntegerSchema,
    updatedAt: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

export const adminDashboardSchema = Type.Object(
  {
    summary: adminDashboardSummarySchema,
    recentOrders: Type.Array(adminOrderListItemSchema),
    lowStockVariants: Type.Array(adminLowStockVariantSchema),
  },
  { additionalProperties: false },
)

export type AdminDashboardSummary = Static<typeof adminDashboardSummarySchema>
export type AdminLowStockVariant = Static<typeof adminLowStockVariantSchema>
export type AdminDashboard = Static<typeof adminDashboardSchema>
