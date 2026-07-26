import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const persistenceDirectory = await mkdtemp(path.join(tmpdir(), 'dund-worker-test-'))
const port = 39_000 + (process.pid % 500)
const origin = `http://127.0.0.1:${port}`
const results = []
let worker
let workerOutput = ''

const record = (name, assertion) => {
  assertion()
  results.push(name)
  process.stdout.write(`✓ ${name}\n`)
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: appDirectory,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed.\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )
  }
  return result.stdout ?? ''
}

const waitForWorker = async (deadline = Date.now() + 30_000) => {
  try {
    const response = await fetch(`${origin}/images/hero-threshold.webp`)
    if (response.ok) return
  } catch {}

  if (Date.now() >= deadline) throw new Error('Timed out waiting for the local ДУНД Worker.')
  await new Promise(resolve => setTimeout(resolve, 250))
  return waitForWorker(deadline)
}

const fetchHtml = async pathname => {
  const response = await fetch(`${origin}${pathname}`, { headers: { accept: 'text/html' } })
  return { response, html: await response.text() }
}

const fetchChunks = async pathname => {
  const response = await fetch(`${origin}${pathname}`, { headers: { accept: 'text/html' } })
  const chunks = []
  let html = ''
  const decoder = new TextDecoder()
  for await (const chunk of response.body) {
    chunks.push(chunk)
    html += decoder.decode(chunk, { stream: true })
  }
  html += decoder.decode()
  return { response, chunks, html }
}

const occurrenceCount = (source, value) => source.split(value).length - 1

