import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import {
  insertProductSchema,
  productListFiltersSchema,
  slugSchema,
  updateProductSchema,
} from './catalog'

test('catalog refinements validate slugs and filter bounds', () => {
  expect(Value.Check(slugSchema, 'valid-slug')).toBe(true)
  expect(Value.Check(slugSchema, 'Invalid Slug')).toBe(false)
  expect(Value.Check(productListFiltersSchema, { minPrice: 0, maxPrice: 10, limit: 100 })).toBe(
    true,
  )
  expect(Value.Check(productListFiltersSchema, { minPrice: -1 })).toBe(false)
  expect(Value.Check(productListFiltersSchema, { limit: 101 })).toBe(false)
})

test('generated product schemas keep insert and update optionality', () => {
  expect(Value.Check(insertProductSchema, {})).toBe(false)
  expect(Value.Check(updateProductSchema, {})).toBe(true)
  expect(Value.Check(updateProductSchema, { slug: 'valid-slug' })).toBe(true)
  expect(Value.Check(updateProductSchema, { slug: 'Invalid Slug' })).toBe(false)
})
