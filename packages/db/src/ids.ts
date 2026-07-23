import { Type } from 'typebox'
import { TypeID, typeid } from 'typeid-js'

export const entityIdPrefixes = {
  brand: 'brd',
  category: 'cat',
  product: 'prod',
  productImage: 'img',
  productVariant: 'var',
  checkoutSettings: 'cfg',
  order: 'ord',
  orderLine: 'line',
  payment: 'pay',
} as const

export type EntityIdPrefix = (typeof entityIdPrefixes)[keyof typeof entityIdPrefixes]

const suffixPattern = '[0-7][0123456789abcdefghjkmnpqrstvwxyz]{25}'

export const typeIdPattern = <const Prefix extends EntityIdPrefix>(prefix: Prefix) =>
  `^${prefix}_${suffixPattern}$`

export const typeIdSchema = <const Prefix extends EntityIdPrefix>(prefix: Prefix) =>
  Type.String({ pattern: typeIdPattern(prefix) })

export const brandIdSchema = typeIdSchema(entityIdPrefixes.brand)
export const categoryIdSchema = typeIdSchema(entityIdPrefixes.category)
export const productIdSchema = typeIdSchema(entityIdPrefixes.product)
export const productImageIdSchema = typeIdSchema(entityIdPrefixes.productImage)
export const productVariantIdSchema = typeIdSchema(entityIdPrefixes.productVariant)
export const checkoutSettingsIdSchema = typeIdSchema(entityIdPrefixes.checkoutSettings)
export const orderIdSchema = typeIdSchema(entityIdPrefixes.order)
export const orderLineIdSchema = typeIdSchema(entityIdPrefixes.orderLine)
export const paymentIdSchema = typeIdSchema(entityIdPrefixes.payment)

export const defaultCheckoutSettingsId = TypeID.fromUUID(
  entityIdPrefixes.checkoutSettings,
  '00000000-0000-0000-0000-000000000001',
).toString()

const createId = <const Prefix extends EntityIdPrefix>(prefix: Prefix) => typeid(prefix).toString()

export const createBrandId = () => createId(entityIdPrefixes.brand)
export const createCategoryId = () => createId(entityIdPrefixes.category)
export const createProductId = () => createId(entityIdPrefixes.product)
export const createProductImageId = () => createId(entityIdPrefixes.productImage)
export const createProductVariantId = () => createId(entityIdPrefixes.productVariant)
export const createOrderId = () => createId(entityIdPrefixes.order)
export const createOrderLineId = () => createId(entityIdPrefixes.orderLine)
export const createPaymentId = () => createId(entityIdPrefixes.payment)

export const hasTypeIdPrefix = (value: string, prefix: EntityIdPrefix) => {
  try {
    TypeID.fromString(value, prefix)
    return true
  } catch {
    return false
  }
}
