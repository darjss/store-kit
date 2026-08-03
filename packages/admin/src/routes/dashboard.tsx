import { createRoute } from '@tanstack/solid-router'
import type { AnyRoute } from '@tanstack/solid-router'

import { DashboardPage } from '../pages/DashboardPage'
import type { DashboardPageProps } from '../pages/DashboardPage'

export const createDashboardRoute = <TParentRoute extends AnyRoute>(
  getParentRoute: () => TParentRoute,
  requests: DashboardPageProps,
) =>
  createRoute({
    getParentRoute,
    path: '/',
    component: () => <DashboardPage {...requests} />,
  })
