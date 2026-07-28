import type {
  AdminCatalogError,
  AdminCatalogProductDetail,
  AdminCatalogProductList,
  AdminCatalogProductListFilters,
  AdminProductUpdate,
  AdminStockUpdate,
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
  getProduct: (productId: string) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateProduct: (
    productId: string,
    input: AdminProductUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateVariant: (
    productId: string,
    variantId: string,
    input: AdminVariantUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
  updateStock: (
    productId: string,
    variantId: string,
    input: AdminStockUpdate,
  ) => Promise<CatalogResultResponse<AdminCatalogProductDetail>>
}

const deserialize = <Value>(request: Promise<CatalogResultResponse<Value>>) =>
  deserializeResult(request, 'catalog')

export const catalogKeys = {
  all: ['admin', 'catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (filters: AdminCatalogProductListFilters) => [...catalogKeys.lists(), filters] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (productId: string) => [...catalogKeys.details(), productId] as const,
}

const list = (requests: CatalogRequests, filters: AdminCatalogProductListFilters) =>
  queryOptions({
    queryKey: catalogKeys.list(filters),
    queryFn: () => deserialize(requests.listProducts(filters)),
  })

const detail = (requests: CatalogRequests, productId: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(productId),
    queryFn: () => deserialize(requests.getProduct(productId)),
  })

const updateProduct = (requests: CatalogRequests) =>
  mutationOptions({
    mutationFn: ({ productId, input }: { productId: string; input: AdminProductUpdate }) =>
      deserialize(requests.updateProduct(productId, input)),
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

export const catalogQuery = { list, detail }
export const catalogMutation = { updateProduct, updateVariant, updateStock }
