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

export type Entity = keyof typeof entityIdPrefixes
export type EntityIdPrefix = (typeof entityIdPrefixes)[Entity]

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
export const orderIdSchema = typeIdSchema(entityIdPrefixes.order)
export const orderLineIdSchema = typeIdSchema(entityIdPrefixes.orderLine)
export const paymentIdSchema = typeIdSchema(entityIdPrefixes.payment)

export const defaultCheckoutSettingsId = TypeID.fromUUID(
  entityIdPrefixes.checkoutSettings,
  '00000000-0000-0000-0000-000000000001',
).toString()

export const checkoutSettingsIdSchema = Type.Literal(defaultCheckoutSettingsId)

export const createId = <const EntityName extends Entity>(entity: EntityName) =>
  typeid(entityIdPrefixes[entity]).toString()

export const hasTypeIdPrefix = (value: string, prefix: EntityIdPrefix) => {
  try {
    TypeID.fromString(value, prefix)
    return true
  } catch {
    return false
  }
}
