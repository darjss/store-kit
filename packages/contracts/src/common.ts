import { Type } from 'typebox'
import type { Static } from 'typebox'

export const nonNegativeIntegerSchema = Type.Integer({ minimum: 0 })
export const nullableTimestampSchema = Type.Union([nonNegativeIntegerSchema, Type.Null()])
export const variantOptionsSchema = Type.Record(Type.String(), Type.String())
export const publicImageSchema = Type.Object(
  {
    url: Type.String({ minLength: 1 }),
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    alt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)
export type PublicImage = Static<typeof publicImageSchema>
const typeIdSuffixPattern = '[0-7][0-9a-hjkmnp-tv-z]{25}'
export const variantIdPattern = `^var_${typeIdSuffixPattern}$`
export const orderIdPattern = `^ord_${typeIdSuffixPattern}$`
export const variantIdSchema = Type.String({ pattern: variantIdPattern })
export const orderIdSchema = Type.String({ pattern: orderIdPattern })
export const orderStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('delivering'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
])
