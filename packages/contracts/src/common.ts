import { Type } from 'typebox'

export const nonNegativeIntegerSchema = Type.Integer({ minimum: 0 })
export const nullableTimestampSchema = Type.Union([nonNegativeIntegerSchema, Type.Null()])
export const variantOptionsSchema = Type.Record(Type.String(), Type.String())
export const variantIdPattern = '^var_[0-9a-hjkmnp-tv-z]{26}$'
export const variantIdSchema = Type.String({ pattern: variantIdPattern })
export const orderIdSchema = Type.String({ pattern: '^ord_[0-9a-hjkmnp-tv-z]{26}$' })
export const validationIssueSchema = Type.Object(
  {
    path: Type.String(),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)
