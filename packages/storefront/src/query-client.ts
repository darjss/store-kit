import { QueryCache, QueryClient } from '@tanstack/solid-query'

export const createStorefrontQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: error => {
        if (typeof window !== 'undefined')
          window.dispatchEvent(new CustomEvent('storefront:transport-error', { detail: error }))
      },
    }),
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  })
