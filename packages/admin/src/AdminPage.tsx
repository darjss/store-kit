import { createSignal } from 'solid-js'

import { CatalogCreatePage } from './catalog/create'
import { CatalogDetailPage } from './catalog/detail'
import type { CatalogListSearch } from './catalog/list'
import { CatalogListPage } from './catalog/list'
import type { CatalogRequests } from './catalog/query-options'
import { api } from './client'
import { OrderDetailPage } from './orders/detail'
import type { OrderListSearch } from './orders/list'
import { OrderListPage } from './orders/list'
import type { OrderRequests } from './orders/query-options'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './settings/page'
import type { SettingsRequests } from './settings/query-options'

type SearchValues = Record<string, string | undefined>

export type AdminRoute =
  | { name: 'dashboard' }
  | { name: 'catalog-list'; search: SearchValues }
  | { name: 'catalog-create' }
  | { name: 'catalog-detail'; productId: string; search: SearchValues }
  | { name: 'order-list'; search: SearchValues }
  | { name: 'order-detail'; orderId: string }
  | { name: 'settings' }

const catalogApi = api.api.admin.catalog

const catalogRequests: CatalogRequests = {
  listProducts: filters => catalogApi.products.get({ query: filters }),
  listSelectors: () => catalogApi.selectors.get(),
  getProduct: productId => catalogApi.products({ productId }).get(),
  createProduct: input => catalogApi.products.post(input),
  updateProduct: (productId, input) => catalogApi.products({ productId }).put(input),
  archiveProduct: (productId, input) => catalogApi.products({ productId }).archive.post(input),
  restoreProduct: (productId, input) => catalogApi.products({ productId }).restore.post(input),
  deleteProduct: (productId, input) => catalogApi.products({ productId }).delete(input),
  createVariant: (productId, input) => catalogApi.products({ productId }).variants.post(input),
  updateVariant: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).put(input),
  updateVariantActivation: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).activation.patch(input),
  updateStock: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).stock.patch(input),
  deleteVariant: (productId, variantId, input) =>
    catalogApi.products({ productId }).variants({ variantId }).delete(input),
  uploadImage: (productId, input) => catalogApi.products({ productId }).images.post(input),
  updateImage: (productId, imageId, input) =>
    catalogApi.products({ productId }).images({ imageId }).put(input),
  reorderImages: (productId, input) => catalogApi.products({ productId }).images.order.put(input),
  deleteImage: (productId, imageId, input) =>
    catalogApi.products({ productId }).images({ imageId }).delete(input),
}

const orderRequests: OrderRequests = {
  listOrders: filters => api.api.admin.orders.get({ query: filters }),
  getOrder: orderId => api.api.admin.orders({ orderId }).get(),
  updateStatus: (orderId, input) => api.api.admin.orders({ orderId }).status.patch(input),
}

const settingsRequests: SettingsRequests = {
  getStore: () => api.api.admin.settings.store.get(),
  updateStore: input => api.api.admin.settings.store.put(input),
}

const integerSearchValue = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const candidate = typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isInteger(candidate) && candidate >= minimum && candidate <= maximum
    ? candidate
    : fallback
}

const normalizeCatalogSearch = (search: SearchValues): CatalogListSearch => ({
  ...(search.query?.trim() ? { query: search.query.trim() } : {}),
  ...(search.status === 'draft' || search.status === 'active' || search.status === 'archived'
    ? { status: search.status }
    : {}),
  inventory: search.inventory === 'low' || search.inventory === 'out' ? search.inventory : 'all',
  limit: integerSearchValue(search.limit, 24, 1, 100),
  offset: integerSearchValue(search.offset, 0, 0, Number.MAX_SAFE_INTEGER),
})

const normalizeOrderSearch = (search: SearchValues): OrderListSearch => ({
  ...(search.query?.trim() ? { query: search.query.trim() } : {}),
  ...(search.status === 'new' ||
  search.status === 'confirmed' ||
  search.status === 'preparing' ||
  search.status === 'delivering' ||
  search.status === 'completed' ||
  search.status === 'cancelled'
    ? { status: search.status }
    : {}),
  ...(search.paymentStatus === 'pending' ||
  search.paymentStatus === 'claimed' ||
  search.paymentStatus === 'confirming' ||
  search.paymentStatus === 'paid' ||
  search.paymentStatus === 'failed'
    ? { paymentStatus: search.paymentStatus }
    : {}),
  limit: integerSearchValue(search.limit, 25, 1, 100),
  offset: integerSearchValue(search.offset, 0, 0, Number.MAX_SAFE_INTEGER),
})

