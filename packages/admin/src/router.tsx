import { Home2 } from '@solar-icons/solid/Linear'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/solid-router'

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
    <section
      aria-labelledby="dashboard-title"
      class="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-12"
    >
      <div class="mb-8 flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
        <Home2 size={24} />
      </div>
      <p class="mb-2 text-sm font-medium text-muted-foreground">Store administration</p>
      <h1 id="dashboard-title" class="text-3xl font-semibold tracking-tight sm:text-4xl">
        Dashboard
      </h1>
      <p class="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
        Your store management workspace is ready.
      </p>
    </section>
  )
}

export function AdminRouter() {
  return <RouterProvider router={router} />
}

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router
  }
}
