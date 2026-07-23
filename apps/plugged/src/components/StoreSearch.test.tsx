// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createStorefrontQueryClient } from '@store-kit/storefront/query-client'
import { QueryClientProvider } from '@tanstack/solid-query'
import { afterEach, expect, test } from 'vite-plus/test'

import { StoreSearch } from './StoreSearch'

afterEach(cleanup)

test('search opens on demand and restores focus when it closes', async () => {
  render(() => (
    <QueryClientProvider client={createStorefrontQueryClient()}>
      <StoreSearch initialOpen={false} />
    </QueryClientProvider>
  ))
  const searchTrigger = screen.getByRole('button', { name: 'Хайх' })

  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(searchTrigger)

  const input = await screen.findByLabelText('Бараа хайх')
  await waitFor(() => expect(document.activeElement).toBe(input))
  expect(document.body.style.overflow).toBe('hidden')

  fireEvent.click(screen.getByRole('button', { name: 'Хайлт хаах' }))
  await waitFor(() => expect(document.activeElement).toBe(searchTrigger))
  expect(document.body.style.overflow).toBe('')
})
