import { createRouter } from '@solidjs/router'

import CatalogPage from '~/routes/CatalogPage'
import CheckoutPage from '~/routes/CheckoutPage'
import HomePage from '~/routes/HomePage'
import NotFoundPage from '~/routes/NotFoundPage'
import OrderPage from '~/routes/OrderPage'
import ProductPage from '~/routes/ProductPage'
import ReviewPage from '~/routes/ReviewPage'

import { catalogSearchStandardSchema } from './catalog-search'

export const routeTitle = (pathname: string) => {
  if (pathname === '/') return 'Нүүр · ДУНД'
  if (pathname === '/products') return 'Капсул · ДУНД'
  if (pathname.startsWith('/products/')) return 'Бараа · ДУНД'
  if (pathname === '/checkout') return 'Захиалга · ДУНД'
  if (pathname.startsWith('/orders/')) return 'Захиалгын төлөв · ДУНД'
  if (pathname === '/review/solid2' || pathname === '/review/solid2/') {
    return 'Astro vs Solid 2 architecture review · ДУНД'
  }
  return '404 · ДУНД'
}

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
    { path: '/review/solid2', component: ReviewPage },
    { path: '*404', component: NotFoundPage },
  ],
})

export const { paths } = Router
