import { systemStatusOptions } from '@store-kit/storefront'
import { Button } from '@store-kit/ui'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/solid-query'
import { Match, Switch } from 'solid-js'

function SystemResult() {
  const query = useQuery(systemStatusOptions)

  return (
    <section class="mt-8 space-y-4" aria-labelledby="system-result-heading">
      <h2 id="system-result-heading" class="text-lg font-medium">
        System Result
      </h2>

      <Switch>
        <Match when={query.isPending}>
          <p>Loading system status…</p>
        </Match>
        <Match when={query.error}>{error => <p>Request failed: {error().message}</p>}</Match>
        <Match when={query.data}>
          {result => (
            <pre class="overflow-auto rounded-md bg-neutral-100 p-4 text-sm">
              {JSON.stringify(result(), null, 2)}
            </pre>
          )}
        </Match>
      </Switch>

      <Button type="button" onClick={() => void query.refetch()}>
        Refresh
      </Button>
    </section>
  )
}

export function FoundationStatus() {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <SystemResult />
    </QueryClientProvider>
  )
}
