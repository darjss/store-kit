import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

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

const occurrenceCount = (source, value) => source.split(value).length - 1

const checkoutForm = input => {
  const form = new FormData()
  form.set('idempotencyKey', input.idempotencyKey)
  form.set('items', JSON.stringify(input.items))
  form.set('customer.name', input.customer.name)
  form.set('customer.phone', input.customer.phone)
  form.set('delivery.district', input.delivery.district)
  form.set('delivery.khoroo', input.delivery.khoroo)
  form.set('delivery.address', input.delivery.address)
  if (input.delivery.notes) form.set('delivery.notes', input.delivery.notes)
  form.set('paymentMethod', input.paymentMethod)
  return form
}

const runBrowserViewport = async (browser, name, viewport) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const runtimeErrors = []
  const serverRequests = []
  page.on('pageerror', error => runtimeErrors.push(error.stack ?? error.message))
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`)
  })
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/_server') {
      serverRequests.push({
        functionId: request.headers()['x-server-function-id'],
        method: request.method(),
        url: request.url(),
      })
    }
  })

  try {
    serverRequests.length = 0
    const directResponse = await page.goto(`${origin}/products/shiljilt-bridge-coat`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByRole('heading', { level: 1, name: 'Шилжилт хүрэм' }).waitFor()
    await page.getByRole('button', { name: /Сагсанд нэмэх/ }).waitFor()
    await page.waitForTimeout(150)
    record(`${name}: direct product hydration adopts without a boot server-function fetch`, () => {
      assert.equal(directResponse?.status(), 200)
      assert.equal(serverRequests.length, 0)
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })

    const gallery = page.getByRole('region', { name: 'Барааны зургийн цомог' })
    const galleryBox = await gallery.boundingBox()
    const previousControlBox = await page.getByRole('button', { name: 'Өмнөх зураг' }).boundingBox()
    const nextControlBox = await page.getByRole('button', { name: 'Дараах зураг' }).boundingBox()
    await gallery.locator('img[alt]').evaluate(async image => {
      if (image.complete && image.naturalWidth > 0) return
      await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true })
        image.addEventListener('error', () => reject(new Error('Product image failed to load.')), {
          once: true,
        })
      })
    })
    const initialImageUrl = await gallery.locator('img[alt]').getAttribute('src')
    const pageOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    record(`${name}: carousel has stable responsive geometry and usable controls`, () => {
      assert.ok(galleryBox)
      assert.ok(previousControlBox)
      assert.ok(nextControlBox)
      assert.ok(galleryBox.width <= viewport.width)
      assert.ok(galleryBox.height > 0)
      assert.ok(previousControlBox.width >= 44 && previousControlBox.height >= 44)
      assert.ok(nextControlBox.width >= 44 && nextControlBox.height >= 44)
      assert.equal(pageOverflows, false)
      assert.match(initialImageUrl ?? '', new RegExp(`^${origin.replaceAll('.', '\\.')}/media/`))
    })

    await gallery.focus()
    await page.keyboard.press('End')
    await page.getByRole('button', { name: /^4-р зураг:/ }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: /^4-р зураг:/ }).getAttribute('aria-current'),
      'true',
    )
    await page.keyboard.press('Home')
    assert.equal(
      await page.getByRole('button', { name: /^1-р зураг:/ }).getAttribute('aria-current'),
      'true',
    )
    await page.keyboard.press('ArrowRight')
    assert.equal(
      await page.getByRole('button', { name: /^2-р зураг:/ }).getAttribute('aria-current'),
      'true',
    )

    assert.ok(galleryBox)
    await gallery.dispatchEvent('pointerdown', {
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      clientX: galleryBox.width * 0.75,
      clientY: galleryBox.height / 2,
    })
    await gallery.dispatchEvent('pointerup', {
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      clientX: galleryBox.width * 0.25,
      clientY: galleryBox.height / 2,
    })
    await page.waitForFunction(
      () =>
        document.querySelector('button[aria-label^="3-р зураг:"]')?.getAttribute('aria-current') ===
        'true',
    )

    const asphaltAlternate = page.getByRole('button', { name: /^4-р зураг:/ })
    await asphaltAlternate.click()
    const alternateUrl = await gallery.locator('img[alt]').getAttribute('src')
    const mediumVariant = page.getByRole('button', { name: 'M', exact: true })
    await mediumVariant.click()
    await page.waitForFunction(
      () => document.querySelector('button[aria-pressed="true"]')?.textContent?.trim() === 'M',
    )
    const retainedSizeImageUrl = await gallery.locator('img[alt]').getAttribute('src')
    const cobaltColor = page.getByRole('button', { name: 'Кобальт', exact: true })
    await cobaltColor.click()
    const cobaltImageUrl = await gallery.locator('img[alt]').getAttribute('src')
    const selectedSize = await page
      .locator('fieldset')
      .filter({ hasText: 'Хэмжээ' })
      .locator('button[aria-pressed="true"]')
      .textContent()
    const mediumDisabledForCobalt = await mediumVariant.isDisabled()
    const soldOutExtraLargeDisabled = await page
      .getByRole('button', { name: 'XL', exact: true })
      .isDisabled()
    await page.getByRole('button', { name: /Дараах зураг/ }).click()
    await page.waitForFunction(
      () =>
        document.querySelector('button[aria-label^="3-р зураг:"]')?.getAttribute('aria-current') ===
        'true',
    )
    await page.getByRole('button', { name: /Өмнөх зураг/ }).click()
    await page.waitForFunction(
      () =>
        document.querySelector('button[aria-label^="2-р зураг:"]')?.getAttribute('aria-current') ===
        'true',
    )
    await page.getByRole('button', { name: 'Нэгээр нэмэх' }).click()
    await page.waitForFunction(
      () =>
        document.querySelector('output[aria-label="Сонгосон тоо"]')?.textContent?.trim() === '2',
    )
    const selectedQuantity = await page.locator('output[aria-label="Сонгосон тоо"]').textContent()
    await page.getByRole('button', { name: /Сагсанд нэмэх/ }).click()
    const cartDialog = page.getByRole('dialog', { name: 'Сагс' })
    await cartDialog.waitFor()
    const cartCount = await page
      .locator('button[aria-label^="Сагс,"]')
      .first()
      .getAttribute('aria-label')
    const cartImageUrl = await cartDialog.locator('article img').getAttribute('src')
    const cobaltPressed = await cobaltColor.getAttribute('aria-pressed')
    record(`${name}: keyboard, pointer swipe, variant images, and cart selection work`, () => {
      assert.equal(retainedSizeImageUrl, alternateUrl)
      assert.match(
        cobaltImageUrl ?? '',
        /c15fd6142ad1556886d1008b68445ad4457e4eaeae4b49dbe3f92176f2530a62/,
      )
      assert.equal(selectedSize?.trim(), 'L')
      assert.equal(mediumDisabledForCobalt, true)
      assert.equal(soldOutExtraLargeDisabled, true)
      assert.equal(cobaltPressed, 'true')
      assert.equal(selectedQuantity?.trim(), '2')
      assert.equal(cartCount, 'Сагс, 2 бараа')
      assert.match(
        cartImageUrl ?? '',
        /c15fd6142ad1556886d1008b68445ad4457e4eaeae4b49dbe3f92176f2530a62/,
      )
    })
    await cartDialog.getByText('L / Кобальт', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Сагс хаах' }).click()

    serverRequests.length = 0
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('button[aria-label="Сагс, 2 бараа"]').first().waitFor()
    await page.getByRole('heading', { level: 1, name: 'Шилжилт хүрэм' }).waitFor()
    const persistedQuantity = await page.evaluate(() => {
      const stored = localStorage.getItem('dund:cart:v1')
      if (!stored) return undefined
      return JSON.parse(stored).items[0]?.quantity
    })
    record(`${name}: cart state persists across a direct reload`, () => {
      assert.equal(persistedQuantity, 2)
      assert.equal(serverRequests.length, 0)
    })

    await page.goto(`${origin}/products`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
    const useCaseNavigation = page.getByRole('navigation', { name: 'Хэрэглээгээр шүүх' })
    const currentUseCases = await useCaseNavigation
      .locator('a[aria-current="page"]')
      .allTextContents()
    const skipLinkCurrent = await page
      .getByRole('link', { name: 'Үндсэн хэсэг рүү очих' })
      .getAttribute('aria-current')
    record(`${name}: Router current state does not corrupt query or hash links`, () => {
      assert.deepEqual(
        currentUseCases.map(value => value.trim()),
        ['Бүх хэрэглээ'],
      )
      assert.equal(skipLinkCurrent, null)
    })

    const disclosure = page.locator('details').first()
    await disclosure.locator('summary').click()
    const outerwearFilter = disclosure.getByRole('link', { name: 'Гадуур хувцас', exact: true })
    await outerwearFilter.click()
    await page.waitForURL('**/products?category=outerwear')
    await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
    const activeFilter = await page.evaluate(() => document.activeElement?.textContent?.trim())
    const disclosureOpen = await disclosure.evaluate(element => element.open)
    record(`${name}: catalog filter navigation preserves disclosure and focus`, () => {
      assert.equal(disclosureOpen, true)
      assert.equal(activeFilter, 'Гадуур хувцас')
    })
    assert.equal(
      await disclosure
        .locator('a[aria-current="page"]')
        .filter({ hasText: 'Гадуур хувцас' })
        .count(),
      1,
    )

    await page
      .getByRole('heading', { level: 2, name: 'Шилжилт хүрэм' })
      .getByRole('link', { name: 'Шилжилт хүрэм' })
      .click()
    await page.getByRole('button', { name: /Сагсанд нэмэх/ }).waitFor()
    await page.waitForFunction(() => document.activeElement?.id === 'main-content')
    record(
      `${name}: catalog-to-product client navigation mounts the complete product route`,
      () => {
        assert.equal(new URL(page.url()).pathname, '/products/shiljilt-bridge-coat')
        assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
      },
    )
    assert.equal(await page.title(), 'Шилжилт хүрэм · ДУНД')

    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
    await page.goForward({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Сагсанд нэмэх/ }).waitFor()
    record(`${name}: back and forward retain the route and cart owners`, () => {
      assert.equal(new URL(page.url()).pathname, '/products/shiljilt-bridge-coat')
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })
    assert.equal(
      await page.locator('button[aria-label="Сагс, 2 бараа"]').first().getAttribute('aria-label'),
      'Сагс, 2 бараа',
    )

    await page.evaluate(() => {
      const link = document.querySelector('a[href="/products"]')
      if (!(link instanceof HTMLAnchorElement)) throw new Error('Catalog link not found.')
      link.click()
    })
    await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
    const rapidTargets = await page
      .locator('section[aria-label="Барааны жагсаалт"] h2 a')
      .evaluateAll(links =>
        links.slice(0, 3).map(link => ({ href: link.href, name: link.textContent?.trim() })),
      )
    assert.equal(rapidTargets.length, 3)
    await page.locator('section[aria-label="Барааны жагсаалт"] h2 a').evaluateAll(links => {
      for (const link of links.slice(0, 3)) link.click()
    })
    const finalTarget = rapidTargets.at(-1)
    await page.waitForURL(finalTarget.href)
    await page.getByRole('heading', { level: 1, name: finalTarget.name }).waitFor()
    await page.waitForTimeout(300)
    record(`${name}: rapid real navigations reject stale route responses`, () => {
      assert.equal(page.url(), finalTarget.href)
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })

    if (name === 'desktop browser') {
      await page.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded' })
      const checkoutForm = page.locator('form[action*="/_server"]').first()
      await checkoutForm.waitFor()
      await page.locator('#customer-name').fill('Тэмүүлэн')
      await page.locator('#customer-phone').fill('99112233')
      await page.locator('#delivery-khoroo').fill('1-р хороо')
      await page.locator('#delivery-address').fill('Энхтайвны өргөн чөлөө 1')
      await page.getByRole('radio', { name: /Дансаар шилжүүлэх/ }).check()
      const formMethod = await checkoutForm.getAttribute('method')
      const checkoutActionUrl = new URL(await checkoutForm.getAttribute('action'), origin)
      serverRequests.length = 0
      await page.getByRole('button', { name: 'Захиалга үүсгэх →' }).evaluate(button => {
        button.click()
        button.click()
      })
      await page.getByText('ЗАХИАЛГА / ҮҮССЭН').waitFor()
      await page.waitForFunction(() => document.activeElement?.id === 'main-content')
      const checkoutRequests = serverRequests.filter(
        request => request.functionId === checkoutActionUrl.searchParams.get('id'),
      )
      record(`${name}: checkout Router action is POST-only and duplicate-click safe`, () => {
        assert.equal(formMethod?.toLowerCase(), 'post')
        assert.equal(checkoutRequests.length, 1)
        assert.equal(checkoutRequests[0].method, 'POST')
        assert.ok(
          checkoutRequests.every(
            request => !/Тэмүүлэн|99112233|Энхтайвны/.test(decodeURIComponent(request.url)),
          ),
        )
        assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
      })

      await page.goto(`${origin}/products/shiljilt-bridge-coat`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('button', { name: /Сагсанд нэмэх/ }).click()
      await page.getByRole('dialog', { name: 'Сагс' }).waitFor()
      await page.getByRole('button', { name: 'Сагс хаах' }).click()
      await page.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded' })
      const disposalForm = page.locator('form[action*="/_server"]').first()
      await disposalForm.waitFor()
      await page.locator('#customer-name').fill('Саруул')
      await page.locator('#customer-phone').fill('88112233')
      await page.locator('#delivery-khoroo').fill('2-р хороо')
      await page.locator('#delivery-address').fill('Сөүлийн гудамж 2')
      await page.getByRole('radio', { name: /Дансаар шилжүүлэх/ }).check()
      const disposalActionUrl = new URL(await disposalForm.getAttribute('action'), origin)
      const actionRequest = page.waitForRequest(
        request =>
          request.headers()['x-server-function-id'] === disposalActionUrl.searchParams.get('id'),
      )
      await page.getByRole('button', { name: 'Захиалга үүсгэх →' }).click()
      const pendingRequest = await actionRequest
      await page.goto(`${origin}/products`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
      await page.waitForTimeout(300)
      await page.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(100)
      const staleSuccessCount = await page.getByText('ЗАХИАЛГА / ҮҮССЭН').count()
      record(`${name}: checkout action disposal cannot restore a stale result`, () => {
        assert.equal(pendingRequest.method(), 'POST')
        assert.equal(staleSuccessCount, 0)
        assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
      })
    }
  } finally {
    await context.close()
  }
}

const runReviewViewport = async (browser, name, viewport) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const runtimeErrors = []
  const serverRequests = []
  page.on('pageerror', error => runtimeErrors.push(error.stack ?? error.message))
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`)
  })
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/_server') serverRequests.push(request.url())
  })

  try {
    const response = await page.goto(`${origin}/review/solid2`, { waitUntil: 'domcontentloaded' })
    await page
      .getByRole('heading', { level: 1, name: 'Two storefronts. Two ownership models.' })
      .waitFor()
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(() => ({
      present: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      widths: `${document.documentElement.clientWidth}/${document.documentElement.scrollWidth}`,
      candidates: [...document.querySelectorAll('body *')]
        .filter(element => {
          const bounds = element.getBoundingClientRect()
          return bounds.left < -1 || bounds.right > document.documentElement.clientWidth + 1
        })
        .slice(0, 12)
        .map(element => `${element.tagName.toLowerCase()}.${element.className}`),
    }))
    record(`${name}: review direct load adopts with no boot frame request or overflow`, () => {
      assert.equal(response?.status(), 200)
      assert.equal(serverRequests.length, 0)
      assert.equal(overflow.present, false, `${overflow.widths}: ${overflow.candidates.join('\n')}`)
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })
    assert.equal(await page.title(), 'Astro vs Solid 2 architecture review · ДУНД')

    const benchmarkSection = page.locator('#benchmarks')
    await benchmarkSection
      .getByRole('heading', {
        level: 2,
        name: 'Real timings, mixed results, no framework victory lap.',
      })
      .waitFor()
    const benchmarkOverflow = await benchmarkSection.evaluate(element => ({
      present: element.scrollWidth > element.clientWidth,
      widths: `${element.clientWidth}/${element.scrollWidth}`,
    }))
    const benchmarkLinks = await benchmarkSection
      .getByRole('navigation', { name: 'Benchmarked routes' })
      .locator('a')
      .evaluateAll(links => links.map(link => ({ href: link.href, rel: link.rel })))
    const benchmarkDetails = benchmarkSection.locator('details')
    const benchmarkDetailCount = await benchmarkDetails.count()
    const firstBenchmarkSummary = benchmarkDetails.first().locator('summary')
    assert.match((await firstBenchmarkSummary.textContent()) ?? '', /HTTP p75 \/ p95/)
    await firstBenchmarkSummary.focus()
    await page.keyboard.press('Enter')
    const rawHttpOpen = await benchmarkDetails.first().evaluate(element => element.open)
    await benchmarkDetails
      .first()
      .getByText(/p75 .* · p95/)
      .first()
      .waitFor()
    await page.keyboard.press('Enter')
    const rawHttpClosed = !(await benchmarkDetails.first().evaluate(element => element.open))
    const visibleBenchmarkTables = await benchmarkSection.locator('table:visible').count()
    const visibleBenchmarkCards = await benchmarkSection.locator('article:visible').count()
    record(`${name}: benchmark section renders real labels, links, and native details`, () => {
      assert.equal(benchmarkOverflow.present, false, benchmarkOverflow.widths)
      assert.equal(benchmarkDetailCount, 3)
      assert.equal(rawHttpOpen, true)
      assert.equal(rawHttpClosed, true)
      assert.ok(visibleBenchmarkCards >= 4)
      assert.equal(
        benchmarkLinks.some(
          link => link.href === 'https://dund.darjs.dev/products/shiljilt-bridge-coat',
        ),
        true,
      )
      assert.equal(
        benchmarkLinks.some(
          link => link.href === 'https://storekit.plugged.darjs.dev/products/truthear-keyx',
        ),
        true,
      )
      assert.ok(benchmarkLinks.every(link => link.rel.includes('noreferrer')))
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })
    await benchmarkSection.getByText(/TBT is a lab responsiveness proxy/).waitFor()
    await benchmarkSection.getByText(/directional—not a controlled framework bake-off/).waitFor()
    if (name === '320px review') {
      record(`${name}: benchmark swaps wide tables for narrow result cards`, () => {
        assert.equal(visibleBenchmarkTables, 0)
        assert.ok(visibleBenchmarkCards >= 20)
      })
    }
    if (name === 'desktop review') {
      record(`${name}: benchmark exposes four desktop data tables`, () => {
        assert.equal(visibleBenchmarkTables, 4)
      })
    }

    const externalLinks = await page
      .locator('a[target="_blank"]')
      .evaluateAll(links => links.map(link => ({ href: link.href, rel: link.rel })))
    record(`${name}: review launch links and 404 probe are explicit new-tab destinations`, () => {
      assert.ok(externalLinks.some(link => link.href === 'https://dund.darjs.dev/'))
      assert.ok(externalLinks.some(link => link.href === 'https://storekit.plugged.darjs.dev/'))
      assert.ok(externalLinks.some(link => link.href === `${origin}/review/solid2/not-found`))
      assert.ok(
        externalLinks
          .filter(link => link.href.startsWith('https://'))
          .every(link => link.rel.includes('noreferrer')),
      )
    })

    const clientNavigation = page.getByRole('button', { name: 'Client navigation' })
    await clientNavigation.focus()
    await page.keyboard.press('Enter')
    assert.equal(await clientNavigation.getAttribute('aria-pressed'), 'true')
    const nextPhase = page.getByRole('button', { name: 'Next request phase' })
    await nextPhase.click()
    await page.getByText('The next route asks for authority.').waitFor()
    const persistToggle = page.getByRole('button', { name: 'Highlight persistent regions' })
    await persistToggle.click()
    record(`${name}: review learning controls work by keyboard and expose pressed state`, () => {
      assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
    })
    assert.equal(
      await page.getByRole('button', { name: 'Show every region' }).getAttribute('aria-pressed'),
      'true',
    )

    if (name === 'desktop review') {
      const previewToggle = page.getByRole('button', { name: 'Load live panes' })
      assert.equal(await page.locator('#live-preview-panes iframe').count(), 0)
      await previewToggle.click()
      const closePreviews = page.getByRole('button', { name: 'Close live panes' })
      assert.equal(await closePreviews.getAttribute('aria-expanded'), 'true')
      assert.equal(await page.locator('#live-preview-panes iframe').count(), 2)
      await closePreviews.click()
      assert.equal(await page.locator('#live-preview-panes iframe').count(), 0)
    }

    serverRequests.length = 0
    await page.getByRole('link', { name: 'Back to DUND capsule' }).click()
    await page.getByRole('heading', { level: 1, name: 'Бүх давхарга' }).waitFor()
    await page.waitForFunction(() => document.activeElement?.id === 'main-content')
    record(
      `${name}: review-to-store client navigation uses frame transport and restores focus`,
      () => {
        assert.ok(serverRequests.some(url => new URL(url).pathname === '/_server'))
        assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'))
      },
    )

    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page
      .getByRole('heading', { level: 1, name: 'Two storefronts. Two ownership models.' })
      .waitFor()
    await page.waitForFunction(() => document.activeElement?.id === 'main-content')
    assert.equal(await page.title(), 'Astro vs Solid 2 architecture review · ДУНД')
  } finally {
    await context.close()
  }
}

