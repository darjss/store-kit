import { commerce } from '@store-kit/commerce'
import { productListFiltersSchema } from '@store-kit/contracts/catalog'
import { Result } from 'better-result'
import { Elysia, t } from 'elysia'

import { publicImage } from '~/media'
import { contractQuery } from '~/typebox-contract'

const slugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$'

export const catalogRoutes = new Elysia({ aot: false, prefix: '/api' })
  .onAfterHandle(({ set }) => {
    set.headers['cache-control'] = 'public, max-age=0, must-revalidate'
    set.headers['cloudflare-cdn-cache-control'] =
      'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400'
  })
  .get(
    '/products',
    async ({ query }) =>
      Result.serialize(
        (await commerce.catalog.listProducts(query)).map(catalog => ({
          ...catalog,
          items: catalog.items.map(product => ({
            ...product,
            images: product.images.map(image => publicImage(image)),
          })),
        })),
      ),
    {
      query: contractQuery(productListFiltersSchema),
    },
  )
  .get(
    '/products/:slug',
    async ({ params }) =>
      Result.serialize(
        (await commerce.catalog.getProduct(params.slug)).map(product => ({
          ...product,
          images: product.images.map(image => publicImage(image)),
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
