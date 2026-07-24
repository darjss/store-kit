import { Type } from 'typebox'
import type { Static } from 'typebox'

export const productNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('ProductNotFound'),
    message: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type ProductNotFound = Static<typeof productNotFoundSchema>
