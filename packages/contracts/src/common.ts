import { Type } from 'typebox'
import type { Static } from 'typebox'

export const nonNegativeIntegerSchema = Type.Integer({ minimum: 0 })
export const nullableTimestampSchema = Type.Union([nonNegativeIntegerSchema, Type.Null()])
export const trimmedNonBlankTextSchema = Type.String({
  minLength: 1,
  pattern: '^\\S(?:[\\s\\S]*\\S)?$',
})
export const nullableTrimmedTextSchema = Type.Union([trimmedNonBlankTextSchema, Type.Null()])
export const slugSchema = Type.String({
  maxLength: 160,
  pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
})
export const mntAmountSchema = nonNegativeIntegerSchema
export const stockQuantitySchema = nonNegativeIntegerSchema
export const sortOrderSchema = nonNegativeIntegerSchema
export const variantOptionsSchema = Type.Record(
  trimmedNonBlankTextSchema,
  trimmedNonBlankTextSchema,
  { maxProperties: 20 },
)
export const validationIssueCodeSchema = Type.Union([
  Type.Literal('invalid'),
  Type.Literal('duplicate'),
])
export const validationIssueSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    code: validationIssueCodeSchema,
  },
  { additionalProperties: false },
)
export const publicImageSchema = Type.Object(
  {
    url: Type.String({ minLength: 1 }),
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    alt: trimmedNonBlankTextSchema,
  },
  { additionalProperties: false },
)
export type PublicImage = Static<typeof publicImageSchema>
export type ValidationIssueCode = Static<typeof validationIssueCodeSchema>
export type ValidationIssue = Static<typeof validationIssueSchema>
const typeIdSuffixPattern = '[0-7][0-9a-hjkmnp-tv-z]{25}'
export const brandIdPattern = `^brd_${typeIdSuffixPattern}$`
export const categoryIdPattern = `^cat_${typeIdSuffixPattern}$`
export const imageIdPattern = `^img_${typeIdSuffixPattern}$`
export const productIdPattern = `^prod_${typeIdSuffixPattern}$`
export const variantIdPattern = `^var_${typeIdSuffixPattern}$`
export const orderIdPattern = `^ord_${typeIdSuffixPattern}$`
export const brandIdSchema = Type.String({ pattern: brandIdPattern })
export const categoryIdSchema = Type.String({ pattern: categoryIdPattern })
export const imageIdSchema = Type.String({ pattern: imageIdPattern })
export const productIdSchema = Type.String({ pattern: productIdPattern })
export const variantIdSchema = Type.String({ pattern: variantIdPattern })
export const orderIdSchema = Type.String({ pattern: orderIdPattern })
export const productStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
  Type.Literal('archived'),
])
export const editableProductStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
])
export const orderStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('confirmed'),
  Type.Literal('preparing'),
  Type.Literal('delivering'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
])
