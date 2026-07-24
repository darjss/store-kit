const homeProductSlugs = ['tangzu-waner-2-red-lion', 'truthear-keyx', 'kz-prx'] as const

export const selectHomeProducts = <T extends { slug: string }>(products: T[]) => {
  const selected = homeProductSlugs.map(slug => products.find(product => product.slug === slug))
  if (selected.some(product => !product))
    throw new Error('Homepage products are missing from the catalog.')
  return selected as [T, T, T]
}
