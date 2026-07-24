import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  brandIdSchema,
  checkoutSettingsIdSchema,
  createBrandId,
  createCategoryId,
  createOrderId,
  createOrderLineId,
  createPaymentId,
  createProductId,
  createProductImageId,
  createProductVariantId,
  defaultCheckoutSettingsId,
  entityIdPrefixes,
  hasTypeIdPrefix,
} from './ids'
import { brand, category, product, productImage, productVariant } from './schema/catalog'
import { checkoutSettings, order, orderLine, payment } from './schema/shopping'

test('entity ID generators use their stable prefixes and produce valid TypeIDs', () => {
  const ids = [
    [createBrandId(), entityIdPrefixes.brand],
    [createCategoryId(), entityIdPrefixes.category],
    [createProductId(), entityIdPrefixes.product],
    [createProductImageId(), entityIdPrefixes.productImage],
    [createProductVariantId(), entityIdPrefixes.productVariant],
    [createOrderId(), entityIdPrefixes.order],
    [createOrderLineId(), entityIdPrefixes.orderLine],
    [createPaymentId(), entityIdPrefixes.payment],
  ] as const

  for (const [id, prefix] of ids) {
    expect(id.startsWith(`${prefix}_`)).toBe(true)
    expect(hasTypeIdPrefix(id, prefix)).toBe(true)
  }
})

test('TypeBox ID schemas reject malformed IDs and IDs from another entity', () => {
  const brandId = createBrandId()

  expect(Value.Check(brandIdSchema, brandId)).toBe(true)
  expect(Value.Check(brandIdSchema, createProductId())).toBe(false)
  expect(Value.Check(brandIdSchema, `${brandId.slice(0, -1)}i`)).toBe(false)
  expect(Value.Check(brandIdSchema, brandId.toUpperCase())).toBe(false)
  expect(hasTypeIdPrefix(brandId, entityIdPrefixes.product)).toBe(false)
})

test('the singleton checkout settings ID is a cfg TypeID', () => {
  expect(defaultCheckoutSettingsId).toBe('cfg_00000000000000000000000001')
  expect(Value.Check(checkoutSettingsIdSchema, defaultCheckoutSettingsId)).toBe(true)
  expect(Value.Check(checkoutSettingsIdSchema, 'cfg_00000000000000000000000002')).toBe(false)
})

test('every entity primary key has its prefixed Drizzle default', () => {
  const defaults = [
    [brand.id.defaultFn?.(), entityIdPrefixes.brand],
    [category.id.defaultFn?.(), entityIdPrefixes.category],
    [product.id.defaultFn?.(), entityIdPrefixes.product],
    [productImage.id.defaultFn?.(), entityIdPrefixes.productImage],
    [productVariant.id.defaultFn?.(), entityIdPrefixes.productVariant],
    [checkoutSettings.id.defaultFn?.(), entityIdPrefixes.checkoutSettings],
    [order.id.defaultFn?.(), entityIdPrefixes.order],
    [orderLine.id.defaultFn?.(), entityIdPrefixes.orderLine],
    [payment.id.defaultFn?.(), entityIdPrefixes.payment],
  ] as const

  for (const [id, prefix] of defaults) {
    expect(typeof id).toBe('string')
    expect(hasTypeIdPrefix(id as string, prefix)).toBe(true)
  }
})

test('every single-column entity primary key is explicitly not null', () => {
  const entities = [
    { table: brand, id: brand.id },
    { table: category, id: category.id },
    { table: product, id: product.id },
    { table: productImage, id: productImage.id },
    { table: productVariant, id: productVariant.id },
    { table: checkoutSettings, id: checkoutSettings.id },
    { table: order, id: order.id },
    { table: orderLine, id: orderLine.id },
    { table: payment, id: payment.id },
  ] as const

  for (const { table, id } of entities) {
    expect(id.notNull).toBe(true)
    const [primaryKey] = getTableConfig(table).primaryKeys
    expect(primaryKey?.columns).toEqual([id])
  }
})
