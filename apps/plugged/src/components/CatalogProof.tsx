import { catalogQuery } from '@store-kit/storefront'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/solid-query'
import { Match, Switch } from 'solid-js'

function CatalogResult() {
  const query = useQuery(() => catalogQuery.findAllProducts({ limit: 1 }))

  return (
    <section class="mt-8 space-y-2" aria-labelledby="catalog-proof-heading">
      <h2 id="catalog-proof-heading" class="text-lg font-medium">
        Catalog proof
      </h2>

      <Switch>
        <Match when={query.isPending}>
          <p>Loading catalog…</p>
        </Match>
        <Match when={query.isError}>
          <p>Catalog request failed.</p>
        </Match>
        <Match when={query.data?.status === 'ok' ? query.data.value : undefined}>
          {catalog => (
            <>
              <p>Items: {catalog().total}</p>
              <p>First slug: {catalog().items[0]?.slug ?? 'none'}</p>
            </>
          )}
        </Match>
        <Match when={query.data?.status === 'error'}>
          <p>Catalog result failed.</p>
        </Match>
      </Switch>
    </section>
  )
}

export function CatalogProof() {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogResult />
    </QueryClientProvider>
  )
}
