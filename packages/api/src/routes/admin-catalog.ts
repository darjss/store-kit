import { commerce } from '@store-kit/commerce'
import {
  adminCatalogProductListFiltersSchema,
  adminProductUpdateSchema,
  adminStockUpdateSchema,
  adminVariantUpdateSchema,
} from '@store-kit/contracts/admin-catalog'
import { productIdPattern, variantIdPattern } from '@store-kit/contracts/common'
import { Result } from 'better-result'
import { t } from 'elysia'

import { contractBody, contractQuery } from '~/typebox-contract'

import { createApprovedAdminRoutes } from './approved-admin'

const productParams = t.Object(
  { productId: t.String({ pattern: productIdPattern }) },
  { additionalProperties: false },
)

const variantParams = t.Object(
  {
    productId: t.String({ pattern: productIdPattern }),
    variantId: t.String({ pattern: variantIdPattern }),
  },
  { additionalProperties: false },
)

export const adminCatalogRoutes = createApprovedAdminRoutes()
  .get(
    '/catalog/products',
    async ({ query }) => Result.serialize(await commerce.catalog.listAdminProducts(query)),
    { query: contractQuery(adminCatalogProductListFiltersSchema) },
  )
  .get(
    '/catalog/products/:productId',
    async ({ params }) =>
      Result.serialize(await commerce.catalog.getAdminProduct(params.productId)),
    { params: productParams },
  )
  .patch(
    '/catalog/products/:productId',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.updateAdminProduct(params.productId, body)),
    { body: contractBody(adminProductUpdateSchema), params: productParams },
  )
  .patch(
    '/catalog/products/:productId/variants/:variantId',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminVariant(params.productId, params.variantId, body),
      ),
    { body: contractBody(adminVariantUpdateSchema), params: variantParams },
  )
  .patch(
    '/catalog/products/:productId/variants/:variantId/stock',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminStock(params.productId, params.variantId, body),
      ),
    { body: contractBody(adminStockUpdateSchema), params: variantParams },
  )
