type CatalogParam = 'brand' | 'category' | 'query' | 'useCase'

type CatalogPatch = Partial<Record<CatalogParam, string | undefined>>

const catalogParams: CatalogParam[] = ['brand', 'category', 'query', 'useCase']

export function catalogHref(current: URLSearchParams, patch: CatalogPatch = {}) {
  const next = new URLSearchParams()

  for (const name of catalogParams) {
    const value = name in patch ? patch[name] : current.get(name)
    if (value) next.set(name, value)
  }

  const query = next.toString()
  return query ? `/products?${query}` : '/products'
}