try {
  run('vp', ['build'])
  run('vp', [
    'exec',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--persist-to',
    persistenceDirectory,
  ])
  const seedEnvironment = {
    ...process.env,
    STORE_KIT_APP: 'demo-solid-store',
    STORE_KIT_PERSIST_TO: persistenceDirectory,
  }
  run(
    'node',
    [
      '--experimental-strip-types',
      '../../packages/tooling/catalog-seed.ts',
      '--environment',
      'local',
      '--only',
      'data',
    ],
    { env: seedEnvironment },
  )
  run(
    'node',
    [
      '--experimental-strip-types',
      '../../packages/tooling/catalog-seed.ts',
      '--environment',
      'local',
      '--only',
      'data',
    ],
    { env: seedEnvironment },
  )

  const seed = JSON.parse(await readFile(path.join(appDirectory, 'data/catalog.seed.json'), 'utf8'))
  record('the original ДУНД seed has five controlled clothing categories', () => {
    assert.deepEqual(
      seed.categories.map(category => category.slug),
      ['outerwear', 'shirts', 'knitwear', 'base-layers', 'trousers'],
    )
    assert.equal(seed.products.length, 5)
    assert.equal(seed.checkoutSettings.orderPrefix, 'DND')
    assert.ok(seed.products.every(product => product.variants.length > 0))
    assert.ok(
      seed.products
        .flatMap(product => product.variants)
        .every(variant => variant.options.size && variant.options.color),
    )
    const allowed = new Set(['workday', 'off-duty', 'layering', 'travel', 'cold-weather'])
    assert.ok(seed.products.flatMap(product => product.useCases).every(tag => allowed.has(tag)))
  })

  worker = spawn(
    'vp',
    [
      'exec',
      'wrangler',
      'dev',
      '--port',
      String(port),
      '--ip',
      '127.0.0.1',
      '--persist-to',
      persistenceDirectory,
      '--show-interactive-dev-session=false',
    ],
    {
      cwd: appDirectory,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        QPAY_USERNAME: 'test-only',
        QPAY_PASSWORD: 'test-only',
        QPAY_INVOICE_CODE: 'test-only',
        TELEGRAM_BOT_TOKEN: 'test-only',
        TELEGRAM_CHAT_ID: '-1',
        TELEGRAM_WEBHOOK_SECRET: 'test-only',
        TELEGRAM_ADMIN_USER_ID: '1',
      },
    },
  )
  worker.stdout.on('data', chunk => {
    workerOutput += chunk
  })
  worker.stderr.on('data', chunk => {
    workerOutput += chunk
  })
  await waitForWorker()

  const home = await fetchChunks('/')
  record('turnkey SSR streams a complete home document through the Worker', () => {
    assert.equal(home.response.status, 200)
    assert.match(home.response.headers.get('content-type') ?? '', /text\/html/)
    assert.ok(home.chunks.length >= 1)
    assert.match(home.html, /^<!DOCTYPE html>/)
    assert.match(home.html, /Давхарга бүр ажиллана/)
    assert.match(home.html, /<dx-frame\b/)
    assert.match(home.html, /self\._\$SC=/)
  })
  record('public documents receive the short CDN cache policy', () => {
    assert.equal(home.response.headers.get('cache-control'), 'public, max-age=0, must-revalidate')
    assert.equal(
      home.response.headers.get('cloudflare-cdn-cache-control'),
      'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400',
    )
  })

  const catalog = await fetchHtml('/products?useCase=cold-weather')
  record('Router search filters render from D1 with no JavaScript requirement', () => {
    assert.equal(catalog.response.status, 200)
    assert.match(catalog.html, /Шилжилт хүрэм/)
    assert.doesNotMatch(catalog.html, /TRUTHEAR|IEM/)
    assert.match(catalog.html, /name="useCase" value="cold-weather"/)
  })

  const product = await fetchHtml('/products/shiljilt-bridge-coat')
  record('the product frame SSRs server content and a keyed client purchase slot', () => {
    assert.equal(product.response.status, 200)
    assert.match(product.html, /<dx-frame\b/)
    assert.match(product.html, /sc:slot:/)
    assert.match(product.html, /DND-COAT-M-ASPHALT/)
    assert.doesNotMatch(product.html, /stockQuantity/)
    assert.equal(
      occurrenceCount(
        product.html,
        'Гадуур бүрхүүл, салдаг хөнгөн дотор давхаргыг хамтад нь эсвэл тусад нь өмсөнө.',
      ),
      1,
    )
  })

  const checkout = await fetchHtml('/checkout')
  const order = await fetchHtml('/orders/ord_01kyfqxb0ne06sxpvwgf6b37re')
  const missing = await fetchHtml('/not-a-route')
  record('direct checkout, private order shell, and not-found routes resolve', () => {
    assert.equal(checkout.response.status, 200)
    assert.equal(checkout.response.headers.get('cache-control'), 'private, no-store')
    assert.match(checkout.html, /Захиалга/)
    assert.equal(order.response.status, 200)
    assert.equal(order.response.headers.get('cache-control'), 'private, no-store')
    assert.doesNotMatch(order.html, /9911\d{4}/)
    assert.equal(missing.response.status, 404)
    assert.match(missing.html, /Энд давхарга алга/)
  })

  const assets = await readdir(path.join(appDirectory, 'dist/client/assets'))
  const clientSources = (
    await Promise.all(
      assets
        .filter(file => file.endsWith('.js'))
        .map(file => readFile(path.join(appDirectory, 'dist/client/assets', file), 'utf8')),
    )
  ).join('\n')
  const serverSource = await readFile(path.join(appDirectory, 'dist/server/server.js'), 'utf8')
  record('server-only modules and markers stay out of every client chunk', () => {
    assert.match(serverSource, /DUND-SERVER-ONLY-2b1948a7/)
    assert.doesNotMatch(clientSources, /DUND-SERVER-ONLY-2b1948a7/)
    assert.doesNotMatch(clientSources, /drizzle-orm\/d1/)
    assert.doesNotMatch(clientSources, /QPAY_PASSWORD/)
  })

  const catalogFunctionId =
    /registerServerReference\("([^"]+)", async function getCatalogFrame/.exec(serverSource)?.[1]
  assert.ok(catalogFunctionId, 'The production server bundle must register getCatalogFrame.')
  const functionResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(catalogFunctionId)}&args=${encodeURIComponent('[{}]')}`,
    { method: 'POST' },
  )
  const functionBody = await functionResponse.text()
  record('the real server-function endpoint returns a streamed catalog frame', () => {
    assert.equal(functionResponse.status, 200)
    assert.equal(functionResponse.headers.get('cache-control'), 'private, no-store')
    assert.match(functionResponse.headers.get('content-type') ?? '', /application\/x-frame-stream/)
    assert.match(functionBody, /"type":"start"/)
    assert.match(functionBody, /"type":"html"/)
    assert.match(functionBody, /Шилжилт хүрэм/)
  })

  const invalidFunctionResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(catalogFunctionId)}&args=${encodeURIComponent('[{"useCase":"first-iem"}]')}`,
    { method: 'POST' },
  )
  record('the server boundary rejects a Plugged-only merchandising tag', () => {
    assert.equal(invalidFunctionResponse.status, 400)
  })

  const assetPath = /<script type="module" src="([^"]+)" async>/.exec(home.html)?.[1]
  assert.ok(assetPath, 'The SSR document must include the generated client entry.')
  const assetResponse = await fetch(`${origin}${assetPath}`)
  const broadApi = await fetch(`${origin}/api/system/status`, { headers: { accept: 'text/html' } })
  const webhook = await fetch(`${origin}/api/webhooks/qpay`)
  record('assets are immutable and Elysia is limited to exact webhook paths', () => {
    assert.equal(assetResponse.status, 200)
    assert.equal(assetResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    assert.equal(broadApi.status, 404)
    assert.equal(webhook.status, 404)
    assert.equal(webhook.headers.get('cache-control'), 'no-store')
  })

  process.stdout.write(`\n${results.length} real-runtime checks passed.\n`)
} catch (error) {
  if (worker) {
    process.stderr.write('\nWorker output:\n')
    process.stderr.write(workerOutput ?? '')
  }
  throw error
} finally {
  if (worker?.pid) {
    try {
      process.kill(-worker.pid, 'SIGTERM')
    } catch {}
  }
  await rm(persistenceDirectory, { recursive: true, force: true })
}
