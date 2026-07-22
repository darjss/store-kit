import {
  getCatalogProduct,
  listCatalogBrands,
  listCatalogCategories,
  listCatalogProducts,
} from '@store-kit/commerce/catalog'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

const slugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$'

const productListQuery = t.Object({
  category: t.Optional(t.String({ pattern: slugPattern })),
  brand: t.Optional(t.String({ pattern: slugPattern })),
  featured: t.Optional(t.BooleanString()),
  query: t.Optional(t.String()),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Integer({ minimum: 0 })),
})

export const catalogRoutes = new Elysia({ aot: false, prefix: '/api' })
  .get('/products', async ({ query }) => Result.serialize(await listCatalogProducts(query)), {
    query: productListQuery,
  })
  .get(
    '/products/:slug',
    async ({ params }) => Result.serialize(await getCatalogProduct(params.slug)),
    {
      params: t.Object({
        slug: t.String({ pattern: slugPattern }),
      }),
    },
  )
  .get('/categories', async () => Result.serialize(Result.ok(await listCatalogCategories())))
  .get('/brands', async () => Result.serialize(Result.ok(await listCatalogBrands())))