const catalogListHref = (search: CatalogListSearch) => {
  const parameters = new URLSearchParams()
  if (search.query) parameters.set('query', search.query)
  if (search.status) parameters.set('status', search.status)
  if (search.inventory !== 'all') parameters.set('inventory', search.inventory)
  if (search.limit !== 24) parameters.set('limit', String(search.limit))
  if (search.offset > 0) parameters.set('offset', String(search.offset))
  const query = parameters.toString()
  return `/admin/catalog${query ? `?${query}` : ''}`
}

const orderListHref = (search: OrderListSearch) => {
  const parameters = new URLSearchParams()
  if (search.query) parameters.set('query', search.query)
  if (search.status) parameters.set('status', search.status)
  if (search.paymentStatus) parameters.set('paymentStatus', search.paymentStatus)
  if (search.limit !== 25) parameters.set('limit', String(search.limit))
  if (search.offset > 0) parameters.set('offset', String(search.offset))
  const query = parameters.toString()
  return `/admin/orders${query ? `?${query}` : ''}`
}

const navigate = (href: string, replace = false) => {
  if (replace) window.location.replace(href)
  else window.location.assign(href)
}

function CatalogListRoute(props: { search: SearchValues }) {
  const [search, setSearch] = createSignal(normalizeCatalogSearch(props.search))
  return (
    <CatalogListPage
      onNewProduct={() => navigate('/admin/catalog/new')}
      productHref={productId => `/admin/catalog/${productId}`}
      requests={catalogRequests}
      search={search()}
      onSearchChange={next => {
        setSearch(next)
        window.history.replaceState(null, '', catalogListHref(next))
      }}
    />
  )
}

function CatalogDetailRoute(props: { productId: string; search: SearchValues }) {
  const [variantSelection, setVariantSelection] = createSignal(props.search.variant?.trim())
  return (
    <CatalogDetailPage
      productId={props.productId}
      requests={catalogRequests}
      variantSelection={variantSelection()}
      onBack={() => navigate('/admin/catalog')}
      onVariantSelectionChange={selection => {
        setVariantSelection(selection)
        const parameters = new URLSearchParams()
        if (selection) parameters.set('variant', selection)
        const query = parameters.toString()
        window.history.replaceState(
          null,
          '',
          `/admin/catalog/${props.productId}${query ? `?${query}` : ''}`,
        )
      }}
    />
  )
}

function OrderListRoute(props: { search: SearchValues }) {
  const [search, setSearch] = createSignal(normalizeOrderSearch(props.search))
  return (
    <OrderListPage
      orderHref={orderId => `/admin/orders/${orderId}`}
      requests={orderRequests}
      search={search()}
      onSearchChange={next => {
        setSearch(next)
        window.history.replaceState(null, '', orderListHref(next))
      }}
    />
  )
}

export function AdminPage(props: { route: AdminRoute }) {
  switch (props.route.name) {
    case 'dashboard':
      return (
        <DashboardPage
          activeCatalogRequest={() =>
            catalogApi.products.get({ query: { limit: 1, offset: 0, status: 'active' } })
          }
          catalogHref={productId => `/admin/catalog/${productId}`}
          draftCatalogRequest={() =>
            catalogApi.products.get({ query: { limit: 1, offset: 0, status: 'draft' } })
          }
          inventoryHref="/admin/catalog?inventory=low"
          newProductHref="/admin/catalog/new"
          orderHref={orderId => `/admin/orders/${orderId}`}
          ordersHref={status => `/admin/orders${status ? `?status=${status}` : ''}`}
          request={() => api.api.admin.dashboard.get()}
          settingsHref="/admin/settings"
          storefrontHref="/"
        />
      )
    case 'catalog-list':
      return <CatalogListRoute search={props.route.search} />
    case 'catalog-create':
      return (
        <CatalogCreatePage
          requests={catalogRequests}
          onBack={() => navigate('/admin/catalog')}
          onCreated={productId => navigate(`/admin/catalog/${productId}`, true)}
        />
      )
    case 'catalog-detail':
      return <CatalogDetailRoute productId={props.route.productId} search={props.route.search} />
    case 'order-list':
      return <OrderListRoute search={props.route.search} />
    case 'order-detail':
      return (
        <OrderDetailPage
          orderId={props.route.orderId}
          requests={orderRequests}
          onBack={() => navigate('/admin/orders')}
        />
      )
    case 'settings':
      return <SettingsPage requests={settingsRequests} />
  }
}
