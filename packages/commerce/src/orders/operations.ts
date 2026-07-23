import { query as dbQuery } from '@store-kit/db'
import { Result } from 'better-result'

import { hashStatusToken } from './status-token'

const getPrivateStatus = async (orderId: string, statusToken: string) => {
  const order = await dbQuery.orders.findPrivate(orderId, await hashStatusToken(statusToken))
  if (!order)
    return Result.err({ _tag: 'InvalidStatusToken' as const, message: 'Захиалга олдсонгүй.' })
  return Result.ok(order)
}

export const orderOperations = { getPrivateStatus }
