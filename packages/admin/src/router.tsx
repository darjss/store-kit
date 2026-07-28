import {
  Matches,
  Outlet,
  RouterContextProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/solid-router'
import type { ParentProps } from 'solid-js'

import { PageHeader } from './components/foundation'

const rootRoute = createRootRoute({ component: Outlet })

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

const routeTree = rootRoute.addChildren([dashboardRoute])
const router = createRouter({ routeTree, basepath: '/admin' })

export const adminNavigation = {
  dashboard: () => router.navigate({ to: '/' }),
}

function Dashboard() {
  return (
    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        description="Store operations and management tools appear in this workspace."
        title="Dashboard"
        titleId="dashboard-title"
      />
    </section>
  )
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
