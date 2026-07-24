import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vite-plus/test'

const pluggedDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(pluggedDirectory, '../..')
const legacyMediaPath = ['/media', '/'].join('')

const sourceFiles = async (directory: string) => {
  const entries = await readdir(directory, { recursive: true })
  return entries
    .filter(entry => /\.(astro|ts|tsx)$/.test(entry))
    .map(entry => join(directory, entry))
    .filter(path => path !== fileURLToPath(import.meta.url))
}

describe('catalog media delivery architecture', () => {
  test('contains no local catalog media path in app or API source', async () => {
    const paths = [
      ...(await sourceFiles(resolve(pluggedDirectory, 'src'))),
      ...(await sourceFiles(resolve(projectRoot, 'packages/api/src'))),
    ]

    const offenders = (
      await Promise.all(
        paths.map(async path => ({
          path,
          source: await readFile(path, 'utf8'),
        })),
      )
    )
      .filter(({ source }) => source.includes(legacyMediaPath))
      .map(({ path }) => path)

    expect(offenders).toEqual([])
  })

  test('has no Worker media route or runtime R2 read binding', async () => {
    const fetchSource = await readFile(resolve(pluggedDirectory, 'src/fetch.ts'), 'utf8')
    const wranglerConfig = await readFile(resolve(pluggedDirectory, 'wrangler.jsonc'), 'utf8')

    await expect(access(resolve(pluggedDirectory, 'src/media.ts'))).rejects.toThrow()
    expect(fetchSource).not.toContain('handleMediaRequest')
    expect(wranglerConfig).not.toContain('"r2_buckets"')
    expect(wranglerConfig).not.toContain('"binding": "MEDIA"')
  })

  test('uses Unpic Cloudflare transformers for Astro and Solid catalog images', async () => {
    const [astroSource, solidSource] = await Promise.all([
      readFile(resolve(pluggedDirectory, 'src/components/ProductImage.astro'), 'utf8'),
      readFile(resolve(pluggedDirectory, 'src/components/ProductImage.tsx'), 'utf8'),
    ])

    expect(astroSource).toContain("from '@unpic/astro/base'")
    expect(solidSource).toContain("from '@unpic/solid/base'")
    for (const source of [astroSource, solidSource]) {
      expect(source).toContain("from 'unpic/providers/cloudflare'")
      expect(source).not.toContain('<img')
    }
  })
})
