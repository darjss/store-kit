import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vite-plus/test'

type Seed = {
  categories: { slug: string; name: string }[]
  products: {
    slug: string
    categorySlug?: string
    images: { source: string }[]
  }[]
}

const seedPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apps/plugged/data/catalog.seed.json',
)

test('Plugged seed sells IEMs and DACs, reserves eartips, and excludes cables', async () => {
  const seed = JSON.parse(await readFile(seedPath, 'utf8')) as Seed
  const categories = Object.fromEntries(
    seed.categories.map(category => [category.slug, category.name]),
  )

  expect(categories).toEqual({
    'in-ear-monitors': 'IEMs',
    'portable-audio': 'DACs',
    'eartips': 'Eartips',
  })
  expect(seed.products.every(product => product.categorySlug !== 'eartips')).toBe(true)
  expect(
    seed.products.every(product =>
      ['in-ear-monitors', 'portable-audio'].includes(product.categorySlug ?? ''),
    ),
  ).toBe(true)
  expect(seed.products.some(product => product.categorySlug === 'in-ear-monitors')).toBe(true)
  expect(seed.products.some(product => product.categorySlug === 'portable-audio')).toBe(true)
  expect(seed.products.some(product => product.slug.includes('cable'))).toBe(false)
  expect(
    seed.products.flatMap(product => product.images).every(image => !image.source.includes('://')),
  ).toBe(true)
})
