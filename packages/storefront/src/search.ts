import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import { catalogQuery } from './query-options/catalog'
import { useQueryResult } from './query-options/result'

type CatalogSearchControllerOptions = {
  initialOpen: boolean
}

export function createCatalogSearchController(options: CatalogSearchControllerOptions) {
  const [open, setOpenState] = createSignal(options.initialOpen)
  const [queryText, setQueryText] = createSignal('')
  const [debouncedQuery, setDebouncedQuery] = createSignal('')
  let inputElement: HTMLInputElement | undefined
  let triggerElement: HTMLElement | undefined

  createEffect(() => {
    const value = queryText().trim()
    const timer = setTimeout(() => setDebouncedQuery(value), 250)
    onCleanup(() => clearTimeout(timer))
  })

  const results = useQueryResult(() => ({
    ...catalogQuery.findAllProducts({ query: debouncedQuery(), limit: 8 }),
    enabled: debouncedQuery().length > 1,
  }))

  const state = createMemo(() => {
    const query = queryText().trim()
    if (query.length < 2) return { type: 'prompt' as const }
    if (query !== debouncedQuery() || results.isPending || results.isFetching)
      return { type: 'pending' as const }
    if (results.isError) return { type: 'error' as const, error: results.error }

    const catalog = results.data?.status === 'ok' ? results.data.value : undefined
    if (!catalog) return { type: 'pending' as const }
    return catalog.items.length === 0
      ? { type: 'empty' as const }
      : { type: 'results' as const, catalog }
  })

  const setOpen = (value: boolean) => {
    setOpenState(value)
    if (!value) queueMicrotask(() => triggerElement?.focus())
  }

  return {
    open,
    queryText,
    debouncedQuery,
    state,
    setQueryText,
    setOpen,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
    focusInput: () => queueMicrotask(() => inputElement?.focus()),
    retry: results.refetch,
    setInputElement: (element: HTMLInputElement) => {
      inputElement = element
    },
    setTriggerElement: (element: HTMLElement) => {
      triggerElement = element
    },
  }
}

export type CatalogSearchState = ReturnType<
  ReturnType<typeof createCatalogSearchController>['state']
>
