import type { ProductNotFound } from '@store-kit/contracts/catalog'

export const createProductNotFound = (slug: string) =>
  ({
    _tag: 'ProductNotFound',
    message: `Product not found: ${slug}`,
    slug,
  }) satisfies ProductNotFound
