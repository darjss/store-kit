import { expect, test } from 'vite-plus/test'

import { catalogHref } from './catalog-links'

test('catalog links preserve compatible search and filter state', () => {
  const current = new URLSearchParams({
    category: 'in-ear-monitors',
    query: 'tangzu',
    useCase: 'bass',
  })

  expect(catalogHref(current, { brand: 'tangzu' })).toBe(
    '/products?brand=tangzu&category=in-ear-monitors&query=tangzu&useCase=bass',
  )
  expect(catalogHref(current, { category: undefined })).toBe('/products?query=tangzu&useCase=bass')
  expect(catalogHref(current, { query: undefined, useCase: undefined })).toBe(
    '/products?category=in-ear-monitors',
  )
})
