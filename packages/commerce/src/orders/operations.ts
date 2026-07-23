import type { PrivateOrderError } from '@store-kit/contracts/orders'
import { database } from '@store-kit/db'
import { Result } from 'better-result'

import { invalidStatusToken } from '~/errors'

import { hashStatusToken } from './status-token'

type PrivateOrder = NonNullable<Awaited<ReturnType<typeof database.query.orders.findPrivate>>>

const getPrivateStatus = async (orderId: string, statusToken: string) => {
  const order = await database.query.orders.findPrivate(orderId, await hashStatusToken(statusToken))
  if (!order) return Result.err<PrivateOrder, PrivateOrderError>(invalidStatusToken())
  return Result.ok<PrivateOrder, PrivateOrderError>(order)
}

export const orderOperations = { getPrivateStatus }
