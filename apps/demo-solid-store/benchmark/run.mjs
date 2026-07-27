/* eslint-disable no-await-in-loop, no-underscore-dangle -- Samples must run in sequence, and page markers must not collide with app state. */

import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const appDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outputPath = path.resolve(
  appDirectory,
  process.env.BENCHMARK_OUTPUT ?? 'src/benchmark/solid2-vs-plugged.json',
)
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'store-kit-benchmark-'))
const lighthouseVersion = '13.4.1'
const httpSequentialRuns = 10
const httpRandomRuns = 15
const cacheBustedRuns = 5
const lighthouseRuns = 3
const navigationRuns = 9
const httpMaxAttempts = 5

const targets = [
  {
    id: 'dund',
    name: 'DUND · Solid 2',
    origin: 'https://dund.darjs.dev',
    routes: {
      home: '/',
      catalog: '/products',
      product: '/products/shiljilt-bridge-coat',
    },
    headings: {
      catalog: 'Бүх давхарга',
      product: 'Шилжилт хүрэм',
    },
    links: {
      catalog: 'a[href="/products"]',
      product: 'section[aria-label="Барааны жагсаалт"] a[href="/products/shiljilt-bridge-coat"]',
    },
    shell: 'button[aria-label^="Сагс,"]',
    cartStorage: 'dund:cart:v1',
    cartItems: value => JSON.parse(value).items,
    cacheBust: false,
  },
  {
    id: 'plugged',
    name: 'Plugged · Astro / Solid 1',
    origin: 'https://storekit.plugged.darjs.dev',
    routes: {
      home: '/',
      catalog: '/products',
      product: '/products/truthear-keyx',
    },
    headings: {
      catalog: 'БҮХ БАРАА',
      product: 'TRUTHEAR KEYX',
    },
    links: {
      catalog: 'a[href="/products"]',
      product: 'section[aria-label="Барааны жагсаалт"] a[href="/products/truthear-keyx"]',
    },
    shell: 'a[href="/checkout"]',
    cartStorage: 'store-kit:plugged:cart:v1',
    cartItems: value => JSON.parse(value),
    cacheBust: true,
  },
]

const selectedHeaders = new Set([
  'age',
  'cache-control',
  'cf-cache-status',
  'cf-ray',
  'cloudflare-cdn-cache-control',
  'content-encoding',
  'content-length',
  'etag',
  'last-modified',
  'server-timing',
  'vary',
])

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
  return (result.stdout ?? '').trim()
}

const round = value => Math.round(value * 100) / 100

