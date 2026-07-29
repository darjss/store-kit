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
        activeCatalogRequest={options.activeCatalogRequest}
        catalogHref={options.catalogHref}
        draftCatalogRequest={options.draftCatalogRequest}
        inventoryHref={options.inventoryHref}
        newProductHref={options.newProductHref}
        orderHref={options.orderHref}
        ordersHref={options.ordersHref}
        request={options.request}
        settingsHref={options.settingsHref}
        storefrontHref={options.storefrontHref}
      />
    ),
  })
