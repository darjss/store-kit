import { catalogSlugSchema } from '@store-kit/contracts/catalog'
import type { ProductListFilters } from '@store-kit/contracts/catalog'
import { toStandardSchema } from '@store-kit/contracts/standard-schema'
import { Type } from 'typebox'
import type { Static } from 'typebox'

export const dundUseCases = ['workday', 'off-duty', 'layering', 'travel', 'cold-weather'] as const

export const catalogSearchSchema = Type.Object(
  {
    category: Type.Optional(catalogSlugSchema),
    brand: Type.Optional(catalogSlugSchema),
    useCase: Type.Optional(
      Type.Union([
        Type.Literal('workday'),
        Type.Literal('off-duty'),
        Type.Literal('layering'),
        Type.Literal('travel'),
        Type.Literal('cold-weather'),
      ]),
    ),
    featured: Type.Optional(Type.Literal('true')),
    query: Type.Optional(Type.String({ maxLength: 100 })),
    sort: Type.Optional(
      Type.Union([
        Type.Literal('featured'),
        Type.Literal('recent'),
        Type.Literal('price-asc'),
        Type.Literal('price-desc'),
      ]),
    ),
  },
  { additionalProperties: false },
)

export const catalogSearchStandardSchema = toStandardSchema(catalogSearchSchema)
export type CatalogSearch = Static<typeof catalogSearchSchema>

export const toCatalogFilters = (search: CatalogSearch): ProductListFilters => ({
  ...(search.category ? { category: search.category } : {}),
  ...(search.brand ? { brand: search.brand } : {}),
  ...(search.useCase ? { useCase: search.useCase } : {}),
  ...(search.featured ? { featured: true } : {}),
  ...(search.query?.trim() ? { query: search.query.trim() } : {}),
  ...(search.sort ? { sort: search.sort } : {}),
  limit: 50,
})
