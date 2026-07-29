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

const catalogRequests: CatalogRequests = {
  listProducts: filters => api.api.admin.catalog.products.get({ query: filters }),
  getProduct: productId => api.api.admin.catalog.products({ productId }).get(),
  updateProduct: (productId, input) => api.api.admin.catalog.products({ productId }).patch(input),
  updateVariant: (productId, variantId, input) =>
    api.api.admin.catalog.products({ productId }).variants({ variantId }).patch(input),
  updateStock: (productId, variantId, input) =>
    api.api.admin.catalog.products({ productId }).variants({ variantId }).stock.patch(input),
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