const runBrowserProof = async privateOrder => {
  const browser = await chromium.launch({ headless: true })
  try {
    await runBrowserViewport(browser, 'desktop browser', { width: 1440, height: 900 })
    await runBrowserViewport(browser, '320px mobile browser', { width: 320, height: 720 })
    await runReviewViewport(browser, 'desktop review', { width: 1440, height: 900 })
    await runReviewViewport(browser, 'tablet review', { width: 768, height: 1024 })
    await runReviewViewport(browser, '320px review', { width: 320, height: 720 })

    const reducedMotionContext = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    })
    const reducedMotionPage = await reducedMotionContext.newPage()
    await reducedMotionPage.goto(`${origin}/products/shiljilt-bridge-coat`, {
      waitUntil: 'domcontentloaded',
    })
    const reducedGallery = reducedMotionPage.getByRole('region', {
      name: 'Барааны зургийн цомог',
    })
    await reducedGallery.waitFor()
    const reducedAnimationName = await reducedGallery
      .locator('img[alt]')
      .evaluate(element => getComputedStyle(element).animationName)
    record('reduced motion removes the carousel movement animation', () => {
      assert.equal(reducedAnimationName, 'none')
    })
    await reducedMotionPage.goto(`${origin}/review/solid2`, { waitUntil: 'domcontentloaded' })
    const reducedTransition = await reducedMotionPage
      .getByRole('button', { name: 'Client navigation' })
      .evaluate(element => getComputedStyle(element).transitionProperty)
    record('reduced motion removes review control transitions', () => {
      assert.equal(reducedTransition, 'none')
    })
    await reducedMotionContext.close()

    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const offlinePage = await offlineContext.newPage()
    await offlinePage.goto(`${origin}/products`, { waitUntil: 'domcontentloaded' })
    await offlineContext.setOffline(true)
    await offlinePage.locator('section[aria-label="Барааны жагсаалт"] h2 a').first().click()
    await offlinePage.getByRole('heading', { level: 1, name: 'Барааг ачаалж чадсангүй.' }).waitFor()
    const offlineNotFoundCount = await offlinePage.getByText('Бараа олдсонгүй.').count()
    const offlineRetryCount = await offlinePage
      .getByRole('button', { name: 'Дахин ачаалах' })
      .count()
    record('offline product navigation renders a recoverable transport error', () => {
      assert.equal(offlinePage.url().startsWith(`${origin}/products/`), true)
      assert.equal(offlineNotFoundCount, 0)
      assert.equal(offlineRetryCount, 1)
    })
    await offlineContext.close()

    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    })
    const noJsPage = await noJsContext.newPage()
    await noJsPage.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded' })
    const noJsText = await noJsPage.locator('body').textContent()
    const noJsCustomerFields = await noJsPage.locator('[name="customer.name"]').count()
    record('no-JS checkout states the localStorage limitation and collects no PII', () => {
      assert.match(noJsText ?? '', /JavaScript шаардлагатай/)
      assert.equal(noJsCustomerFields, 0)
    })
    await noJsContext.close()

    const paymentContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const paymentPage = await paymentContext.newPage()
    const paymentErrors = []
    const paymentRequests = []
    paymentPage.on('pageerror', error => paymentErrors.push(error.stack ?? error.message))
    paymentPage.on('console', message => {
      if (message.type() === 'error') paymentErrors.push(`console.error: ${message.text()}`)
    })
    paymentPage.on('request', request => {
      if (new URL(request.url()).pathname === '/_server') paymentRequests.push(request)
    })
    await paymentPage.goto(
      `${origin}/orders/${privateOrder.orderId}#token=${encodeURIComponent(privateOrder.statusToken)}`,
      { waitUntil: 'domcontentloaded' },
    )
    const orderHeading = paymentPage.getByRole('heading', { level: 1, name: /DND-/ })
    await orderHeading.waitFor()
    const expectedOrderNumber = await orderHeading.textContent()
    const staleOrderId = 'ord_01kyfqxb0ne06sxpvwgf6b37re'
    await paymentPage.evaluate(
      ({ orderId, staleOrderId }) => {
        sessionStorage.setItem(`dund:order-token:${staleOrderId}`, 'x'.repeat(32))
        const stale = document.createElement('a')
        stale.href = `/orders/${staleOrderId}`
        const current = document.createElement('a')
        current.href = `/orders/${orderId}`
        document.body.append(stale, current)
        stale.click()
        current.click()
      },
      { orderId: privateOrder.orderId, staleOrderId },
    )
    await paymentPage.waitForURL(`**/orders/${privateOrder.orderId}`)
    await paymentPage.getByRole('heading', { level: 1, name: expectedOrderNumber.trim() }).waitFor()
    await paymentPage.waitForTimeout(300)
    record('rapid private-route changes reject stale order and token results', () => {
      assert.equal(new URL(paymentPage.url()).pathname, `/orders/${privateOrder.orderId}`)
      assert.equal(paymentErrors.length, 0, paymentErrors.join('\n'))
    })

    const claimForm = paymentPage.locator('form[action*="/_server"]').filter({
      has: paymentPage.getByRole('button', { name: 'Би төлбөр шилжүүлсэн' }),
    })
    const claimActionUrl = new URL(await claimForm.getAttribute('action'), origin)
    paymentRequests.length = 0
    await paymentPage.getByRole('button', { name: 'Би төлбөр шилжүүлсэн' }).evaluate(button => {
      button.click()
      button.click()
    })
    const actionNotice = paymentPage.locator('p[tabindex="-1"][aria-live]').first()
    await actionNotice.waitFor({ timeout: 30_000 })
    await paymentPage.waitForFunction(
      () => document.activeElement?.matches('p[tabindex="-1"][aria-live]'),
      undefined,
      { timeout: 30_000 },
    )
    const claimRequests = paymentRequests.filter(
      request =>
        request.headers()['x-server-function-id'] === claimActionUrl.searchParams.get('id'),
    )
    record('payment Router action is duplicate-click safe and focuses its announcement', () => {
      assert.equal(claimRequests.length, 1)
      assert.equal(claimRequests[0].method(), 'POST')
      assert.equal(paymentErrors.length, 0, paymentErrors.join('\n'))
    })
    await paymentContext.close()
  } finally {
    await browser.close()
  }
}

