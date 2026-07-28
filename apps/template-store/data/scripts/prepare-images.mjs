/* oxlint-disable eslint/no-await-in-loop, eslint/no-console */
/**
 * Prepares catalog images for the local media bucket and catalog.seed.json.
 *
 * Reads masters from data/images/catalog/src(.png|.jpg), writes webp upload
 * sources to data/images/catalog/<name>.webp, and prints the image blocks
 * to paste into catalog.seed.json.
 *
 * Run from apps/template-store: node data/scripts/prepare-images.mjs
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

const catalogDirectory = new URL('../images/catalog/', import.meta.url).pathname
const sourceDirectory = join(catalogDirectory, 'src')

const masters = (await readdir(sourceDirectory)).filter(name => /\.(png|jpe?g)$/i.test(name))
if (masters.length === 0) {
  console.error('No masters in data/images/catalog/src')
  process.exit(1)
}

const manifest = {}
for (const master of masters.toSorted()) {
  const name = master.replace(/\.(png|jpe?g)$/i, '')
  const buffer = await readFile(join(sourceDirectory, master))
  const webp = await sharp(buffer).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
  const sha = createHash('sha256').update(webp.data).digest('hex')
  const source = `data/images/catalog/${name}.webp`
  await mkdir(catalogDirectory, { recursive: true })
  await writeFile(join(catalogDirectory, `${name}.webp`), webp.data)
  manifest[name] = {
    source,
    r2Key: `products/${name}/${sha}.webp`,
    contentType: 'image/webp',
    width: webp.info.width,
    height: webp.info.height,
    checksumSha256: sha,
  }
}

const manifestPath = new URL('../images/manifest.json', import.meta.url).pathname
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${Object.keys(manifest).length} images; manifest at ${manifestPath}`)
console.log(JSON.stringify(manifest, null, 2))
