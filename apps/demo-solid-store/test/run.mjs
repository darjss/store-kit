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
  const sortedCatalog = await fetchHtml('/products?sort=price-asc')
  record('Router search filters and sorting render from D1 with no JavaScript requirement', () => {
    assert.equal(catalog.response.status, 200)
    assert.match(catalog.html, /Шилжилт хүрэм/)
    assert.doesNotMatch(catalog.html, /TRUTHEAR|IEM/)
    assert.match(catalog.html, /name="useCase" value="cold-weather"/)
    assert.match(catalog.html, /Төрөл, брэндээр шүүх/)
    assert.ok(
      sortedCatalog.html.indexOf('Суурь футболк') < sortedCatalog.html.indexOf('Шилжилт хүрэм'),
    )
  })

  const product = await fetchHtml('/products/shiljilt-bridge-coat')
  record('the product frame SSRs server content and complete client purchase controls', () => {
    assert.equal(product.response.status, 200)
    assert.match(product.html, /<dx-frame\b/)
    assert.match(product.html, /sc:slot:/)
    assert.match(product.html, /DND-COAT-M-ASPHALT/)
    assert.match(product.html, />Хэмжээ<\/legend>/)
    assert.match(product.html, />Өнгө<\/legend>/)
    assert.match(product.html, /disabled aria-pressed="false">XL<\/button>/)
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

  const searchFunctionId = /registerServerReference\("([^"]+)", async function searchCatalog/.exec(
    serverSource,
  )?.[1]
  assert.ok(searchFunctionId, 'The production server bundle must register searchCatalog.')
  const searchResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(searchFunctionId)}&args=${encodeURIComponent('[{"query":"хүрэм"}]')}`,
    { method: 'POST' },
  )
  const searchBody = await searchResponse.text()
  const invalidSearchResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(searchFunctionId)}&args=${encodeURIComponent('[{"query":"x"}]')}`,
    { method: 'POST' },
  )
  record('compact typeahead results come from the validated server function', () => {
    assert.equal(searchResponse.status, 200)
    assert.match(searchBody, /Шилжилт хүрэм/)
    assert.doesNotMatch(searchBody, /stockQuantity|details|imageR2Key/)
    assert.equal(invalidSearchResponse.status, 400)
  })

  const cartFunctionId = /registerServerReference\("([^"]+)", async function validateCart/.exec(
    serverSource,
  )?.[1]
  assert.ok(cartFunctionId, 'The production server bundle must register validateCart.')
  const correctionInput = [
    [
      {
        variantId: 'var_01kyfqxb0me06sxpr1vkrdy49j',
        quantity: 10,
        previousUnitPriceMnt: 1,
      },
    ],
  ]
  const correctedCartResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(cartFunctionId)}&args=${encodeURIComponent(
      JSON.stringify(correctionInput),
    )}`,
    { method: 'POST' },
  )
  const correctedCartBody = await correctedCartResponse.text()
  const invalidCartResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(cartFunctionId)}&args=${encodeURIComponent(
      '[[{"variantId":"not-a-typeid","quantity":1,"previousUnitPriceMnt":1}]]',
    )}`,
    { method: 'POST' },
  )
  record('cart authority returns typed stock and price corrections from real D1 state', () => {
    assert.equal(correctedCartResponse.status, 200)
    assert.match(correctedCartBody, /InsufficientStock/)
    assert.match(correctedCartBody, /PriceChanged/)
    assert.doesNotMatch(correctedCartBody, /imageR2Key/)
    assert.equal(invalidCartResponse.status, 400)
  })

  const checkoutFunctionId =
    /registerServerReference\("([^"]+)", async function submitCheckout/.exec(serverSource)?.[1]
  assert.ok(checkoutFunctionId, 'The production server bundle must register submitCheckout.')
  const checkoutInput = {
    items: [{ variantId: 'var_01kyfqxb0me06sxpr1vkrdy49j', quantity: 1 }],
    customer: { name: '  Тэмүүлэн  ', phone: '99112233' },
    delivery: {
      district: 'Баянзүрх',
      khoroo: '  1-р хороо  ',
      address: '  Энхтайвны өргөн чөлөө 1  ',
      notes: '  Орцны код 1234  ',
    },
    paymentMethod: 'bank_transfer',
  }
  const checkoutResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(checkoutFunctionId)}&args=${encodeURIComponent(
      JSON.stringify([checkoutInput]),
    )}`,
    { method: 'POST' },
  )
  const checkoutBody = await checkoutResponse.text()
  const invalidCheckoutResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(checkoutFunctionId)}&args=${encodeURIComponent(
      JSON.stringify([{ ...checkoutInput, customer: { name: '', phone: '55' } }]),
    )}`,
    { method: 'POST' },
  )
  const invalidCheckoutBody = await invalidCheckoutResponse.text()
  const createdOrderId = /ord_[0-7][0-9a-hjkmnp-tv-z]{25}/.exec(checkoutBody)?.[0]
  const createdStatusToken =
    /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/.exec(
      checkoutBody,
    )?.[0]
  record('bank-transfer checkout validates fields and persists an authoritative D1 order', () => {
    assert.equal(checkoutResponse.status, 200)
    assert.match(checkoutBody, /DND-/)
    assert.match(checkoutBody, /bank_transfer/)
    assert.match(checkoutBody, /Хаан банк/)
    assert.ok(createdOrderId)
    assert.ok(createdStatusToken)
    assert.equal(invalidCheckoutResponse.status, 200)
    assert.match(invalidCheckoutBody, /field/)
    assert.match(invalidCheckoutBody, /customer\/name/)
  })

  const privateOrderFunctionId =
    /registerServerReference\("([^"]+)", async function getPrivateOrder/.exec(serverSource)?.[1]
  assert.ok(privateOrderFunctionId, 'The production server bundle must register getPrivateOrder.')
  assert.ok(createdOrderId)
  assert.ok(createdStatusToken)
  const privateOrderResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(privateOrderFunctionId)}&args=${encodeURIComponent(
      JSON.stringify([{ orderId: createdOrderId, statusToken: createdStatusToken }]),
    )}`,
    { method: 'POST' },
  )
  const privateOrderBody = await privateOrderResponse.text()
  const wrongTokenResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(privateOrderFunctionId)}&args=${encodeURIComponent(
      JSON.stringify([{ orderId: createdOrderId, statusToken: 'x'.repeat(32) }]),
    )}`,
    { method: 'POST' },
  )
  const wrongTokenBody = await wrongTokenResponse.text()
  record('private order status returns snapshots only for the matching fragment token', () => {
    assert.equal(privateOrderResponse.status, 200)
    assert.match(privateOrderBody, /Тэмүүлэн/)
    assert.match(privateOrderBody, /Энхтайвны өргөн чөлөө 1/)
    assert.match(privateOrderBody, /pending/)
    assert.doesNotMatch(privateOrderBody, /statusTokenHash|providerInvoiceId/)
    assert.equal(wrongTokenResponse.status, 200)
    assert.match(wrongTokenBody, /InvalidStatusToken/)
    assert.doesNotMatch(wrongTokenBody, /Тэмүүлэн|99112233/)
  })

  const claimFunctionId =
    /registerServerReference\("([^"]+)", async function claimPrivateBankTransfer/.exec(
      serverSource,
    )?.[1]
  const qpayRefreshFunctionId =
    /registerServerReference\("([^"]+)", async function refreshPrivateQPay/.exec(serverSource)?.[1]
  assert.ok(claimFunctionId, 'The production server bundle must register bank claims.')
  assert.ok(qpayRefreshFunctionId, 'The production server bundle must register QPay refresh.')
  const invalidPaymentAccess = JSON.stringify([
    { orderId: createdOrderId, statusToken: 'x'.repeat(32) },
  ])
  const [claimResponse, qpayRefreshResponse] = await Promise.all([
    fetch(
      `${origin}/_server?id=${encodeURIComponent(claimFunctionId)}&args=${encodeURIComponent(invalidPaymentAccess)}`,
      { method: 'POST' },
    ),
    fetch(
      `${origin}/_server?id=${encodeURIComponent(qpayRefreshFunctionId)}&args=${encodeURIComponent(invalidPaymentAccess)}`,
      { method: 'POST' },
    ),
  ])
  const [claimBody, qpayRefreshBody] = await Promise.all([
    claimResponse.text(),
    qpayRefreshResponse.text(),
  ])
  record('private payment commands reject the wrong token before provider work', () => {
    assert.equal(claimResponse.status, 200)
    assert.equal(qpayRefreshResponse.status, 200)
    assert.match(claimBody, /InvalidStatusToken/)
    assert.match(qpayRefreshBody, /InvalidStatusToken/)
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
