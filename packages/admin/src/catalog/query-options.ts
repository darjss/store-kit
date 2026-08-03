import type {
  AdminCatalogProductListFilters,
  AdminExpectedProductVersion,
  AdminProductCreate,
  AdminProductImageDelete,
  AdminProductImageOrder,
  AdminProductImageUpdate,
  AdminProductImageUpload,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantActivation,
  AdminVariantCreate,
  AdminVariantDelete,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { api } from '../client'
import { deserializeResult } from '../query-options/result'

const catalogApi = api.api.admin.catalog

export const catalogKeys = {
  all: ['admin', 'catalog'] as const,
  publicProducts: ['catalog', 'products'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (filters: AdminCatalogProductListFilters) => [...catalogKeys.lists(), filters] as const,
  selectors: () => [...catalogKeys.all, 'selectors'] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (productId: string) => [...catalogKeys.details(), productId] as const,
}

const list = (filters: AdminCatalogProductListFilters) =>
  queryOptions({
    queryKey: catalogKeys.list(filters),
    queryFn: () => deserializeResult(catalogApi.products.get({ query: filters }), 'catalog'),
  })

const selectors = () =>
  queryOptions({
    queryKey: catalogKeys.selectors(),
    queryFn: () => deserializeResult(catalogApi.selectors.get(), 'catalog'),
  })

const detail = (productId: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(productId),
    queryFn: () => deserializeResult(catalogApi.products({ productId }).get(), 'catalog'),
  })

const createProduct = () =>
  mutationOptions({
    mutationFn: (input: AdminProductCreate) =>
      deserializeResult(catalogApi.products.post(input), 'catalog'),
  })

const updateProduct = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductUpdate }) =>
      deserializeResult(catalogApi.products({ productId }).put(input), 'catalog'),
  })

const archiveProduct = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserializeResult(catalogApi.products({ productId }).archive.post(input), 'catalog'),
  })

const restoreProduct = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserializeResult(catalogApi.products({ productId }).restore.post(input), 'catalog'),
  })

const deleteProduct = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserializeResult(catalogApi.products({ productId }).delete(input), 'catalog'),
  })

const createVariant = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminVariantCreate }) =>
      deserializeResult(catalogApi.products({ productId }).variants.post(input), 'catalog'),
  })

const updateVariant = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantUpdate
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).variants({ variantId }).put(input),
        'catalog',
      ),
  })

const updateVariantActivation = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantActivation
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).variants({ variantId }).activation.patch(input),
        'catalog',
      ),
  })

const updateStock = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminStockUpdate
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).variants({ variantId }).stock.patch(input),
        'catalog',
      ),
  })

const deleteVariant = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantDelete
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).variants({ variantId }).delete(input),
        'catalog',
      ),
  })

const uploadImage = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductImageUpload }) =>
      deserializeResult(catalogApi.products({ productId }).images.post(input), 'catalog'),
  })

const updateImage = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      imageId,
      input,
    }: {
      productId: string
      imageId: string
      input: AdminProductImageUpdate
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).images({ imageId }).put(input),
        'catalog',
      ),
  })

const reorderImages = () =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductImageOrder }) =>
      deserializeResult(catalogApi.products({ productId }).images.order.put(input), 'catalog'),
  })

const deleteImage = () =>
  mutationOptions({
    mutationFn: ({
      productId,
      imageId,
      input,
    }: {
      productId: string
      imageId: string
      input: AdminProductImageDelete
    }) =>
      deserializeResult(
        catalogApi.products({ productId }).images({ imageId }).delete(input),
        'catalog',
      ),
  })

export const catalogQuery = { list, selectors, detail }
export const catalogMutation = {
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  updateVariantActivation,
  updateStock,
  deleteVariant,
  uploadImage,
  updateImage,
  reorderImages,
  deleteImage,
}
