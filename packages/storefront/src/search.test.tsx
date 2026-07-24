// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@solidjs/testing-library'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Result } from 'better-result'
import { afterEach, expect, test } from 'vite-plus/test'

import { catalogQuery } from './query-options/catalog'
import { CatalogSearch } from './search'
import type { CatalogSearchProduct } from './search'

const catalogProduct: CatalogSearchProduct = {
  id: 'prod_01arz3ndektsv4rrffq69g5fav',
  slug: 'aster-kit',
  brandId: null,
  categoryId: null,
  name: 'Aster Kit',
  shortDescription: 'A test product',
  description: null,
  status: 'active',
  featured: false,
  details: null,
  useCases: [],
  createdAt: 1,
  updatedAt: 1,
  brand: null,
  category: null,
  images: [],
  variants: [],
}

afterEach(cleanup)

test('CatalogSearch parts bind dialog focus and render prompt, pending, empty, and result outcomes', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  const options = catalogQuery.findAllProducts({ query: 'iem', limit: 8 })
  client.setQueryData(options.queryKey, Result.ok({ items: [], total: 0, limit: 8, offset: 0 }))

  const view = render(() => (
    <QueryClientProvider client={client}>
      <CatalogSearch.Root initialOpen={false}>
        <CatalogSearch.DialogState>
          {dialog => (
            <>
              <button
                ref={dialog.setTriggerElement}
                type="button"
                onClick={() => dialog.setOpen(true)}
              >
                Search
              </button>
              <output aria-label="open">{dialog.open() ? 'open' : 'closed'}</output>
              <button type="button" onClick={() => dialog.setOpen(false)}>
                Close
              </button>
              <button type="button" onClick={dialog.focusInput}>
                Focus
              </button>
            </>
          )}
        </CatalogSearch.DialogState>
        <CatalogSearch.Input>
          {input => (
            <input
              ref={input.setInputElement}
              aria-label="Query"
              value={input.value()}
              onInput={input.onInput}
            />
          )}
        </CatalogSearch.Input>
        <output aria-label="outcome">
          <CatalogSearch.Results
            prompt={() => <>prompt</>}
            pending={() => <>pending</>}
            error={() => <>error</>}
            empty={() => <>empty</>}
          >
            {product => <>result:{product.name}</>}
          </CatalogSearch.Results>
        </output>
      </CatalogSearch.Root>
    </QueryClientProvider>
  ))

  expect(view.getByLabelText('outcome').textContent).toBe('prompt')
  fireEvent.click(view.getByRole('button', { name: 'Search' }))
  expect(view.getByLabelText('open').textContent).toBe('open')
  fireEvent.click(view.getByRole('button', { name: 'Focus' }))
  await waitFor(() => expect(document.activeElement).toBe(view.getByLabelText('Query')))

  fireEvent.input(view.getByLabelText('Query'), { target: { value: '  iem  ' } })
  expect(view.getByLabelText('outcome').textContent).toBe('pending')
  await waitFor(() => expect(view.getByLabelText('outcome').textContent).toBe('empty'))

  client.setQueryData(
    options.queryKey,
    Result.ok({
      items: [catalogProduct],
      total: 1,
      limit: 8,
      offset: 0,
    }),
  )
  await waitFor(() => expect(view.getByLabelText('outcome').textContent).toBe('result:Aster Kit'))

  fireEvent.click(view.getByRole('button', { name: 'Close' }))
  expect(view.getByLabelText('open').textContent).toBe('closed')
  await waitFor(() =>
    expect(document.activeElement).toBe(view.getByRole('button', { name: 'Search' })),
  )
})

test('CatalogSearch Results renders a real query transport-error outcome', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const view = render(() => (
    <QueryClientProvider client={client}>
      <CatalogSearch.Root initialOpen>
        <CatalogSearch.Input>
          {input => (
            <input
              aria-label="Query"
              value={input.value()}
              onInput={input.onInput}
              ref={input.setInputElement}
            />
          )}
        </CatalogSearch.Input>
        <output aria-label="outcome">
          <CatalogSearch.Results
            prompt={() => <>prompt</>}
            pending={() => <>pending</>}
            error={error => <>{error instanceof Error ? error.message : 'error'}</>}
            empty={() => <>empty</>}
          >
            {product => <>{product.name}</>}
          </CatalogSearch.Results>
        </output>
      </CatalogSearch.Root>
    </QueryClientProvider>
  ))

  fireEvent.input(view.getByLabelText('Query'), { target: { value: 'error' } })
  await waitFor(() => expect(view.getByLabelText('outcome').textContent).toContain('fetch failed'))
})
