import { Type } from 'typebox'
import type { Static } from 'typebox'

import { nonNegativeIntegerSchema, publicImageSchema } from './common.ts'

export const catalogSlugSchema = Type.String({
  minLength: 1,
  maxLength: 40,
  pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
})

export const productUseCaseSchema = catalogSlugSchema

export const productListFiltersSchema = Type.Object({
  category: Type.Optional(catalogSlugSchema),
  brand: Type.Optional(catalogSlugSchema),
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

export const catalogSearchInputSchema = Type.Object(
  {
    query: Type.String({ minLength: 2, maxLength: 100 }),
  },
  { additionalProperties: false },
)

export const catalogSearchItemSchema = Type.Object(
  {
    slug: catalogSlugSchema,
    name: Type.String({ minLength: 1 }),
    shortDescription: Type.String({ minLength: 1 }),
    image: Type.Union([publicImageSchema, Type.Null()]),
    priceMnt: Type.Union([nonNegativeIntegerSchema, Type.Null()]),
    stockStatus: Type.Union([
      Type.Literal('in-stock'),
      Type.Literal('low-stock'),
      Type.Literal('sold-out'),
    ]),
  },
  { additionalProperties: false },
)

export const catalogSearchResultSchema = Type.Object(
  {
    items: Type.Array(catalogSearchItemSchema, { maxItems: 8 }),
    total: nonNegativeIntegerSchema,
  },
  { additionalProperties: false },
)

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
export type CatalogSearchInput = Static<typeof catalogSearchInputSchema>
export type CatalogSearchItem = Static<typeof catalogSearchItemSchema>
export type CatalogSearchResult = Static<typeof catalogSearchResultSchema>
export type ProductNotFound = Static<typeof productNotFoundSchema>
