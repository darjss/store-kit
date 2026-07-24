import { Type } from 'typebox'

export const nonNegativeIntegerSchema = Type.Integer({ minimum: 0 })
export const nullableTimestampSchema = Type.Union([nonNegativeIntegerSchema, Type.Null()])
export const variantOptionsSchema = Type.Record(Type.String(), Type.String())
const typeIdSuffixPattern = '[0-7][0-9a-hjkmnp-tv-z]{25}'
export const variantIdPattern = `^var_${typeIdSuffixPattern}$`
export const orderIdPattern = `^ord_${typeIdSuffixPattern}$`
export const variantIdSchema = Type.String({ pattern: variantIdPattern })
export const orderIdSchema = Type.String({ pattern: orderIdPattern })
export const validationIssueSchema = Type.Object(
  {
    path: Type.String(),
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)
