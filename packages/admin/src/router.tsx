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

const catalogApi = api.api.admin.catalog

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
  activeCatalogRequest: () =>
    catalogApi.products.get({ query: { limit: 1, offset: 0, status: 'active' } }),
  draftCatalogRequest: () =>
    catalogApi.products.get({ query: { limit: 1, offset: 0, status: 'draft' } }),
  orderHref: orderId => `/admin/orders/${orderId}`,
  ordersHref: status => `/admin/orders${status ? `?status=${status}` : ''}`,
  inventoryHref: '/admin/catalog?inventory=low',
  catalogHref: productId => `/admin/catalog/${productId}`,
  newProductHref: '/admin/catalog/new',
  settingsHref: '/admin/settings',
  storefrontHref: '/',
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