const percentile = (values, fraction) => {
  const sorted = values.toSorted((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}

const distribution = values => ({
  median: round(percentile(values, 0.5)),
  p75: round(percentile(values, 0.75)),
  p95: round(percentile(values, 0.95)),
  min: round(Math.min(...values)),
  max: round(Math.max(...values)),
})

const counts = values =>
  Object.fromEntries(
    [...new Set(values)]
      .toSorted()
      .map(value => [value || '(missing)', values.filter(v => v === value).length]),
  )

const deterministicShuffle = (values, seed) => {
  const result = [...values]
  let state = seed >>> 0
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const swapIndex = state % (index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

const parseHeaders = source => {
  const blocks = source
    .split(/\r?\n\r?\n/)
    .map(block => block.trim())
    .filter(Boolean)
  const block = blocks.toReversed().find(value => value.startsWith('HTTP/')) ?? ''
  const headers = {}
  for (const line of block.split(/\r?\n/).slice(1)) {
    const separator = line.indexOf(':')
    if (separator === -1) continue
    const name = line.slice(0, separator).trim().toLowerCase()
    if (!selectedHeaders.has(name)) continue
    headers[name] = line.slice(separator + 1).trim()
  }
  return headers
}

const sampleHttp = async (target, route, phase, index, attempt, timestamp) => {
  const baseUrl = `${target.origin}${target.routes[route]}`
  const url =
    phase === 'cache-busted'
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}benchmark=${encodeURIComponent(`${timestamp}-${route}-${index}-${attempt}`)}`
      : baseUrl
  const bodyPath = path.join(
    temporaryDirectory,
    `curl-${target.id}-${route}-${phase}-${index}-${attempt}.body`,
  )
  const headerPath = `${bodyPath}.headers`
  const writeFormat = JSON.stringify({
    httpCode: '%{http_code}',
    timeNameLookup: '%{time_namelookup}',
    timeConnect: '%{time_connect}',
    timeAppConnect: '%{time_appconnect}',
    timeStartTransfer: '%{time_starttransfer}',
    timeTotal: '%{time_total}',
    sizeDownload: '%{size_download}',
    httpVersion: '%{http_version}',
    remoteIp: '%{remote_ip}',
  })
  const curl = spawnSync(
    'curl',
    [
      '--silent',
      '--show-error',
      '--location',
      '--compressed',
      '--connect-timeout',
      '10',
      '--max-time',
      '20',
      '--header',
      'Accept: text/html',
      '--output',
      bodyPath,
      '--dump-header',
      headerPath,
      '--write-out',
      writeFormat,
      url,
    ],
    { cwd: appDirectory, env: process.env, encoding: 'utf8', timeout: 25_000 },
  )
  let timing
  try {
    timing = JSON.parse((curl.stdout ?? '').trim())
  } catch {
    timing = {
      httpCode: '0',
      timeNameLookup: '0',
      timeConnect: '0',
      timeAppConnect: '0',
      timeStartTransfer: '0',
      timeTotal: '20',
      sizeDownload: '0',
      httpVersion: '',
      remoteIp: '',
    }
  }
  const headers = await readFile(headerPath, 'utf8').then(parseHeaders, () => ({}))
  const decodedBody = await stat(bodyPath).catch(() => ({ size: 0 }))
  const nameLookup = Number(timing.timeNameLookup)
  const connect = Number(timing.timeConnect)
  const appConnect = Number(timing.timeAppConnect)
  const startTransfer = Number(timing.timeStartTransfer)
  const total = Number(timing.timeTotal)

  const status = Number(timing.httpCode)
  const valid = curl.status === 0 && status >= 200 && status < 400
  return {
    phase,
    index,
    attempt,
    valid,
    error: valid ? null : (curl.stderr ?? curl.error?.message ?? `curl exit ${curl.status}`).trim(),
    url,
    status,
    httpVersion: timing.httpVersion,
    remoteIp: timing.remoteIp,
    dnsMs: round(nameLookup * 1_000),
    tcpMs: round((connect - nameLookup) * 1_000),
    tlsMs: round((appConnect - connect) * 1_000),
    ttfbMs: round(startTransfer * 1_000),
    downloadMs: round((total - startTransfer) * 1_000),
    totalMs: round(total * 1_000),
    transferredBytes: Number(timing.sizeDownload),
    decodedBytes: decodedBody.size,
    headers,
  }
}

const sampleHttpUntilValid = async (target, route, phase, index, timestamp) => {
  const attempts = []
  for (let attempt = 0; attempt < httpMaxAttempts; attempt += 1) {
    const sample = await sampleHttp(target, route, phase, index, attempt, timestamp)
    attempts.push(sample)
    if (sample.valid) return attempts
    if (attempt < httpMaxAttempts - 1) {
      process.stdout.write(
        `HTTP retry ${target.id}/${route} ${index + 1}, attempt ${attempt + 2}\n`,
      )
    }
  }
  throw new Error(
    `${httpMaxAttempts} HTTP attempts failed for ${target.id}/${route} ${phase} ${index + 1}.`,
  )
}

const aggregateHttp = samples => {
  const validSamples = samples.filter(sample => sample.valid)
  const metrics = [
    'dnsMs',
    'tcpMs',
    'tlsMs',
    'ttfbMs',
    'downloadMs',
    'totalMs',
    'transferredBytes',
    'decodedBytes',
  ]
  return {
    sampleCount: samples.length,
    validCount: validSamples.length,
    excludedCount: samples.length - validSamples.length,
    exclusions: samples.filter(sample => !sample.valid).map(sample => sample.error),
    status: counts(samples.map(sample => String(sample.status))),
    metrics: Object.fromEntries(
      metrics.map(metric => [metric, distribution(validSamples.map(sample => sample[metric]))]),
    ),
    cache: {
      cacheControl: counts(samples.map(sample => sample.headers['cache-control'])),
      cloudflareCdnCacheControl: counts(
        samples.map(sample => sample.headers['cloudflare-cdn-cache-control']),
      ),
      cfCacheStatus: counts(samples.map(sample => sample.headers['cf-cache-status'])),
      contentEncoding: counts(samples.map(sample => sample.headers['content-encoding'])),
      edgeColo: counts(samples.map(sample => sample.headers['cf-ray']?.split('-').at(-1) ?? '')),
    },
    samples: samples.map(sample => ({
      phase: sample.phase,
      index: sample.index,
      attempt: sample.attempt,
      valid: sample.valid,
      error: sample.error,
      status: sample.status,
      dnsMs: sample.dnsMs,
      tcpMs: sample.tcpMs,
      tlsMs: sample.tlsMs,
      ttfbMs: sample.ttfbMs,
      downloadMs: sample.downloadMs,
      totalMs: sample.totalMs,
      transferredBytes: sample.transferredBytes,
      decodedBytes: sample.decodedBytes,
      cacheStatus: sample.headers['cf-cache-status'] ?? null,
      age: sample.headers.age ?? null,
      contentEncoding: sample.headers['content-encoding'] ?? null,
      edgeColo: sample.headers['cf-ray']?.split('-').at(-1) ?? null,
    })),
  }
}

const runHttpBenchmark = async timestamp => {
  const cases = targets.flatMap(target =>
    Object.keys(target.routes).map(route => ({ target, route })),
  )
  const samples = new Map(cases.map(item => [`${item.target.id}:${item.route}:warm`, []]))

  for (const item of cases) {
    for (let index = 0; index < httpSequentialRuns; index += 1) {
      process.stdout.write(`HTTP sequential ${item.target.id}/${item.route} ${index + 1}\n`)
      samples
        .get(`${item.target.id}:${item.route}:warm`)
        .push(
          ...(await sampleHttpUntilValid(
            item.target,
            item.route,
            'warm-sequential',
            index,
            timestamp,
          )),
        )
    }
  }

  const randomized = deterministicShuffle(
    Array.from({ length: httpRandomRuns }, (_, index) =>
      cases.map(item => ({ ...item, index })),
    ).flat(),
    2_607_2026,
  )
  for (const item of randomized) {
    process.stdout.write(`HTTP randomized ${item.target.id}/${item.route} ${item.index + 1}\n`)
    samples
      .get(`${item.target.id}:${item.route}:warm`)
      .push(
        ...(await sampleHttpUntilValid(
          item.target,
          item.route,
          'warm-randomized',
          item.index,
          timestamp,
        )),
      )
  }

  for (const target of targets.filter(item => item.cacheBust)) {
    for (const route of Object.keys(target.routes)) {
      const key = `${target.id}:${route}:cache-busted`
      samples.set(key, [])
      for (let index = 0; index < cacheBustedRuns; index += 1) {
        process.stdout.write(`HTTP cache-busted ${target.id}/${route} ${index + 1}\n`)
        samples
          .get(key)
          .push(...(await sampleHttpUntilValid(target, route, 'cache-busted', index, timestamp)))
      }
    }
  }

  return Object.fromEntries(
    targets.map(target => [
      target.id,
      Object.fromEntries(
        Object.keys(target.routes).map(route => [
          route,
          {
            url: `${target.origin}${target.routes[route]}`,
            warm: aggregateHttp(samples.get(`${target.id}:${route}:warm`)),
            cacheBusted: samples.has(`${target.id}:${route}:cache-busted`)
              ? aggregateHttp(samples.get(`${target.id}:${route}:cache-busted`))
              : null,
          },
        ]),
      ),
    ]),
  )
}

const lighthouseOrder = [
  { routes: ['home', 'product', 'catalog'], formFactors: ['mobile', 'desktop'], targets },
  {
    routes: ['product', 'catalog', 'home'],
    formFactors: ['desktop', 'mobile'],
    targets: [...targets].toReversed(),
  },
  { routes: ['catalog', 'home', 'product'], formFactors: ['mobile', 'desktop'], targets },
]

const parseLighthouse = report => {
  const metrics = {
    performance: round(report.categories.performance.score * 100),
    fcpMs: round(report.audits['first-contentful-paint'].numericValue),
    lcpMs: round(report.audits['largest-contentful-paint'].numericValue),
    speedIndexMs: round(report.audits['speed-index'].numericValue),
    tbtMs: round(report.audits['total-blocking-time'].numericValue),
    cls: Math.round(report.audits['cumulative-layout-shift'].numericValue * 10_000) / 10_000,
    accessibility: round(report.categories.accessibility.score * 100),
    bestPractices: round(report.categories['best-practices'].score * 100),
  }
  const invalidReasons = [
    report.runtimeError?.message,
    report.finalDisplayedUrl !== report.requestedUrl
      ? `Final URL differs: ${report.finalDisplayedUrl}`
      : undefined,
    ...report.runWarnings.filter(warning => /too slowly|incomplete/i.test(warning)),
    ...Object.entries(metrics)
      .filter(([, value]) => !Number.isFinite(value))
      .map(([name]) => `Missing ${name}`),
  ].filter(Boolean)
  return {
    valid: invalidReasons.length === 0,
    invalidReasons,
    fetchTime: report.fetchTime,
    requestedUrl: report.requestedUrl,
    finalDisplayedUrl: report.finalDisplayedUrl,
    warnings: report.runWarnings,
    metrics,
    config: {
      formFactor: report.configSettings.formFactor,
      throttlingMethod: report.configSettings.throttlingMethod,
      throttling: report.configSettings.throttling,
      screenEmulation: report.configSettings.screenEmulation,
    },
  }
}

const runLighthouseCase = async (target, route, formFactor, runIndex, chromePath) => {
  const reportPath = path.join(
    temporaryDirectory,
    `lighthouse-${target.id}-${route}-${formFactor}-${runIndex}.json`,
  )
  const url = `${target.origin}${target.routes[route]}`
  const args = [
    `lighthouse@${lighthouseVersion}`,
    url,
    '--output=json',
    `--output-path=${reportPath}`,
    '--quiet',
    '--only-categories=performance,accessibility,best-practices',
    '--max-wait-for-load=90000',
    '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
  ]
  if (formFactor === 'desktop') args.push('--preset=desktop')
  run('vpx', args, { env: { ...process.env, CHROME_PATH: chromePath } })
  return parseLighthouse(JSON.parse(await readFile(reportPath, 'utf8')))
}

const aggregateLighthouse = runs => {
  const validRuns = runs.filter(run => run.valid)
  const metricNames = Object.keys(validRuns[0].metrics)
  return {
    attemptedRuns: runs.length,
    validRuns: validRuns.length,
    excludedRuns: runs.length - validRuns.length,
    exclusions: runs.filter(run => !run.valid).map(run => run.invalidReasons),
    metrics: Object.fromEntries(
      metricNames.map(name => [name, distribution(validRuns.map(run => run.metrics[name]))]),
    ),
    runs,
  }
}

const runLighthouseBenchmark = async chromePath => {
  const runs = new Map()
  for (const target of targets) {
    for (const route of Object.keys(target.routes)) {
      for (const formFactor of ['mobile', 'desktop']) {
        runs.set(`${target.id}:${route}:${formFactor}`, [])
      }
    }
  }

  for (let roundIndex = 0; roundIndex < lighthouseOrder.length; roundIndex += 1) {
    const roundConfig = lighthouseOrder[roundIndex]
    for (const route of roundConfig.routes) {
      for (const formFactor of roundConfig.formFactors) {
        for (const target of roundConfig.targets) {
          const key = `${target.id}:${route}:${formFactor}`
          const current = runs.get(key)
          process.stdout.write(
            `Lighthouse ${roundIndex + 1}/${lighthouseRuns} ${target.id}/${route}/${formFactor}\n`,
          )
          current.push(
            await runLighthouseCase(target, route, formFactor, current.length, chromePath),
          )
        }
      }
    }
  }

  for (const [key, caseRuns] of runs) {
    while (caseRuns.filter(item => item.valid).length < lighthouseRuns && caseRuns.length < 5) {
      const [targetId, route, formFactor] = key.split(':')
      const target = targets.find(item => item.id === targetId)
      process.stdout.write(`Lighthouse retry ${targetId}/${route}/${formFactor}\n`)
      caseRuns.push(await runLighthouseCase(target, route, formFactor, caseRuns.length, chromePath))
    }
    if (caseRuns.filter(item => item.valid).length < lighthouseRuns) {
      throw new Error(`Fewer than ${lighthouseRuns} valid Lighthouse runs for ${key}.`)
    }
  }

  return Object.fromEntries(
    targets.map(target => [
      target.id,
      Object.fromEntries(
        Object.keys(target.routes).map(route => [
          route,
          Object.fromEntries(
            ['mobile', 'desktop'].map(formFactor => [
              formFactor,
              aggregateLighthouse(runs.get(`${target.id}:${route}:${formFactor}`)),
            ]),
          ),
        ]),
      ),
    ]),
  )
}

const readNavigationEntry = page =>
  page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0]
    if (!(entry instanceof PerformanceNavigationTiming)) return null
    return {
      durationMs: entry.duration,
      domContentLoadedMs: entry.domContentLoadedEventEnd,
      loadEventMs: entry.loadEventEnd,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      type: entry.type,
    }
  })

const measureTransition = async ({ page, cdp, target, transition }) => {
  const requests = new Map()
  const cached = new Set()
  const requestListener = event => {
    if (!event.request.url.startsWith('http')) return
    requests.set(event.requestId, {
      url: event.request.url,
      type: event.type,
      method: event.request.method,
      encodedBytes: 0,
      failed: false,
    })
  }
  const finishedListener = event => {
    const request = requests.get(event.requestId)
    if (request) request.encodedBytes = event.encodedDataLength
  }
  const failedListener = event => {
    const request = requests.get(event.requestId)
    if (request) request.failed = true
  }
  const cachedListener = event => cached.add(event.requestId)
  cdp.on('Network.requestWillBeSent', requestListener)
  cdp.on('Network.loadingFinished', finishedListener)
  cdp.on('Network.loadingFailed', failedListener)
  cdp.on('Network.requestServedFromCache', cachedListener)

  const isCatalog = transition === 'home-catalog'
  const selector = isCatalog ? target.links.catalog : target.links.product
  const heading = isCatalog ? target.headings.catalog : target.headings.product
  const oldOrigin = await page.evaluate(() => performance.timeOrigin)
  await page.evaluate(() => {
    window.__storeKitBenchmarkStart = performance.now()
  })
  await page.locator(selector).first().click({ noWaitAfter: true })
  await page.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor()
  const newOrigin = await page.evaluate(() => performance.timeOrigin)
  const durationMs = await page.evaluate(previousOrigin => {
    if (performance.timeOrigin !== previousOrigin) return performance.now()
    return performance.now() - window.__storeKitBenchmarkStart
  }, oldOrigin)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(100)

  cdp.off('Network.requestWillBeSent', requestListener)
  cdp.off('Network.loadingFinished', finishedListener)
  cdp.off('Network.loadingFailed', failedListener)
  cdp.off('Network.requestServedFromCache', cachedListener)

  const requestValues = [...requests.entries()].map(([id, request]) => ({
    ...request,
    cached: cached.has(id),
  }))
  return {
    durationMs: round(durationMs),
    requestCount: requestValues.length,
    transferredBytes: round(
      requestValues.reduce((total, request) => total + request.encodedBytes, 0),
    ),
    fullDocument: oldOrigin !== newOrigin,
    navigationEntry: await readNavigationEntry(page),
    requestTypes: counts(requestValues.map(request => request.type)),
    documentRequestCount: requestValues.filter(request => request.type === 'Document').length,
    frameRequestCount: requestValues.filter(request => new URL(request.url).pathname === '/_server')
      .length,
    cachedRequestCount: requestValues.filter(request => request.cached).length,
    failedRequestCount: requestValues.filter(request => request.failed).length,
  }
}

const aggregateNavigation = runs => ({
  sampleCount: runs.length,
  durationMs: distribution(runs.map(run => run.durationMs)),
  requestCount: distribution(runs.map(run => run.requestCount)),
  transferredBytes: distribution(runs.map(run => run.transferredBytes)),
  fullDocumentCount: runs.filter(run => run.fullDocument).length,
  runs,
})

const runNavigationBenchmark = async chromePath => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const result = {}
  try {
    for (const target of targets) {
      process.stdout.write(`Navigation setup ${target.id}\n`)
      const context = await browser.newContext({ viewport: { width: 1_440, height: 900 } })
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')

      await page.goto(`${target.origin}${target.routes.product}`, { waitUntil: 'networkidle' })
      const addButton = page.getByRole('button', { name: /САГСАНД НЭМЭХ|Сагсанд нэмэх/ })
      await addButton.click()
      const closeButton = page.getByRole('button', { name: /Сагс хаах/ })
      if (await closeButton.count()) await closeButton.click()
      await page.goto(`${target.origin}${target.routes.home}`, { waitUntil: 'networkidle' })

      await page.evaluate(selector => {
        window.__storeKitBenchmarkShell = document.querySelector(selector)
      }, target.shell)

      await measureTransition({ page, cdp, target, transition: 'home-catalog' })
      await measureTransition({ page, cdp, target, transition: 'catalog-product' })
      await page.goto(`${target.origin}${target.routes.home}`, { waitUntil: 'networkidle' })
      await page.evaluate(selector => {
        window.__storeKitBenchmarkShell = document.querySelector(selector)
      }, target.shell)

      const homeCatalog = []
      const catalogProduct = []
      for (let index = 0; index < navigationRuns; index += 1) {
        process.stdout.write(`Navigation ${target.id} ${index + 1}/${navigationRuns}\n`)
        homeCatalog.push(await measureTransition({ page, cdp, target, transition: 'home-catalog' }))
        catalogProduct.push(
          await measureTransition({ page, cdp, target, transition: 'catalog-product' }),
        )
        if (index < navigationRuns - 1) {
          await page.goto(`${target.origin}${target.routes.home}`, { waitUntil: 'networkidle' })
          await page.evaluate(selector => {
            window.__storeKitBenchmarkShell = document.querySelector(selector)
          }, target.shell)
        }
      }

      const state = await page.evaluate(
        ({ cartStorage, shell }) => {
          const value = localStorage.getItem(cartStorage)
          return {
            cartStoragePresent: Boolean(value),
            cartStorageValue: value,
            shellNodePersisted:
              Boolean(window.__storeKitBenchmarkShell) &&
              window.__storeKitBenchmarkShell === document.querySelector(shell),
          }
        },
        { cartStorage: target.cartStorage, shell: target.shell },
      )
      const cartItems = state.cartStorageValue ? target.cartItems(state.cartStorageValue).length : 0
      result[target.id] = {
        viewport: { width: 1_440, height: 900 },
        warmupRunsExcluded: 1,
        homeCatalog: aggregateNavigation(homeCatalog),
        catalogProduct: aggregateNavigation(catalogProduct),
        state: {
          shellNodePersisted: state.shellNodePersisted,
          cartStoragePresent: state.cartStoragePresent,
          cartItemCountAfterFlows: cartItems,
        },
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
  return result
}

const commandVersion = (command, args) => run(command, args).split('\n')[0]
const packageVersion = async packagePath =>
  JSON.parse(await readFile(path.join(appDirectory, packagePath), 'utf8')).version

try {
  const startedAt = new Date()
  const timestamp = startedAt.toISOString().replaceAll(/[:.]/g, '-')
  const chromePath = chromium.executablePath()
  const snapshot = {
    schemaVersion: 1,
    title: 'DUND Solid 2 and Plugged Astro/Solid 1 deployed benchmark',
    measuredAt: startedAt.toISOString(),
    completedAt: null,
    source: {
      baselineCommit: run('git', ['rev-parse', 'HEAD']),
      note: 'Measurements were taken before adding the benchmark presentation to the review route. Home, catalog, and product code did not change.',
      frameworks: {
        dund: {
          solid: await packageVersion('node_modules/solid-js/package.json'),
          solidWeb: await packageVersion('node_modules/@solidjs/web/package.json'),
          solidRouter: await packageVersion('node_modules/@solidjs/router/package.json'),
          vitePluginSolid: await packageVersion('node_modules/vite-plugin-solid/package.json'),
        },
        plugged: {
          astro: await packageVersion('../plugged/node_modules/astro/package.json'),
          solid: await packageVersion('../plugged/node_modules/solid-js/package.json'),
        },
      },
    },
    environment: {
      host: 'Local development workstation in Ulaanbaatar, Mongolia',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model,
      logicalCpuCount: os.cpus().length,
      memoryGiB: round(os.totalmem() / 1024 ** 3),
      network: 'Host network, no VPN or proxy configured by the benchmark',
      cloudflareEdgeColo: 'Derived from each HTTP sample cf-ray header',
    },
    tools: {
      node: process.version,
      curl: commandVersion('curl', ['--version']),
      playwright: commandVersion('vp', ['exec', 'playwright', '--version']),
      chromium: commandVersion(chromePath, ['--version']),
      lighthouse: lighthouseVersion,
      vitePlus: commandVersion('vp', ['--version']),
    },
    targets: Object.fromEntries(
      targets.map(target => [
        target.id,
        {
          name: target.name,
          origin: target.origin,
          routes: Object.fromEntries(
            Object.entries(target.routes).map(([name, route]) => [
              name,
              `${target.origin}${route}`,
            ]),
          ),
        },
      ]),
    ),
    methodology: {
      http: {
        command:
          "curl --location --compressed --header 'Accept: text/html' --write-out <timing fields> <url>",
        warmSamplesPerRoute: httpSequentialRuns + httpRandomRuns,
        sequence: `${httpSequentialRuns} route-grouped sequential samples, then ${httpRandomRuns} samples per route in one deterministic randomized order`,
        cacheBustedSamplesPerEligibleRoute: cacheBustedRuns,
        cachePolicy:
          'Only Plugged received five bounded unique-query samples per route. DUND frame documents are not shared-cacheable, so cache busting is not semantically useful.',
        failures:
          'Curl transfers have a 10 second connect timeout and 20 second total timeout. Incomplete attempts are retained as exclusions and retried up to four times with a new bounded cache-bust key when applicable.',
      },
      lighthouse: {
        command: `CHROME_PATH=<Playwright Chromium> vpx lighthouse@${lighthouseVersion} <url> --output=json --quiet --only-categories=performance,accessibility,best-practices --max-wait-for-load=90000 [--preset=desktop]`,
        validRunsPerCase: lighthouseRuns,
        routeCount: 3,
        formFactors: ['mobile', 'desktop'],
        ordering:
          'Three interleaved rounds changed route, form-factor, and target order to reduce fixed-order bias.',
        validity:
          'A run is excluded when Lighthouse reports a runtime error, redirects to another displayed URL, or omits a required numeric metric. Up to two retries are allowed.',
      },
      navigation: {
        command: 'node apps/demo-solid-store/benchmark/run.mjs',
        measuredRunsPerTransition: navigationRuns,
        warmupRunsExcluded: 1,
        conditions:
          'Desktop Chromium, 1440 × 900, unthrottled host network, one persistent browser cache per target.',
        duration:
          'Browser performance.now() from click to the destination h1. A new document uses its new Performance time origin.',
        transfer:
          'Chrome DevTools Protocol Network.loadingFinished encodedDataLength summed for requests that start after the click.',
      },
      aggregation:
        'Nearest-rank percentiles over valid runs. Median is p50. Lighthouse tables use three valid cold-navigation runs per case. HTTP and app-navigation retain compact per-run values.',
    },
    http: await runHttpBenchmark(timestamp),
    lighthouse: await runLighthouseBenchmark(chromePath),
    navigation: await runNavigationBenchmark(chromePath),
  }
  snapshot.completedAt = new Date().toISOString()
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  process.stdout.write(`Benchmark snapshot written to ${outputPath}\n`)
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
