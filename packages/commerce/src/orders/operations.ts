import { database } from '@store-kit/db'
import { Result } from 'better-result'

import { invalidStatusToken } from '../errors'
import { hashStatusToken } from './status-token'

const getPrivateStatus = async (orderId: string, statusToken: string) => {
  const order = await database.query.orders.findPrivate(orderId, await hashStatusToken(statusToken))
  if (!order) return Result.err(invalidStatusToken())
  return Result.ok(order)
}

export const orderOperations = { getPrivateStatus }
