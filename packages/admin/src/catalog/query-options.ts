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
import { Result, ResultDeserializationError } from 'better-result'
import type { SerializedResult } from 'better-result'

export type CatalogResultResponse<Value> = {
  data: SerializedResult<Value, AdminCatalogError> | null
}

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

const deserialize = async <Value>(
  request: Promise<CatalogResultResponse<Value>>,
): Promise<Result<Value, AdminCatalogError>> => {
  const { data } = await request
  if (data === null) throw new Error('The catalog response did not include result data.')

  const result = Result.deserialize<Value, AdminCatalogError>(data)
  if (result.isOk()) return Result.ok<Value, AdminCatalogError>(result.value)
  if (ResultDeserializationError.is(result.error)) throw result.error
  return Result.err<Value, AdminCatalogError>(result.error)
}

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
