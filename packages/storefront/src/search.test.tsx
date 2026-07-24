// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@solidjs/testing-library'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { afterEach, expect, test } from 'vite-plus/test'

import { catalogQuery } from './query-options/catalog'
import { createCatalogSearchController } from './search'

afterEach(cleanup)

test('search controller debounces through a real query result and restores focus on close', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  const options = catalogQuery.findAllProducts({ query: 'iem', limit: 8 })
  client.setQueryData(options.queryKey, Result.ok({ items: [], total: 0, limit: 8, offset: 0 }))

  let search!: ReturnType<typeof createCatalogSearchController>

  function Fixture() {
    search = createCatalogSearchController({ initialOpen: false })
    return (
      <>
        <button ref={search.setTriggerElement} type="button">
          Search
        </button>
        <input ref={search.setInputElement} aria-label="Query" />
        <output>{search.state().type}</output>
      </>
    )
  }

  render(() => (
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  ))

  expect(search.state().type).toBe('prompt')
  search.openDialog()
  expect(search.open()).toBe(true)
  search.focusInput()
  await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Query'))

  search.setQueryText('  iem  ')
  expect(search.state().type).toBe('pending')
  await waitFor(() => expect(search.debouncedQuery()).toBe('iem'))
  await waitFor(() => expect(search.state().type).toBe('empty'))

  search.closeDialog()
  expect(search.open()).toBe(false)
  await waitFor(() => expect(document.activeElement?.textContent).toBe('Search'))
})
