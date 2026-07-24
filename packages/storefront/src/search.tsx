import { match } from 'dismatch'
import {
  For,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js'
import type { Accessor, JSX, ParentProps } from 'solid-js'

import { catalogQuery } from './query-options/catalog'
import { useQueryResult } from './query-options/result'

type CatalogSearchRootProps = ParentProps<{ initialOpen: boolean }>

function createCatalogSearchState(options: { initialOpen: boolean }) {
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
    state,
    setQueryText,
    setOpen,
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

type CatalogSearchContextValue = ReturnType<typeof createCatalogSearchState>
const CatalogSearchContext = createContext<CatalogSearchContextValue>()

export function useCatalogSearch() {
  const search = useContext(CatalogSearchContext)
  if (!search) throw new Error('CatalogSearch components must be inside CatalogSearch.Root.')
  return search
}

function Root(props: CatalogSearchRootProps) {
  const search = createCatalogSearchState({ initialOpen: props.initialOpen })
  return (
    <CatalogSearchContext.Provider value={search}>{props.children}</CatalogSearchContext.Provider>
  )
}

type DialogStateProps = {
  children: (state: {
    open: Accessor<boolean>
    setOpen: (value: boolean) => void
    focusInput: () => void
    setTriggerElement: (element: HTMLElement) => void
  }) => JSX.Element
}

function DialogState(props: DialogStateProps) {
  const search = useCatalogSearch()
  return props.children({
    open: search.open,
    setOpen: search.setOpen,
    focusInput: search.focusInput,
    setTriggerElement: search.setTriggerElement,
  })
}

type InputProps = {
  children: (binding: {
    value: Accessor<string>
    setInputElement: (element: HTMLInputElement) => void
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => void
  }) => JSX.Element
}

function Input(props: InputProps) {
  const search = useCatalogSearch()
  return props.children({
    value: search.queryText,
    setInputElement: search.setInputElement,
    onInput: event => search.setQueryText(event.currentTarget.value),
  })
}

export type CatalogSearchState = ReturnType<ReturnType<typeof createCatalogSearchState>['state']>

type ResultsState = Extract<CatalogSearchState, { type: 'results' }>
export type CatalogSearchProduct = ResultsState['catalog']['items'][number]

type ResultsProps = {
  prompt: () => JSX.Element
  pending: () => JSX.Element
  error: (error: unknown, retry: () => void) => JSX.Element
  empty: () => JSX.Element
  children: (product: CatalogSearchProduct) => JSX.Element
}

function Results(props: ResultsProps) {
  const search = useCatalogSearch()

  return (
    <>
      {match(
        search.state(),
        'type',
      )<JSX.Element>({
        prompt: props.prompt,
        pending: props.pending,
        error: ({ error }) => props.error(error, () => void search.retry()),
        empty: props.empty,
        results: ({ catalog }) => <For each={catalog.items}>{props.children}</For>,
      })}
    </>
  )
}

export const CatalogSearch = { Root, DialogState, Input, Results }
