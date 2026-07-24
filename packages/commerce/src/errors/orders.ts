import type { PrivateOrderError } from '@store-kit/contracts/private-orders'

export const invalidStatusToken = () =>
  ({
    _tag: 'InvalidStatusToken',
    message: 'Захиалга олдсонгүй.',
  }) satisfies PrivateOrderError
