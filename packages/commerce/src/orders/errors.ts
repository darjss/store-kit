import type { PrivateOrderError } from '@store-kit/contracts/orders'

export const invalidStatusToken = () =>
  ({
    _tag: 'InvalidStatusToken',
    message: 'Захиалга олдсонгүй.',
  }) satisfies PrivateOrderError