try {
  const seedEnvironment = {
    ...process.env,
    STORE_KIT_APP: 'demo-solid-store',
    STORE_KIT_PERSIST_TO: persistenceDirectory,
  }
  for (let index = 0; index < 2; index += 1) {
    run(
      'node',
      [
        '--experimental-strip-types',
        '../../packages/tooling/catalog-seed.ts',
        '--environment',
        'local',
        '--only',
        'media',
      ],
      { env: seedEnvironment },
    )
  }
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
  const benchmark = JSON.parse(
    await readFile(path.join(appDirectory, 'src/benchmark/solid2-vs-plugged.json'), 'utf8'),
  )
  const wranglerConfig = await readFile(path.join(appDirectory, 'wrangler.jsonc'), 'utf8')
  const mediaHashes = await Promise.all(
    seed.products.flatMap(product =>
      product.images.map(async image => {
        const source = await readFile(path.join(appDirectory, image.source))
        const published = await readFile(path.join(appDirectory, 'public/media', image.r2Key))
        return {
          sourceHash: createHash('sha256').update(source).digest('hex'),
          publishedHash: createHash('sha256').update(published).digest('hex'),
          keyHash: path.basename(image.r2Key, path.extname(image.r2Key)),
        }
      }),
    ),
  )
  record('the original ДУНД seed has five controlled clothing categories', () => {
    assert.deepEqual(
      seed.categories.map(category => category.slug),
      ['outerwear', 'shirts', 'knitwear', 'base-layers', 'trousers'],
    )
    assert.equal(seed.products.length, 5)
    assert.equal(seed.checkoutSettings.orderPrefix, 'DND')
    assert.ok(seed.products.every(product => product.variants.length > 0))
    assert.ok(seed.products.every(product => product.images.length > 0))
    assert.equal(
      seed.products.find(product => product.slug === 'shiljilt-bridge-coat')?.images.length,
      4,
    )
    assert.ok(
      seed.products
        .filter(product => product.featured)
        .every(product => product.images.length >= 4),
    )
    assert.ok(
      seed.products
        .flatMap(product => product.variants)
        .every(variant => variant.options.size && variant.options.color),
    )
    const allowed = new Set(['workday', 'off-duty', 'layering', 'travel', 'cold-weather'])
    assert.ok(seed.products.flatMap(product => product.useCases).every(tag => allowed.has(tag)))
    for (const product of seed.products) {
      const colorKeys = new Map()
      for (const variant of product.variants.filter(variant => variant.stockQuantity > 0)) {
        const primaryKey = variant.imageKeys[0]
        const image = product.images.find(candidate => candidate.r2Key === primaryKey)
        assert.ok(image)
        assert.match(image.alt, new RegExp(variant.options.color, 'i'))
        const existing = colorKeys.get(variant.options.color)
        if (existing) assert.equal(existing, primaryKey)
        else colorKeys.set(variant.options.color, primaryKey)
      }
      assert.equal(new Set(colorKeys.values()).size, colorKeys.size)
    }
    assert.ok(mediaHashes.every(media => media.sourceHash === media.keyHash))
    assert.ok(mediaHashes.every(media => media.publishedHash === media.sourceHash))
  })
  record('the deployed benchmark snapshot is complete, bounded, and credential-free', () => {
    assert.equal(benchmark.schemaVersion, 1)
    assert.equal(benchmark.tools.lighthouse, '13.4.1')
    assert.match(benchmark.source.baselineCommit, /^8aad25d/)
    assert.equal(benchmark.source.frameworks.dund.solid, '2.0.0-beta.26')
    assert.equal(benchmark.source.frameworks.plugged.solid, '1.9.14')
    assert.equal(
      benchmark.targets.plugged.routes.product,
      'https://storekit.plugged.darjs.dev/products/truthear-keyx',
    )
    for (const target of ['dund', 'plugged']) {
      for (const route of ['home', 'catalog', 'product']) {
        assert.ok(benchmark.http[target][route].warm.sampleCount >= 25)
        assert.equal(benchmark.http[target][route].warm.validCount, 25)
        for (const formFactor of ['mobile', 'desktop']) {
          assert.equal(benchmark.lighthouse[target][route][formFactor].validRuns, 3)
        }
      }
      assert.equal(benchmark.navigation[target].homeCatalog.sampleCount, 9)
      assert.equal(benchmark.navigation[target].catalogProduct.sampleCount, 9)
      assert.equal(benchmark.navigation[target].warmupRunsExcluded, 1)
      assert.ok(benchmark.navigation[target].state.cartItemCountAfterFlows > 0)
    }
    assert.equal(benchmark.http.dund.home.cacheBusted, null)
    assert.ok(benchmark.http.plugged.home.cacheBusted.sampleCount >= 5)
    assert.equal(benchmark.http.plugged.home.cacheBusted.validCount, 5)
    assert.doesNotMatch(
      JSON.stringify(benchmark),
      /QPAY_PASSWORD|TELEGRAM_BOT_TOKEN|database_id|namespace_id/,
    )
  })
  record(
    'Wrangler names only isolated ДУНД data, cache, domain, and abuse-control resources',
    () => {
      assert.match(wranglerConfig, /"database_name": "dund-demo-solid-store-\d+-db"/)
      assert.match(wranglerConfig, /"kv_namespaces": \[\{ "binding": "CACHE", "id":/)
      assert.match(wranglerConfig, /"workers_dev": true/)
      assert.match(
        wranglerConfig,
        /"routes": \[\{ "pattern": "dund\.darjs\.dev", "custom_domain": true \}\]/,
      )
      assert.match(wranglerConfig, /"PUBLIC_APP_URL": "https:\/\/dund\.darjs\.dev"/)
      assert.match(wranglerConfig, /"PUBLIC_MEDIA_BASE_URL": "https:\/\/dund\.darjs\.dev\/media\/"/)
      for (const binding of [
        'CHECKOUT_RATE_LIMITER',
        'PRIVATE_STATUS_RATE_LIMITER',
        'BANK_CLAIM_RATE_LIMITER',
        'QPAY_REFRESH_RATE_LIMITER',
        'SEARCH_RATE_LIMITER',
        'CART_RATE_LIMITER',
      ]) {
        assert.match(wranglerConfig, new RegExp(`"name": "${binding}"`))
      }
      assert.doesNotMatch(wranglerConfig, /plugged/i)
    },
  )

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
      '--var',
      `PUBLIC_APP_URL:${origin}`,
      '--var',
      `PUBLIC_MEDIA_BASE_URL:${origin}/media/`,
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

  const home = await fetchHtml('/')
  record('turnkey SSR returns a complete home document through the Worker', () => {
    assert.equal(home.response.status, 200)
    assert.match(home.response.headers.get('content-type') ?? '', /text\/html/)
    assert.match(home.html, /^<!DOCTYPE html>/)
    assert.match(home.html, /Давхарга бүр ажиллана/)
    assert.match(home.html, /<dx-frame\b/)
    assert.match(home.html, /self\._\$SC=/)
  })
  record('frame-bearing documents cannot enter the shared CDN cache', () => {
    assert.equal(home.response.headers.get('cache-control'), 'public, max-age=0, must-revalidate')
    assert.equal(home.response.headers.get('cloudflare-cdn-cache-control'), 'no-store')
  })

  const review = await fetchHtml('/review/solid2')
  const missingReview = await fetchHtml('/review/solid2/not-found')
  record('the engineering review SSRs at its isolated route with no-store policy', () => {
    assert.equal(review.response.status, 200)
    assert.match(review.html, /Two storefronts\. Two ownership models\./)
    assert.match(review.html, /Why ProductPurchase sits outside the details frame/)
    assert.match(review.html, /Real timings, mixed results, no framework victory lap/)
    assert.match(review.html, /Lighthouse 13\.4\.1 lab/)
    assert.match(review.html, /storekit\.plugged\.darjs\.dev\/products\/truthear-keyx/)
    assert.match(review.html, /<dx-frame\b/)
    assert.equal(review.response.headers.get('cache-control'), 'no-store')
    assert.equal(review.response.headers.get('cloudflare-cdn-cache-control'), null)
  })
  record('paths below the review route keep the real DUND 404 interaction', () => {
    assert.equal(missingReview.response.status, 404)
    assert.equal(missingReview.response.headers.get('cache-control'), 'no-store')
    assert.match(missingReview.html, /Энд давхарга алга/)
  })

  const catalog = await fetchHtml('/products?useCase=cold-weather')
  const sortedCatalog = await fetchHtml('/products?sort=price-asc')
  const sanitizedCatalog = await fetchHtml('/products?useCase=first-iem&unknown=value')
  record('Router search filters and sorting render from D1 with no JavaScript requirement', () => {
    assert.equal(catalog.response.status, 200)
    assert.match(catalog.html, /Шилжилт хүрэм/)
    assert.doesNotMatch(catalog.html, /TRUTHEAR|IEM/)
    assert.match(catalog.html, /name="useCase" value="cold-weather"/)
    assert.match(catalog.html, /Төрөл, брэндээр шүүх/)
    assert.ok(
      sortedCatalog.html.indexOf('Суурь футболк') < sortedCatalog.html.indexOf('Шилжилт хүрэм'),
    )
    assert.equal(sanitizedCatalog.response.status, 200)
    assert.match(sanitizedCatalog.html, /Бүх давхарга/)
    assert.doesNotMatch(sanitizedCatalog.html, /first-iem|TRUTHEAR/)
  })

  const product = await fetchHtml('/products/shiljilt-bridge-coat')
  record('the product frame SSRs server content and complete client purchase controls', () => {
    assert.equal(product.response.status, 200)
    assert.match(product.html, /<dx-frame\b/)
    assert.doesNotMatch(product.html, /sc:slot:/)
    assert.match(product.html, /DND-COAT-M-ASPHALT/)
    assert.match(product.html, />Хэмжээ<\/legend>/)
    assert.match(product.html, />Өнгө<\/legend>/)
    assert.match(product.html, /4-р зураг:/)
    assert.match(product.html, /\/media\/products\/shiljilt-bridge-coat\//)
    assert.match(product.html, /aria-roledescription="carousel"/)
    assert.match(product.html, /Өмнөх зураг/)
    assert.match(product.html, /Дараах зураг/)
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
  const missingProduct = await fetchHtml('/products/does-not-exist')
  const missing = await fetchHtml('/not-a-route')
  record('direct checkout, private order shell, and not-found routes resolve', () => {
    assert.equal(checkout.response.status, 200)
    assert.equal(checkout.response.headers.get('cache-control'), 'private, no-store')
    assert.match(checkout.html, /JavaScript шаардлагатай/)
    assert.doesNotMatch(checkout.html, /name="customer\.name"|name="customer\.phone"/)
    assert.equal(order.response.status, 200)
    assert.equal(order.response.headers.get('cache-control'), 'private, no-store')
    assert.doesNotMatch(order.html, /9911\d{4}/)
    assert.equal(missingProduct.response.status, 404)
    assert.equal(missingProduct.response.headers.get('cache-control'), 'no-store')
    assert.match(missingProduct.html, /Бараа олдсонгүй/)
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
  record('server-only dependencies and binding names stay out of every client chunk', () => {
    assert.match(serverSource, /QPAY_PASSWORD/)
    assert.doesNotMatch(clientSources, /drizzle-orm\/d1/)
    assert.doesNotMatch(clientSources, /QPAY_PASSWORD/)
    assert.doesNotMatch(clientSources, /CHECKOUT_RATE_LIMITER|QPAY_REFRESH_RATE_LIMITER/)
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
  const searchUrl = `${origin}/_server?id=${encodeURIComponent(searchFunctionId)}&args=${encodeURIComponent('[{"query":"хүрэм"}]')}`
  const searchResponse = await fetch(searchUrl, { method: 'POST' })
  const searchBody = await searchResponse.text()
  const invalidSearchResponse = await fetch(
    `${origin}/_server?id=${encodeURIComponent(searchFunctionId)}&args=${encodeURIComponent('[{"query":"x"}]')}`,
    { method: 'POST' },
  )
  record('compact typeahead results come from the validated server function', () => {
    assert.equal(searchResponse.status, 200)
    assert.equal(searchResponse.headers.get('cache-control'), 'private, no-store')
    assert.equal(searchResponse.headers.get('x-dund-data-cache'), null)
    assert.match(searchBody, /Шилжилт хүрэм/)
    assert.doesNotMatch(searchBody, /stockQuantity|details|imageR2Key/)
    assert.equal(invalidSearchResponse.status, 400)
  })

  const exhaustSearchRateLimit = async (remaining, statuses = []) => {
    if (remaining === 0) return statuses
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.77' },
    })
    await response.arrayBuffer()
    return exhaustSearchRateLimit(remaining - 1, [...statuses, response.status])
  }
  const rateLimitedSearchStatuses = await exhaustSearchRateLimit(35)
  record('the real Worker enforces the isolated search rate-limit binding', () => {
    assert.equal(rateLimitedSearchStatuses[0], 200)
    assert.ok(rateLimitedSearchStatuses.includes(429))
    assert.ok(
      rateLimitedSearchStatuses
        .slice(rateLimitedSearchStatuses.indexOf(429))
        .every(status => status === 429),
    )
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
    idempotencyKey: 'checkout_123e4567-e89b-42d3-a456-426614174000',
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
  const checkoutActionUrl = `${origin}/_server?id=${encodeURIComponent(checkoutFunctionId)}`
  const checkoutResponse = await fetch(checkoutActionUrl, {
    method: 'POST',
    body: checkoutForm(checkoutInput),
  })
  const checkoutBody = await checkoutResponse.text()
  const retryCheckoutResponses = await Promise.all(
    Array.from({ length: 2 }, () =>
      fetch(checkoutActionUrl, { method: 'POST', body: checkoutForm(checkoutInput) }),
    ),
  )
  const retryCheckoutBodies = await Promise.all(
    retryCheckoutResponses.map(response => response.text()),
  )
  const invalidCheckoutResponse = await fetch(checkoutActionUrl, {
    method: 'POST',
    body: checkoutForm({ ...checkoutInput, customer: { name: '', phone: '55' } }),
  })
  const malformedCheckoutResponse = await fetch(
    `${checkoutActionUrl}&args=${encodeURIComponent('[{"customer":{"name":"attacker"}}]')}`,
    { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.91' } },
  )
  const checkoutGetResponse = await fetch(checkoutActionUrl)
  const invalidCheckoutBody = await invalidCheckoutResponse.text()
  const malformedCheckoutBody = await malformedCheckoutResponse.text()
  const createdOrderId = /ord_[0-7][0-9a-hjkmnp-tv-z]{25}/.exec(checkoutBody)?.[0]
  const createdStatusToken = /[0-9a-f]{64}/.exec(checkoutBody)?.[0]
  record('bank-transfer checkout validates fields and persists an authoritative D1 order', () => {
    assert.equal(checkoutResponse.status, 200)
    assert.match(checkoutBody, /DND-/)
    assert.match(checkoutBody, /bank_transfer/)
    assert.match(checkoutBody, /Хаан банк/)
    assert.ok(createdOrderId)
    assert.ok(createdStatusToken)
    assert.ok(retryCheckoutResponses.every(response => response.status === 200))
    assert.ok(retryCheckoutBodies.every(body => body === checkoutBody))
    assert.equal(invalidCheckoutResponse.status, 200)
    assert.match(invalidCheckoutBody, /field/)
    assert.match(invalidCheckoutBody, /customer\/name/)
    assert.equal(malformedCheckoutResponse.status, 200)
    assert.match(malformedCheckoutBody, /field/)
    assert.equal(checkoutGetResponse.status, 405)
    assert.doesNotMatch(checkoutResponse.url, /Тэмүүлэн|99112233|Энхтайвны/)
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
  const privatePaymentForm = statusToken => {
    const form = new FormData()
    form.set('orderId', createdOrderId)
    form.set('statusToken', statusToken)
    return form
  }
  const [claimResponse, qpayRefreshResponse] = await Promise.all([
    fetch(`${origin}/_server?id=${encodeURIComponent(claimFunctionId)}`, {
      method: 'POST',
      body: privatePaymentForm('x'.repeat(32)),
    }),
    fetch(`${origin}/_server?id=${encodeURIComponent(qpayRefreshFunctionId)}`, {
      method: 'POST',
      body: privatePaymentForm('x'.repeat(32)),
    }),
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
  const mediaResponse = await fetch(
    `${origin}/media/products/udur-overshirt/78f0cdd2886b7a9f8d27b40e52a0d2ce9973dc2ec25fccd1ec9cc352d7c4d0ba.webp`,
  )
  const broadApi = await fetch(`${origin}/api/system/status`, { headers: { accept: 'text/html' } })
  const webhookGet = await fetch(`${origin}/api/webhooks/qpay`)
  const qpayMissingQuery = await fetch(`${origin}/api/webhooks/qpay`, { method: 'POST' })
  const qpayUnknownPayment = await fetch(`${origin}/api/webhooks/qpay?payment_id=unknown-payment`, {
    method: 'POST',
  })
  const telegramUnauthorized = await fetch(`${origin}/api/webhooks/telegram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  const telegramAuthorized = await fetch(`${origin}/api/webhooks/telegram`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': 'test-only',
    },
    body: '{}',
  })
  record('assets are immutable and Elysia is limited to exact validated webhook paths', () => {
    assert.equal(assetResponse.status, 200)
    assert.equal(assetResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    assert.equal(mediaResponse.status, 200)
    assert.match(mediaResponse.headers.get('content-type') ?? '', /image\/webp/)
    assert.equal(mediaResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    assert.equal(broadApi.status, 404)
    assert.equal(webhookGet.status, 404)
    assert.equal(webhookGet.headers.get('cache-control'), 'no-store')
    assert.equal(qpayMissingQuery.status, 422)
    assert.equal(qpayUnknownPayment.status, 200)
    assert.equal(qpayUnknownPayment.headers.get('cache-control'), 'no-store')
    assert.equal(telegramUnauthorized.status, 401)
    assert.equal(telegramAuthorized.status, 200)
    assert.equal(telegramAuthorized.headers.get('cache-control'), 'no-store')
  })

  await runBrowserProof({ orderId: createdOrderId, statusToken: createdStatusToken })

  const workerExited = new Promise(resolve => worker.once('exit', resolve))
  process.kill(-worker.pid, 'SIGTERM')
  await workerExited
  worker = undefined
  const cacheKeys = JSON.parse(
    run('vp', [
      'exec',
      'wrangler',
      'kv',
      'key',
      'list',
      '--binding',
      'CACHE',
      '--local',
      '--persist-to',
      persistenceDirectory,
    ]),
  )
  record('document and arbitrary search inputs do not amplify the CACHE KV namespace', () => {
    assert.deepEqual(cacheKeys, [])
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
