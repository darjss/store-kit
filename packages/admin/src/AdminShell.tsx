import { ColorModeProvider, Toaster } from '@store-kit/ui'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/solid-query'

import { AdminSessionBoundary } from './auth'
import { isAdminSessionInvalidError } from './query-options/result'
import { adminSessionKey } from './query-options/session'

export function AdminShell(props: { storeName: string }) {
  let queryClient: QueryClient
  const refreshSession = (error: unknown) => {
    if (isAdminSessionInvalidError(error))
      void queryClient.invalidateQueries({ queryKey: adminSessionKey })
  }
  queryClient = new QueryClient({
    mutationCache: new MutationCache({ onError: refreshSession }),
    queryCache: new QueryCache({ onError: refreshSession }),
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
  })

  return (
    <ColorModeProvider initialColorMode="light">
      <QueryClientProvider client={queryClient}>
        <div data-admin-spa-root>
          <AdminSessionBoundary storeName={props.storeName} />
        </div>
        <Toaster />
      </QueryClientProvider>
    </ColorModeProvider>
  )
}
