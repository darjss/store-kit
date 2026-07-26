import { createRouter } from '@solidjs/router'

import CatalogPage from '~/routes/CatalogPage'
import CheckoutPage from '~/routes/CheckoutPage'
import HomePage from '~/routes/HomePage'
import NotFoundPage from '~/routes/NotFoundPage'
import OrderPage from '~/routes/OrderPage'
import ProductPage from '~/routes/ProductPage'

import { catalogSearchStandardSchema } from './catalog-search'

export const Router = createRouter({
  routes: [
    { path: '/', component: HomePage },
    {
      path: '/products',
      component: CatalogPage,
      search: catalogSearchStandardSchema,
    },
    { path: '/products/:slug', component: ProductPage },
    { path: '/checkout', component: CheckoutPage },
    { path: '/orders/:id', component: OrderPage },
    { path: '*404', component: NotFoundPage },
  ],
})

export const { paths } = Router
