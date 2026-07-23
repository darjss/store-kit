import { commerce } from '@store-kit/commerce'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

import { publicImage } from '~/media'

const slugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$'

const productListQuery = t.Object({
  category: t.Optional(t.String({ pattern: slugPattern })),
  brand: t.Optional(t.String({ pattern: slugPattern })),
  useCase: t.Optional(
    t.Union([
      t.Literal('first-iem'),
      t.Literal('bass'),
      t.Literal('vocals'),
      t.Literal('gaming'),
      t.Literal('daily-carry'),
    ]),
  ),
  featured: t.Optional(t.BooleanString()),
  query: t.Optional(t.String()),
  minPrice: t.Optional(t.Integer({ minimum: 0 })),
  maxPrice: t.Optional(t.Integer({ minimum: 0 })),
  sort: t.Optional(
    t.Union([
      t.Literal('featured'),
      t.Literal('recent'),
      t.Literal('price-asc'),
      t.Literal('price-desc'),
    ]),
  ),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Integer({ minimum: 0 })),
})

export const catalogRoutes = new Elysia({ aot: false, prefix: '/api' })
  .onAfterHandle(({ set }) => {
    set.headers['cache-control'] = 'public, max-age=0, must-revalidate'
    set.headers['cloudflare-cdn-cache-control'] =
      'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400'
  })
  .get(
    '/products',
    async ({ query, request }) =>
      Result.serialize(
        (await commerce.catalog.listProducts(query)).map(catalog => ({
          ...catalog,
          items: catalog.items.map(product => ({
            ...product,
            images: product.images.map(image => publicImage(image, request)),
          })),
        })),
      ),
    {
      query: productListQuery,
    },
  )
  .get(
    '/products/:slug',
    async ({ params, request }) =>
      Result.serialize(
        (await commerce.catalog.getProduct(params.slug)).map(product => ({
          ...product,
          images: product.images.map(image => publicImage(image, request)),
        })),
      ),
    {
      params: t.Object({
        slug: t.String({ pattern: slugPattern }),
      }),
    },
  )
  .get('/categories', async () =>
    Result.serialize(Result.ok(await commerce.catalog.listCategories())),
  )
  .get('/brands', async () => Result.serialize(Result.ok(await commerce.catalog.listBrands())))
