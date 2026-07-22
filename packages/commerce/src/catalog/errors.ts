export type ProductNotFound = {
  _tag: 'ProductNotFound'
  message: string
  slug: string
}

export const createProductNotFound = (slug: string) =>
  ({
    _tag: 'ProductNotFound',
    message: `Product not found: ${slug}`,
    slug,
  }) satisfies ProductNotFound
