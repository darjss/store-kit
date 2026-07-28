import { Value } from 'typebox/value'
import { describe, expect, it } from 'vite-plus/test'

import {
  adminCatalogProductDetailSchema,
  adminProductUpdateSchema,
  adminStockUpdateSchema,
  adminVariantUpdateSchema,
} from './admin-catalog'
import { adminDashboardSchema } from './admin-dashboard'
import { adminOrderDetailSchema, adminOrderStatusUpdateSchema } from './admin-orders'
import { adminStoreSettingsUpdateSchema } from './admin-settings'

const productId = 'prod_00000000000000000000000000'
const variantId = 'var_00000000000000000000000000'
const orderId = 'ord_00000000000000000000000000'

const listOrder = {
  id: orderId,
  number: 'PLG-1',
  customerName: 'Customer',
  customerPhone: '99112233',
  status: 'new',
  paymentMethod: 'bank_transfer',
  paymentStatus: 'pending',
  lineCount: 1,
  totalMnt: 15_000,
  createdAt: 1,
  updatedAt: 1,
}

describe('admin contracts', () => {
  it('accepts complete browser-safe dashboard, catalog, order, and settings payloads', () => {
    expect(
      Value.Check(adminDashboardSchema, {
        summary: {
          newOrderCount: 1,
          confirmedOrderCount: 0,
          preparingOrderCount: 0,
          deliveringOrderCount: 0,
          lowStockVariantCount: 1,
        },
        recentOrders: [listOrder],
        lowStockVariants: [
          {
            productId,
            variantId,
            productName: 'Product',
            variantName: 'Default',
            sku: 'SKU-1',
            stockQuantity: 3,
            updatedAt: 1,
          },
        ],
      }),
    ).toBe(true)
    expect(
      Value.Check(adminCatalogProductDetailSchema, {
        id: productId,
        name: 'Product',
        slug: 'product',
        status: 'active',
        featured: false,
        brandName: null,
        categoryName: null,
        updatedAt: 1,
        variants: [
          {
            id: variantId,
            productId,
            sku: 'SKU-1',
            name: 'Default',
            options: {},
            priceMnt: 10_000,
            compareAtPriceMnt: null,
            stockQuantity: 3,
            active: true,
            updatedAt: 1,
          },
        ],
      }),
    ).toBe(true)
    expect(
      Value.Check(adminOrderDetailSchema, {
        id: orderId,
        number: 'PLG-1',
        status: 'new',
        customerName: 'Customer',
        customerPhone: '99112233',
        district: 'Сүхбаатар',
        khoroo: '1',
        address: 'Address',
        deliveryNotes: null,
        subtotalMnt: 10_000,
        deliveryFeeMnt: 5_000,
        totalMnt: 15_000,
        createdAt: 1,
        updatedAt: 1,
        lines: [
          {
            productName: 'Product',
            variantName: 'Default',
            sku: 'SKU-1',
            options: {},
            unitPriceMnt: 10_000,
            quantity: 1,
            lineTotalMnt: 10_000,
          },
        ],
        payment: {
          method: 'bank_transfer',
          status: 'pending',
          amountMnt: 15_000,
          claimedAt: null,
          paidAt: null,
        },
        allowedTransitions: ['cancelled'],
      }),
    ).toBe(true)
    expect(
      Value.Check(adminStoreSettingsUpdateSchema, {
        deliveryFeeMnt: 5_000,
        bankName: 'Bank',
        bankAccountName: 'Store',
        bankAccountNumber: '00123',
        expectedUpdatedAt: 1,
      }),
    ).toBe(true)
  })

  it('rejects malformed TypeIDs, negative values, empty patches, unknown fields, and statuses', () => {
    expect(Value.Check(adminStockUpdateSchema, { expectedUpdatedAt: 1, stockQuantity: -1 })).toBe(
      false,
    )
    expect(Value.Check(adminProductUpdateSchema, { expectedUpdatedAt: 1 })).toBe(false)
    expect(Value.Check(adminVariantUpdateSchema, { expectedUpdatedAt: 1, extra: true })).toBe(false)
    expect(
      Value.Check(adminOrderStatusUpdateSchema, { status: 'refunded', expectedUpdatedAt: 1 }),
    ).toBe(false)
    expect(
      Value.Check(adminStoreSettingsUpdateSchema, {
        deliveryFeeMnt: -1,
        bankName: ' ',
        bankAccountName: 'Store',
        bankAccountNumber: '1',
        expectedUpdatedAt: 1,
      }),
    ).toBe(false)
    expect(
      Value.Check(adminCatalogProductDetailSchema, {
        id: 'product_1',
        name: 'Product',
        slug: 'product',
        status: 'active',
        featured: false,
        brandName: null,
        categoryName: null,
        updatedAt: 1,
        variants: [],
      }),
    ).toBe(false)
  })
})
