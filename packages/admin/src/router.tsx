import {
  Matches,
  Outlet,
  RouterContextProvider,
  createRootRoute,
  createRouter,
} from '@tanstack/solid-router'
import type { ParentProps } from 'solid-js'

import type { CatalogRequests } from './catalog/query-options'
import { createCatalogRoutes } from './catalog/routes'
import { api } from './client'
import type { OrderRequests } from './orders/query-options'
import { createOrderRoutes } from './orders/routes'
import { createDashboardRoute } from './routes/dashboard'
import type { SettingsRequests } from './settings/query-options'
import { createSettingsRoute } from './settings/routes'

const rootRoute = createRootRoute({ component: Outlet })

type CatalogEdenVariantRoute = {
  put: (
    input: Parameters<CatalogRequests['updateVariant']>[2],
  ) => ReturnType<CatalogRequests['updateVariant']>
  delete: (
    input: Parameters<CatalogRequests['deleteVariant']>[2],
  ) => ReturnType<CatalogRequests['deleteVariant']>
  activation: {
    patch: (
      input: Parameters<CatalogRequests['updateVariantActivation']>[2],
    ) => ReturnType<CatalogRequests['updateVariantActivation']>
  }
  stock: {
    patch: (
      input: Parameters<CatalogRequests['updateStock']>[2],
    ) => ReturnType<CatalogRequests['updateStock']>
  }
}

type CatalogEdenVariantsRoute = {
  post: (
    input: Parameters<CatalogRequests['createVariant']>[1],
  ) => ReturnType<CatalogRequests['createVariant']>
} & ((params: { variantId: string }) => CatalogEdenVariantRoute)

type CatalogEdenImageRoute = {
  put: (
    input: Parameters<CatalogRequests['updateImage']>[2],
  ) => ReturnType<CatalogRequests['updateImage']>
  delete: (
    input: Parameters<CatalogRequests['deleteImage']>[2],
  ) => ReturnType<CatalogRequests['deleteImage']>
}

type CatalogEdenImagesRoute = {
  post: (
    input: Parameters<CatalogRequests['uploadImage']>[1],
  ) => ReturnType<CatalogRequests['uploadImage']>
  order: {
    put: (
      input: Parameters<CatalogRequests['reorderImages']>[1],
    ) => ReturnType<CatalogRequests['reorderImages']>
  }
} & ((params: { imageId: string }) => CatalogEdenImageRoute)

type CatalogEdenProductRoute = {
  get: () => ReturnType<CatalogRequests['getProduct']>
  put: (
    input: Parameters<CatalogRequests['updateProduct']>[1],
  ) => ReturnType<CatalogRequests['updateProduct']>
  delete: (
    input: Parameters<CatalogRequests['deleteProduct']>[1],
  ) => ReturnType<CatalogRequests['deleteProduct']>
  archive: {
    post: (
      input: Parameters<CatalogRequests['archiveProduct']>[1],
    ) => ReturnType<CatalogRequests['archiveProduct']>
  }
  restore: {
    post: (
      input: Parameters<CatalogRequests['restoreProduct']>[1],
    ) => ReturnType<CatalogRequests['restoreProduct']>
  }
  variants: CatalogEdenVariantsRoute
  images: CatalogEdenImagesRoute
}

type CatalogEdenProductsRoute = {
  get: (options: {
    query: Parameters<CatalogRequests['listProducts']>[0]
  }) => ReturnType<CatalogRequests['listProducts']>
  post: (
    input: Parameters<CatalogRequests['createProduct']>[0],
  ) => ReturnType<CatalogRequests['createProduct']>
} & ((params: { productId: string }) => CatalogEdenProductRoute)

type CatalogEdenClient = {
  selectors: { get: CatalogRequests['listSelectors'] }
  products: CatalogEdenProductsRoute
}

// The catalog API routes land through an independently assigned branch. This keeps this UI branch
// on the real Eden client while preserving the complete shared-contract transport shape.
const catalogApi = api.api.admin.catalog as unknown as CatalogEdenClient

const catalogRequests: CatalogRequests = {
  listProducts: filters => catalogApi.products.get({ query: filters }),
  listSelectors: () => catalogApi.selectors.get(),
  getProduct: productId => catalogApi.products({ productId }).get(),
  createProduct: input => catalogApi.products.post(input),
  updateProduct: (productId, input) => catalogApi.products({ productId }).put(input),
  archiveProduct: (productId, input) => catalogApi.products({ productId }).archive.post(input),
  restoreProduct: (productId, input) => catalogApi.products({ productId }).restore.post(input),
  deleteProduct: (productId, input) => catalogApi.products({ productId }).delete(input),
  createVariant: (productId, input) => catalogApi.products({ productId }).variants.post(input),
  updateVariant: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).put(input),
  updateVariantActivation: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).activation.patch(input),
  updateStock: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).stock.patch(input),
  deleteVariant: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).delete(input),
  uploadImage: (productId, input) => catalogApi.products({ productId }).images.post(input),
  updateImage: (productId, imageId, input) =>
    catalogApi.products({ productId }).images({ imageId }).put(input),
  reorderImages: (productId, input) => catalogApi.products({ productId }).images.order.put(input),
  deleteImage: (productId, imageId, input) =>
    catalogApi.products({ productId }).images({ imageId }).delete(input),
}

const orderRequests: OrderRequests = {
  listOrders: filters => api.api.admin.orders.get({ query: filters }),
  getOrder: orderId => api.api.admin.orders({ orderId }).get(),
  updateStatus: (orderId, input) => api.api.admin.orders({ orderId }).status.patch(input),
}

const settingsRequests: SettingsRequests = {
  getStore: () => api.api.admin.settings.store.get(),
  updateStore: input => api.api.admin.settings.store.put(input),
}

const dashboardRoute = createDashboardRoute({
  getParentRoute: () => rootRoute,
  request: () => api.api.admin.dashboard.get(),
  orderHref: orderId => `/admin/orders/${orderId}`,
  catalogHref: productId => `/admin/catalog/${productId}`,
})
const catalogRoutes = createCatalogRoutes(rootRoute, catalogRequests)
const orderRoutes = createOrderRoutes(rootRoute, orderRequests)
const settingsRoute = createSettingsRoute({
  getParentRoute: () => rootRoute,
  requests: settingsRequests,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  ...catalogRoutes.routes,
  ...orderRoutes.routes,
  settingsRoute,
])
const router = createRouter({ routeTree, basepath: '/admin' })

export const adminNavigation = {
  dashboard: () => router.navigate({ to: '/' }),
  catalog: () => router.navigate({ to: '/catalog' }),
  newProduct: () => router.navigate({ to: '/catalog/new' }),
  orders: () => router.navigate({ to: '/orders' }),
  settings: () => router.navigate({ to: '/settings' }),
}

export function AdminRouterProvider(props: ParentProps) {
  return <RouterContextProvider router={router}>{() => props.children}</RouterContextProvider>
}

export function AdminRouter() {
  return <Matches />
}

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router
  }
}
