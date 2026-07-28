import { createRoute } from '@tanstack/solid-router'
import type { AnyRoute } from '@tanstack/solid-router'

import { SettingsPage } from './page'
import type { SettingsRequests } from './query-options'

export type SettingsRouteOptions<TParentRoute extends AnyRoute> = {
  getParentRoute: () => TParentRoute
  requests: SettingsRequests
}

export const createSettingsRoute = <TParentRoute extends AnyRoute>(
  options: SettingsRouteOptions<TParentRoute>,
) =>
  createRoute({
    getParentRoute: options.getParentRoute,
    path: '/settings',
    component: () => <SettingsPage requests={options.requests} />,
  })
