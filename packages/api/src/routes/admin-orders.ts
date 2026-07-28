import { commerce } from '@store-kit/commerce'
import {
  adminOrderListFiltersSchema,
  adminOrderStatusUpdateSchema,
} from '@store-kit/contracts/admin-orders'
import { orderIdPattern } from '@store-kit/contracts/orders'
import { Result } from 'better-result'
import { t } from 'elysia'

import { contractBody, contractQuery } from '~/typebox-contract'

import { createApprovedAdminRoutes } from './approved-admin'

const orderParams = t.Object(
  { orderId: t.String({ pattern: orderIdPattern }) },
  { additionalProperties: false },
)

export const adminOrderRoutes = createApprovedAdminRoutes()
  .get(
    '/orders',
    async ({ query }) => Result.serialize(await commerce.orders.listAdminOrders(query)),
    { query: contractQuery(adminOrderListFiltersSchema) },
  )
  .get(
    '/orders/:orderId',
    async ({ params }) => Result.serialize(await commerce.orders.getAdminOrder(params.orderId)),
    { params: orderParams },
  )
  .patch(
    '/orders/:orderId/status',
    async ({ body, params }) =>
      Result.serialize(await commerce.orders.updateAdminStatus(params.orderId, body)),
    {
      body: contractBody(adminOrderStatusUpdateSchema),
      params: orderParams,
    },
  )
