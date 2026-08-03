import { Button } from '@store-kit/ui'
import {
  Link,
  Matches,
  Outlet,
  RouterContextProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/solid-router'
import type { ParentProps } from 'solid-js'

import { createCatalogRoutes } from './catalog/routes'
import { AdminEmptyState } from './components/foundation'
import { createOrderRoutes } from './orders/routes'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './settings/page'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <AdminEmptyState
        action={
          <Button as={Link} to="/">
            Админы нүүр рүү очих
          </Button>
        }
        description="Хаягаа шалгаад дахин оролдоно уу."
        title="Админ хуудас олдсонгүй"
      />
    </main>
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})
const catalogRoutes = createCatalogRoutes(rootRoute)
const orderRoutes = createOrderRoutes(rootRoute)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
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
