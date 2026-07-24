import { Type } from 'typebox'
import type { Static } from 'typebox'

import { nonNegativeIntegerSchema } from './common.ts'

const slugSchema = Type.String({ pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })

export const productUseCaseSchema = Type.Union([
  Type.Literal('first-iem'),
  Type.Literal('bass'),
  Type.Literal('vocals'),
  Type.Literal('gaming'),
  Type.Literal('daily-carry'),
])

export const productListFiltersSchema = Type.Object({
  category: Type.Optional(slugSchema),
  brand: Type.Optional(slugSchema),
  useCase: Type.Optional(productUseCaseSchema),
  featured: Type.Optional(Type.Boolean()),
  query: Type.Optional(Type.String()),
  minPrice: Type.Optional(nonNegativeIntegerSchema),
  maxPrice: Type.Optional(nonNegativeIntegerSchema),
  sort: Type.Optional(
    Type.Union([
      Type.Literal('featured'),
      Type.Literal('recent'),
      Type.Literal('price-asc'),
      Type.Literal('price-desc'),
    ]),
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  offset: Type.Optional(nonNegativeIntegerSchema),
})

export const productNotFoundSchema = Type.Object(
  {
    _tag: Type.Literal('ProductNotFound'),
    message: Type.String({ minLength: 1 }),
    slug: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export type ProductUseCase = Static<typeof productUseCaseSchema>
export type ProductListFilters = Static<typeof productListFiltersSchema>
export type ProductNotFound = Static<typeof productNotFoundSchema>
