import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  nonNegativeIntegerSchema,
  productDetailsSchema,
  productStatusSchema,
  slugSchema,
  variantOptionsSchema,
} from '@store-kit/db/schemas'
import * as v from 'valibot'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pluggedDirectory = resolve(projectRoot, 'apps/plugged')
const seedPath = resolve(pluggedDirectory, 'data/catalog.seed.json')
const wranglerConfigPath = resolve(pluggedDirectory, 'wrangler.jsonc')
const generatedSqlPath = resolve(pluggedDirectory, '.wrangler/catalog.seed.sql')

const d1Binding = 'DB'
const r2Bucket = 'plugged-media'

const identifierSchema = v.pipe(v.string(), v.uuid())
const nonEmptyStringSchema = v.pipe(v.string(), v.minLength(1))
const nullableStringSchema = v.optional(v.nullable(nonEmptyStringSchema))
const safeRelativePathSchema = v.pipe(
  nonEmptyStringSchema,
  v.check(
    path => !isAbsolute(path) && !path.split(/[\\/]/).includes('..'),
    'Path must be relative and cannot contain a parent segment.',
  ),
)
const r2KeySchema = v.pipe(
  nonEmptyStringSchema,
  v.check(
    key => !key.startsWith('/') && !key.includes('\\') && !key.split('/').includes('..'),
    'R2 key must be relative, use forward slashes, and cannot contain a parent segment.',
  ),
)
const imageContentTypeSchema = v.picklist([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

const brandSeedSchema = v.strictObject({
  id: identifierSchema,
  slug: slugSchema,
  name: nonEmptyStringSchema,
  description: nullableStringSchema,
  websiteUrl: v.optional(v.nullable(v.pipe(v.string(), v.url()))),
})

const categorySeedSchema = v.strictObject({
  id: identifierSchema,
  slug: slugSchema,
  name: nonEmptyStringSchema,
  description: nullableStringSchema,
  sortOrder: nonNegativeIntegerSchema,
  active: v.boolean(),
})

const imageSeedSchema = v.strictObject({
  id: identifierSchema,
  source: safeRelativePathSchema,
  r2Key: r2KeySchema,
  contentType: imageContentTypeSchema,
  alt: nullableStringSchema,
  sortOrder: nonNegativeIntegerSchema,
})

const variantSeedSchema = v.strictObject({
  id: identifierSchema,
  sku: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  options: variantOptionsSchema,
  priceMnt: nonNegativeIntegerSchema,
  compareAtPriceMnt: v.optional(v.nullable(nonNegativeIntegerSchema)),
  stockQuantity: nonNegativeIntegerSchema,
  active: v.boolean(),
  sortOrder: nonNegativeIntegerSchema,
  imageKeys: v.array(r2KeySchema),
})

const productSeedSchema = v.strictObject({
  id: identifierSchema,
  slug: slugSchema,
  brandSlug: v.optional(slugSchema),
  categorySlug: v.optional(slugSchema),
  name: nonEmptyStringSchema,
  shortDescription: nullableStringSchema,
  description: nullableStringSchema,
  status: productStatusSchema,
  featured: v.boolean(),
  details: v.optional(v.nullable(productDetailsSchema)),
  images: v.array(imageSeedSchema),
  variants: v.pipe(v.array(variantSeedSchema), v.minLength(1)),
})

const pluggedCatalogSeedSchema = v.strictObject({
  brands: v.array(brandSeedSchema),
  categories: v.array(categorySeedSchema),
  products: v.array(productSeedSchema),
})

type CatalogSeed = v.InferOutput<typeof pluggedCatalogSeedSchema>

const findDuplicate = (values: string[]) => {
  const seen = new Set<string>()
  return values.find(value => {
    if (seen.has(value)) return true
    seen.add(value)
    return false
  })
}

const assertUnique = (label: string, values: string[]) => {
  const duplicate = findDuplicate(values)
  if (duplicate) throw new Error(`Invalid catalog seed: duplicate ${label} "${duplicate}".`)
}

const validateReferences = (seed: CatalogSeed) => {
  const brands = new Set(seed.brands.map(brand => brand.slug))
  const categories = new Set(seed.categories.map(category => category.slug))
  const variants = seed.products.flatMap(product => product.variants)
  const images = seed.products.flatMap(product => product.images)

  assertUnique(
    'brand ID',
    seed.brands.map(brand => brand.id),
  )
  assertUnique(
    'brand slug',
    seed.brands.map(brand => brand.slug),
  )
  assertUnique(
    'category ID',
    seed.categories.map(category => category.id),
  )
  assertUnique(
    'category slug',
    seed.categories.map(category => category.slug),
  )
  assertUnique(
    'product ID',
    seed.products.map(product => product.id),
  )
  assertUnique(
    'product slug',
    seed.products.map(product => product.slug),
  )
  assertUnique(
    'variant ID',
    variants.map(variant => variant.id),
  )
  assertUnique(
    'variant SKU',
    variants.map(variant => variant.sku),
  )
  assertUnique(
    'image ID',
    images.map(image => image.id),
  )
  assertUnique(
    'image R2 key',
    images.map(image => image.r2Key),
  )

  for (const product of seed.products) {
    if (product.brandSlug && !brands.has(product.brandSlug)) {
      throw new Error(
        `Invalid catalog seed: product "${product.slug}" references missing brand "${product.brandSlug}".`,
      )
    }
    if (product.categorySlug && !categories.has(product.categorySlug)) {
      throw new Error(
        `Invalid catalog seed: product "${product.slug}" references missing category "${product.categorySlug}".`,
      )
    }

    assertUnique(
      `image sort order in product "${product.slug}"`,
      product.images.map(image => String(image.sortOrder)),
    )

    const imageKeys = new Set(product.images.map(image => image.r2Key))
    for (const variant of product.variants) {
      assertUnique(`image key in variant "${variant.sku}"`, variant.imageKeys)
      for (const imageKey of variant.imageKeys) {
        if (!imageKeys.has(imageKey)) {
          throw new Error(
            `Invalid catalog seed: variant "${variant.sku}" references image key "${imageKey}" outside product "${product.slug}".`,
          )
        }
      }
    }
  }
}

const parseSeed = async () => {
  const source = await readFile(seedPath, 'utf8')
  let input: unknown
  try {
    input = JSON.parse(source)
  } catch (error) {
    throw new Error(
      `Catalog seed is not valid JSON: ${error instanceof Error ? error.message : error}`,
      { cause: error },
    )
  }

  const result = v.safeParse(pluggedCatalogSeedSchema, input)
  if (!result.success) {
    throw new Error(
      `Catalog seed does not match the required shape:\n${JSON.stringify(v.flatten(result.issues), null, 2)}`,
    )
  }
  validateReferences(result.output)
  return result.output
}

const assetPath = (source: string) => {
  const path = resolve(pluggedDirectory, source)
  const fromPlugged = relative(pluggedDirectory, path)
  if (fromPlugged === '..' || fromPlugged.startsWith(`..${sep}`) || isAbsolute(fromPlugged)) {
    throw new Error(`Image source escapes apps/plugged: ${source}`)
  }
  return path
}

const validateAssets = async (seed: CatalogSeed) => {
  await Promise.all(
    seed.products
      .flatMap(product => product.images)
      .map(async image => {
        const path = assetPath(image.source)
        if (!(await stat(path)).isFile()) {
          throw new Error(`Image source is not a file: ${image.source}`)
        }
      }),
  )
}

const runWrangler = (args: string[]) =>
  new Promise<void>((resolvePromise, reject) => {
    const child = spawn('vp', ['exec', 'wrangler', ...args], {
      cwd: pluggedDirectory,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise()
      else
        reject(
          new Error(
            `Wrangler failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}.`,
          ),
        )
    })
  })

const uploadImages = async (seed: CatalogSeed, resourceFlag: '--local' | '--remote') => {
  const images = seed.products.flatMap(product => product.images)
  await images.reduce(async (previousUpload, image) => {
    await previousUpload
    await runWrangler([
      'r2',
      'object',
      'put',
      `${r2Bucket}/${image.r2Key}`,
      '--file',
      assetPath(image.source),
      '--content-type',
      image.contentType,
      resourceFlag,
      '--config',
      wranglerConfigPath,
    ])
  }, Promise.resolve())
}

const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`
const sqlNullableText = (value: string | null | undefined) =>
  value === undefined || value === null ? 'NULL' : sqlText(value)
const sqlBoolean = (value: boolean) => (value ? '1' : '0')
const sqlJson = (value: Record<string, unknown>) =>
  sqlText(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value).toSorted(([left], [right]) => left.localeCompare(right)),
      ),
    ),
  )

const upsert = (table: string, columns: string[], values: string[], updates: string[]) =>
  `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT(id) DO UPDATE SET ${updates.map(column => `${column} = excluded.${column}`).join(', ')};`

const buildSql = (seed: CatalogSeed) => {
  const statements = ['PRAGMA foreign_keys = ON;']
  const brandIds = new Map(seed.brands.map(brand => [brand.slug, brand.id]))
  const categoryIds = new Map(seed.categories.map(category => [category.slug, category.id]))
  const imageIds = new Map(
    seed.products.flatMap(product => product.images.map(image => [image.r2Key, image.id] as const)),
  )

  for (const brand of seed.brands) {
    statements.push(
      upsert(
        'brand',
        ['id', 'slug', 'name', 'description', 'website_url', 'created_at', 'updated_at'],
        [
          sqlText(brand.id),
          sqlText(brand.slug),
          sqlText(brand.name),
          sqlNullableText(brand.description),
          sqlNullableText(brand.websiteUrl),
          'unixepoch()',
          'unixepoch()',
        ],
        ['slug', 'name', 'description', 'website_url', 'updated_at'],
      ),
    )
  }

  for (const category of seed.categories) {
    statements.push(
      upsert(
        'category',
        ['id', 'slug', 'name', 'description', 'sort_order', 'active', 'created_at', 'updated_at'],
        [
          sqlText(category.id),
          sqlText(category.slug),
          sqlText(category.name),
          sqlNullableText(category.description),
          String(category.sortOrder),
          sqlBoolean(category.active),
          'unixepoch()',
          'unixepoch()',
        ],
        ['slug', 'name', 'description', 'sort_order', 'active', 'updated_at'],
      ),
    )
  }

  for (const product of seed.products) {
    statements.push(
      upsert(
        'product',
        [
          'id',
          'slug',
          'brand_id',
          'category_id',
          'name',
          'short_description',
          'description',
          'status',
          'featured',
          'details',
          'created_at',
          'updated_at',
        ],
        [
          sqlText(product.id),
          sqlText(product.slug),
          sqlNullableText(product.brandSlug ? brandIds.get(product.brandSlug) : undefined),
          sqlNullableText(product.categorySlug ? categoryIds.get(product.categorySlug) : undefined),
          sqlText(product.name),
          sqlNullableText(product.shortDescription),
          sqlNullableText(product.description),
          sqlText(product.status),
          sqlBoolean(product.featured),
          product.details ? sqlJson(product.details) : 'NULL',
          'unixepoch()',
          'unixepoch()',
        ],
        [
          'slug',
          'brand_id',
          'category_id',
          'name',
          'short_description',
          'description',
          'status',
          'featured',
          'details',
          'updated_at',
        ],
      ),
    )
  }

  for (const product of seed.products) {
    for (const image of product.images) {
      statements.push(
        upsert(
          'product_image',
          ['id', 'product_id', 'r2_key', 'alt', 'sort_order', 'created_at'],
          [
            sqlText(image.id),
            sqlText(product.id),
            sqlText(image.r2Key),
            sqlNullableText(image.alt),
            String(image.sortOrder),
            'unixepoch()',
          ],
          ['product_id', 'r2_key', 'alt', 'sort_order'],
        ),
      )
    }
  }

  for (const product of seed.products) {
    for (const variant of product.variants) {
      statements.push(
        upsert(
          'product_variant',
          [
            'id',
            'product_id',
            'sku',
            'name',
            'options',
            'price_mnt',
            'compare_at_price_mnt',
            'stock_quantity',
            'active',
            'sort_order',
            'created_at',
            'updated_at',
          ],
          [
            sqlText(variant.id),
            sqlText(product.id),
            sqlText(variant.sku),
            sqlText(variant.name),
            sqlJson(variant.options),
            String(variant.priceMnt),
            variant.compareAtPriceMnt === undefined || variant.compareAtPriceMnt === null
              ? 'NULL'
              : String(variant.compareAtPriceMnt),
            String(variant.stockQuantity),
            sqlBoolean(variant.active),
            String(variant.sortOrder),
            'unixepoch()',
            'unixepoch()',
          ],
          [
            'product_id',
            'sku',
            'name',
            'options',
            'price_mnt',
            'compare_at_price_mnt',
            'stock_quantity',
            'active',
            'sort_order',
            'updated_at',
          ],
        ),
      )
    }
  }

  for (const product of seed.products) {
    for (const variant of product.variants) {
      statements.push(
        `DELETE FROM product_variant_image WHERE variant_id = ${sqlText(variant.id)};`,
      )
      for (const imageKey of variant.imageKeys) {
        const imageId = imageIds.get(imageKey)
        if (!imageId) throw new Error(`Missing validated image key: ${imageKey}`)
        statements.push(
          `INSERT INTO product_variant_image (variant_id, image_id) VALUES (${sqlText(variant.id)}, ${sqlText(imageId)}) ON CONFLICT(variant_id, image_id) DO NOTHING;`,
        )
      }
    }
  }

  return `${statements.join('\n')}\n`
}

const importRows = async (seed: CatalogSeed, resourceFlag: '--local' | '--remote') => {
  await mkdir(dirname(generatedSqlPath), { recursive: true })
  await writeFile(generatedSqlPath, buildSql(seed), { mode: 0o600 })
  try {
    await runWrangler([
      'd1',
      'execute',
      d1Binding,
      '--file',
      generatedSqlPath,
      resourceFlag,
      '--yes',
      '--config',
      wranglerConfigPath,
    ])
  } finally {
    await rm(generatedSqlPath, { force: true })
  }
}

const printCounts = (seed: CatalogSeed) => {
  const products = seed.products.length
  const variants = seed.products.reduce((count, product) => count + product.variants.length, 0)
  const images = seed.products.reduce((count, product) => count + product.images.length, 0)
  const variantImageLinks = seed.products.reduce(
    (count, product) =>
      count +
      product.variants.reduce(
        (variantCount, variant) => variantCount + variant.imageKeys.length,
        0,
      ),
    0,
  )

  process.stdout.write(
    [
      'Catalog seed complete:',
      `brands: ${seed.brands.length}`,
      `categories: ${seed.categories.length}`,
      `products: ${products}`,
      `variants: ${variants}`,
      `images: ${images}`,
      `variant-image links: ${variantImageLinks}`,
      '',
    ].join('\n'),
  )
}

const main = async () => {
  const args = process.argv.slice(2)
  const remote = args.includes('--remote')
  const unknown = args.filter(argument => argument !== '--remote')
  if (unknown.length > 0 || args.filter(argument => argument === '--remote').length > 1) {
    throw new Error('Usage: vp run catalog:seed:plugged [--remote]')
  }

  const resourceFlag = remote ? '--remote' : '--local'
  process.stdout.write(`Seeding ${remote ? 'remote' : 'local'} Plugged resources.\n`)
  const seed = await parseSeed()
  await validateAssets(seed)
  await uploadImages(seed, resourceFlag)
  await importRows(seed, resourceFlag)
  printCounts(seed)
}

await main()
