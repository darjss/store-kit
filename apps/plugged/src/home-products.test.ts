import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, test } from 'vite-plus/test'

import { selectHomeProducts } from './home-products'

const catalog = JSON.parse(
  await readFile(resolve(process.cwd(), 'apps/plugged/data/catalog.seed.json'), 'utf8'),
) as {
  products: Array<{
    slug: string
    categorySlug: string
    variants: Array<{ priceMnt: number }>
  }>
}

describe('homepage merchandising', () => {
  test('selects the connected IEM, DAC, and secondary IEM from the real catalog', () => {
    const selected = selectHomeProducts(catalog.products)

    expect(selected.map(product => [product.slug, product.categorySlug])).toEqual([
      ['tangzu-waner-2-red-lion', 'in-ear-monitors'],
      ['truthear-keyx', 'portable-audio'],
      ['kz-prx', 'in-ear-monitors'],
    ])
    expect(selected.map(product => product.variants[0]?.priceMnt)).toEqual([135000, 130000, 105000])
  })

  test('does not select a standalone cable product', () => {
    expect(
      selectHomeProducts(catalog.products).some(product => product.categorySlug === 'cables'),
    ).toBe(false)
  })
})
