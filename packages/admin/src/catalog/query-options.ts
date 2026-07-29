import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
  AdminCatalogProductListFilters,
  AdminCatalogSelectors,
  AdminExpectedProductVersion,
  AdminProductCreate,
  AdminProductDeleteOutcome,
  AdminProductImageDelete,
  AdminProductImageMutationOutcome,
  AdminProductImageOrder,
  AdminProductImageUpdate,
  AdminProductImageUpload,
  AdminProductUpdate,
  AdminStockUpdate,
  AdminVariantActivation,
  AdminVariantCreate,
  AdminVariantDelete,
  AdminVariantDeleteOutcome,
  AdminVariantUpdate,
} from '@store-kit/contracts/admin-catalog'
import { mutationOptions, queryOptions } from '@tanstack/solid-query'

import { deserializeResult } from '../query-options/result'
import type { ResultResponse } from '../query-options/result'

export type CatalogResultResponse<Value> = ResultResponse<Value, AdminCatalogError>

export type CatalogRequests = {
  listProducts: (
    filters: AdminCatalogProductListFilters,
  ) => Promise<CatalogResultResponse<AdminCatalogProductList>>
  listSelectors: () => Promise<CatalogResultResponse<AdminCatalogSelectors>>
  getProduct: (productId: string) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  createProduct: (
    input: AdminProductCreate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateProduct: (
    productId: string,
    input: AdminProductUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  archiveProduct: (
    productId: string,
    input: AdminExpectedProductVersion,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  restoreProduct: (
    productId: string,
    input: AdminExpectedProductVersion,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  deleteProduct: (
    productId: string,
    input: AdminExpectedProductVersion,
  ) => Promise<CatalogResultResponse<AdminProductDeleteOutcome>>
  createVariant: (
    productId: string,
    input: AdminVariantCreate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateVariant: (
    productId: string,
    variantId: string,
    input: AdminVariantUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateVariantActivation: (
    productId: string,
    variantId: string,
    input: AdminVariantActivation,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateStock: (
    productId: string,
    variantId: string,
    input: AdminStockUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  deleteVariant: (
    productId: string,
    variantId: string,
    input: AdminVariantDelete,
  ) => Promise<CatalogResultResponse<AdminVariantDeleteOutcome>>
  uploadImage: (
    productId: string,
    input: AdminProductImageUpload,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateImage: (
    productId: string,
    imageId: string,
    input: AdminProductImageUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  reorderImages: (
    productId: string,
    input: AdminProductImageOrder,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  deleteImage: (
    productId: string,
    imageId: string,
    input: AdminProductImageDelete,
  ) => Promise<CatalogResultResponse<AdminProductImageMutationOutcome>>
}

const deserialize = <Value>(request: Promise<CatalogResultResponse<Value>>) =>
  deserializeResult(request, 'catalog')

export const catalogKeys = {
  all: ['admin', 'catalog'] as const,
  publicProducts: ['catalog', 'products'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (filters: AdminCatalogProductListFilters) => [...catalogKeys.lists(), filters] as const,
  selectors: () => [...catalogKeys.all, 'selectors'] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (productId: string) => [...catalogKeys.details(), productId] as const,
}

const list = (requests: CatalogRequests, filters: AdminCatalogProductListFilters) =>
  queryOptions({
    queryKey: catalogKeys.list(filters),
    queryFn: () => deserialize(requests.listProducts(filters)),
  })

const selectors = (requests: CatalogRequests) =>
  queryOptions({
    queryKey: catalogKeys.selectors(),
    queryFn: () => deserialize(requests.listSelectors()),
  })

const detail = (requests: CatalogRequests, productId: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(productId),
    queryFn: () => deserialize(requests.getProduct(productId)),
  })

const createProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: (input: AdminProductCreate) => deserialize(requests.createProduct(input)),
  })

const updateProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductUpdate }) =>
      deserialize(requests.updateProduct(productId, input)),
  })

const archiveProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserialize(requests.archiveProduct(productId, input)),
  })

const restoreProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserialize(requests.restoreProduct(productId, input)),
  })

const deleteProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminExpectedProductVersion }) =>
      deserialize(requests.deleteProduct(productId, input)),
  })

const createVariant = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminVariantCreate }) =>
      deserialize(requests.createVariant(productId, input)),
  })

const updateVariant = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantUpdate
    }) => deserialize(requests.updateVariant(productId, variantId, input)),
  })

const updateVariantActivation = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantActivation
    }) => deserialize(requests.updateVariantActivation(productId, variantId, input)),
  })

const updateStock = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminStockUpdate
    }) => deserialize(requests.updateStock(productId, variantId, input)),
  })

const deleteVariant = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      variantId,
      input,
    }: {
      productId: string
      variantId: string
      input: AdminVariantDelete
    }) => deserialize(requests.deleteVariant(productId, variantId, input)),
  })

const uploadImage = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductImageUpload }) =>
      deserialize(requests.uploadImage(productId, input)),
  })

const updateImage = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      imageId,
      input,
    }: {
      productId: string
      imageId: string
      input: AdminProductImageUpdate
    }) => deserialize(requests.updateImage(productId, imageId, input)),
  })

const reorderImages = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductImageOrder }) =>
      deserialize(requests.reorderImages(productId, input)),
  })

const deleteImage = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({
      productId,
      imageId,
      input,
    }: {
      productId: string
      imageId: string
      input: AdminProductImageDelete
    }) => deserialize(requests.deleteImage(productId, imageId, input)),
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
