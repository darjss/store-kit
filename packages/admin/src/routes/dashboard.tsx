import { createRoute } from '@tanstack/solid-router'
import type { AnyRoute } from '@tanstack/solid-router'

import { DashboardPage } from '../pages/DashboardPage'
import type { DashboardPageProps } from '../pages/DashboardPage'

export type DashboardRouteOptions<TParentRoute extends AnyRoute> = DashboardPageProps & {
  getParentRoute: () => TParentRoute
}

export const createDashboardRoute = <TParentRoute extends AnyRoute>(
  options: DashboardRouteOptions<TParentRoute>,
) =>
  createRoute({
    getParentRoute: options.getParentRoute,
    path: '/',
    component: () => (
      <DashboardPage
        catalogHref={options.catalogHref}
        orderHref={options.orderHref}
        request={options.request}
      />
    ),
  })
