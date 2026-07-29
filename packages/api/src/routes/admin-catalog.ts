import { commerce } from '@store-kit/commerce'
import {
  adminCatalogProductListFiltersSchema,
  adminExpectedProductVersionSchema,
  adminProductCreateSchema,
  adminProductImageDeleteSchema,
  adminProductImageOrderSchema,
  adminProductImageUpdateSchema,
  adminProductImageUploadSchema,
  adminProductUpdateSchema,
  adminStockUpdateSchema,
  adminVariantActivationSchema,
  adminVariantCreateSchema,
  adminVariantDeleteSchema,
  adminVariantUpdateSchema,
  convertMultipartContract,
} from '@store-kit/contracts/admin-catalog'
import { imageIdPattern, productIdPattern, variantIdPattern } from '@store-kit/contracts/common'
import { Result } from 'better-result'
import { t } from 'elysia'

import { contractBody, contractMultipartBody, contractQuery } from '~/typebox-contract'

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

const imageParams = t.Object(
  {
    productId: t.String({ pattern: productIdPattern }),
    imageId: t.String({ pattern: imageIdPattern }),
  },
  { additionalProperties: false },
)

export const adminCatalogRoutes = createApprovedAdminRoutes('/catalog')
  .get('/catalog/selectors', async () =>
    Result.serialize(await commerce.catalog.listAdminSelectors()),
  )
  .get(
    '/catalog/products',
    async ({ query }) => Result.serialize(await commerce.catalog.listAdminProducts(query)),
    { query: contractQuery(adminCatalogProductListFiltersSchema) },
  )
  .post(
    '/catalog/products',
    async ({ body }) => Result.serialize(await commerce.catalog.createAdminProduct(body)),
    { body: contractBody(adminProductCreateSchema) },
  )
  .get(
    '/catalog/products/:productId',
    async ({ params }) =>
      Result.serialize(await commerce.catalog.getAdminProduct(params.productId)),
    { params: productParams },
  )
  .put(
    '/catalog/products/:productId',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.updateAdminProduct(params.productId, body)),
    { body: contractBody(adminProductUpdateSchema), params: productParams },
  )
  .delete(
    '/catalog/products/:productId',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.deleteAdminProduct(params.productId, body)),
    { body: contractBody(adminExpectedProductVersionSchema), params: productParams },
  )
  .post(
    '/catalog/products/:productId/archive',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.archiveAdminProduct(params.productId, body)),
    { body: contractBody(adminExpectedProductVersionSchema), params: productParams },
  )
  .post(
    '/catalog/products/:productId/restore',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.restoreAdminProduct(params.productId, body)),
    { body: contractBody(adminExpectedProductVersionSchema), params: productParams },
  )
  .post(
    '/catalog/products/:productId/variants',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.createAdminVariant(params.productId, body)),
    { body: contractBody(adminVariantCreateSchema), params: productParams },
  )
  .put(
    '/catalog/products/:productId/variants/:variantId',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminVariant(params.productId, params.variantId, body),
      ),
    { body: contractBody(adminVariantUpdateSchema), params: variantParams },
  )
  .delete(
    '/catalog/products/:productId/variants/:variantId',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.deleteAdminVariant(params.productId, params.variantId, body),
      ),
    { body: contractBody(adminVariantDeleteSchema), params: variantParams },
  )
  .patch(
    '/catalog/products/:productId/variants/:variantId/activation',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminVariantActivation(
          params.productId,
          params.variantId,
          body,
        ),
      ),
    { body: contractBody(adminVariantActivationSchema), params: variantParams },
  )
  .patch(
    '/catalog/products/:productId/variants/:variantId/stock',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminStock(params.productId, params.variantId, body),
      ),
    { body: contractBody(adminStockUpdateSchema), params: variantParams },
  )
  .post(
    '/catalog/products/:productId/images',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.uploadAdminImage(params.productId, body)),
    {
      body: contractMultipartBody(adminProductImageUploadSchema, value =>
        convertMultipartContract(adminProductImageUploadSchema, value),
      ),
      params: productParams,
    },
  )
  .put(
    '/catalog/products/:productId/images/order',
    async ({ body, params }) =>
      Result.serialize(await commerce.catalog.reorderAdminImages(params.productId, body)),
    { body: contractBody(adminProductImageOrderSchema), params: productParams },
  )
  .put(
    '/catalog/products/:productId/images/:imageId',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.updateAdminImage(params.productId, params.imageId, body),
      ),
    { body: contractBody(adminProductImageUpdateSchema), params: imageParams },
  )
  .delete(
    '/catalog/products/:productId/images/:imageId',
    async ({ body, params }) =>
      Result.serialize(
        await commerce.catalog.removeAdminImage(params.productId, params.imageId, body),
      ),
    { body: contractBody(adminProductImageDeleteSchema), params: imageParams },
  )
