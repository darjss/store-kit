import { Value } from 'typebox/value'
import { expect, test } from 'vite-plus/test'

import { catalogSearchInputSchema, catalogSearchResultSchema } from './catalog'

test('catalog search contracts bound server input and compact browser results', () => {
  expect(Value.Check(catalogSearchInputSchema, { query: 'хүрэм' })).toBe(true)
  expect(Value.Check(catalogSearchInputSchema, { query: 'x' })).toBe(false)
  expect(Value.Check(catalogSearchInputSchema, { query: 'хүрэм', limit: 100 })).toBe(false)

  const result = {
    items: [
      {
        slug: 'shiljilt-bridge-coat',
        name: 'Шилжилт хүрэм',
        shortDescription: 'Өдөр тутмын гадуур давхарга.',
        image: null,
        priceMnt: 479_000,
        stockStatus: 'low-stock',
      },
    ],
    total: 1,
  }

  expect(Value.Check(catalogSearchResultSchema, result)).toBe(true)
  expect(
    Value.Check(catalogSearchResultSchema, {
      ...result,
      items: [{ ...result.items[0], stockQuantity: 3 }],
    }),
  ).toBe(false)
})
