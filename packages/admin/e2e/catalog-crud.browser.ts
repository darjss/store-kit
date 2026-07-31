import { expect, test } from '@playwright/test'
import type { BrowserContext, Locator, Page } from '@playwright/test'
import { makeSignature } from 'better-auth/crypto'

const appUrl = 'http://127.0.0.1:4321'
const authSecret = 'admin-browser-auth-secret-at-least-thirty-two-characters'
const authToken = 'admin-browser-session-token-for-real-better-auth'
const imagePath = 'packages/api/src/test/fixtures/catalog-upload.jpg'

const expectSwitchTarget = async (input: Locator) => {
  const size = await input.evaluate(element => {
    const target = element.closest<HTMLElement>('[data-slot="switch"]')
    if (!target) return undefined
    const bounds = target.getBoundingClientRect()
    return { height: bounds.height, width: bounds.width }
  })
  expect(size?.height).toBeGreaterThanOrEqual(44)
  expect(size?.width).toBeGreaterThanOrEqual(44)
}

const focusAppearance = (target: Locator) =>
  target.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    }
  })

const pressTabUntilFocused = async (page: Page, target: Locator, attemptsRemaining: number) => {
  if (attemptsRemaining === 0) throw new Error('The target was not reachable with the Tab key.')

  await page.keyboard.press('Tab')
  if (await target.evaluate(element => element === document.activeElement)) return
  await pressTabUntilFocused(page, target, attemptsRemaining - 1)
}

const focusWithKeyboard = async (page: Page, target: Locator) => {
  await target.scrollIntoViewIfNeeded()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await pressTabUntilFocused(page, target, 80)
}

const expectAdminFocusVisible = async (page: Page, target: Locator) => {
  const normalBorderColor = await target.evaluate(element => getComputedStyle(element).borderColor)
  await focusWithKeyboard(page, target)
  const appearance = await focusAppearance(target)

  expect(appearance.focusVisible).toBe(true)
  expect(appearance.outlineStyle).toBe('solid')
  expect(appearance.outlineWidth).toBeGreaterThanOrEqual(2)
  expect(appearance.boxShadow).not.toBe('none')
  expect(appearance.borderColor).not.toBe(normalBorderColor)
}

const authenticate = async (context: BrowserContext) => {
  const signature = await makeSignature(authToken, authSecret)
  await context.addCookies([
    {
      name: 'better-auth.session_token',
      value: `${authToken}.${signature}`,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
}

test.beforeEach(async ({ context, page }) => {
  await authenticate(context)
  const session = await page.request.get(`${appUrl}/api/admin/session`)
  expect(session.status()).toBe(200)
})

test.afterEach(async ({ page }) => {
  const response = await page.request.get(`${appUrl}/api/admin/settings/store`)
  if (response.status() !== 200) return
  const current = (await response.json()) as {
    status: 'ok' | 'error'
    value?: {
      bankName: string
      bankAccountName: string
      bankAccountNumber: string
      updatedAt: number
    }
  }
  if (current.status !== 'ok' || !current.value) return
  await page.request.put(`${appUrl}/api/admin/settings/store`, {
    data: {
      deliveryFeeMnt: 5000,
      bankName: current.value.bankName,
      bankAccountName: current.value.bankAccountName,
      bankAccountNumber: current.value.bankAccountNumber,
      expectedUpdatedAt: current.value.updatedAt,
    },
  })
})

test('keeps readiness after a real draft and uses the tablet catalog ledger', async ({ page }) => {
  const suffix = Date.now().toString(36)
  const productName = `Монгол ур хийцийн маш урт нэртэй өдөр тутмын арьсан цүнх ${suffix}`

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/admin/catalog/new')
  await expect(page.getByText('Файл сонгоогүй', { exact: true })).toBeVisible()
  const uploadControl = page.getByText('Зураг сонгох', { exact: true })
  expect((await uploadControl.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await page.getByLabel('Барааны зураг').setInputFiles(imagePath)
  await expect(page.getByText('catalog-upload.jpg', { exact: true })).toBeVisible()
  await expect(page.locator('[data-product-image-preview]')).toBeVisible()

  await page.getByLabel('Барааны нэр', { exact: true }).fill(productName)
  await page.getByLabel('Үнэ (₮)', { exact: true }).fill('12500')
  await page.getByLabel('Эхний үлдэгдэл', { exact: true }).fill('8')
  await page.locator('summary').filter({ hasText: 'Дэлгэрэнгүй мэдээлэл' }).click()
  await expectSwitchTarget(page.getByLabel('Онцлох бараа'))
  await page.locator('summary').filter({ hasText: 'Үнэ ба хувилбарын нэмэлт тохиргоо' }).click()
  await page
    .locator('summary')
    .filter({ hasText: 'Үнэ ба хувилбарын нэмэлт тохиргоо' })
    .scrollIntoViewIfNeeded()
  const mobileCreateAction = page.locator('[data-mobile-create-action]')
  await expect(mobileCreateAction.getByRole('button', { name: 'Бараа үүсгэх' })).toBeVisible()
  const actionBounds = await mobileCreateAction.boundingBox()
  expect(actionBounds?.y).toBeLessThan(800 - 60)
  await mobileCreateAction.getByRole('button', { name: 'Бараа үүсгэх' }).click()

  await expect(page).toHaveURL(/\/admin\/catalog\/prod_/u)
  const productId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.goto('/admin')
  const readinessLink = page.getByRole('link', { name: /Ноорог бараагаа дуусгах/u })
  await expect(readinessLink).toBeVisible()
  await expect(readinessLink).toHaveAttribute('href', `/admin/catalog/${productId}`)

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/admin/catalog')
  const tabletLedger = page.getByRole('list', { name: 'Барааны жагсаалт' })
  await expect(tabletLedger).toBeVisible()
  await expect(page.getByRole('table', { name: 'Барааны хүснэгт' })).not.toBeVisible()
  await expect(tabletLedger.getByText(productName, { exact: true })).toBeVisible()
  await expect(tabletLedger.getByText('12,500 ₮', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)

  await page.setViewportSize({ width: 1024, height: 800 })
  const catalogTable = page.getByRole('group', { name: /Барааны хүснэгт/u })
  await expect(catalogTable).toBeVisible()
  await expect(catalogTable.locator('tr[aria-selected="true"]')).toHaveCount(0)
})

test('runs catalog, image, variant, and lifecycle CRUD through the real admin Worker', async ({
  page,
}) => {
  const suffix = Date.now().toString(36)
  const productName = `Browser product ${suffix}`
  const secondVariantName = `Blue ${suffix}`

  await page.goto('/admin/catalog/new')
  await page.getByLabel('Барааны нэр', { exact: true }).fill(productName)
  await page.getByLabel('Барааны код', { exact: true }).fill(`BROWSER-${suffix}`)
  await page.getByLabel('Үнэ (₮)', { exact: true }).fill('120000')
  await page.getByLabel('Эхний үлдэгдэл', { exact: true }).fill('5')
  await page.getByLabel('Барааны зураг').setInputFiles(imagePath)
  await page.getByLabel('Зургийн тайлбар').fill('Browser front image')
  await page.locator('summary').filter({ hasText: 'Үнэ ба хувилбарын нэмэлт тохиргоо' }).click()
  await page.getByRole('button', { name: 'Сонголт нэмэх' }).click()
  await page.getByRole('button', { name: 'Сонголт нэмэх' }).click()
  const optionNames = page.getByLabel('Сонголтын нэр')
  await optionNames.nth(1).fill('Сонголт')
  await optionNames.nth(1).press('Tab')
  await expect(page.getByText('Сонголтын нэр давхардаж болохгүй.')).toBeVisible()
  await expect(optionNames.nth(1)).toHaveValue('Сонголт 2')
  await page.getByRole('button', { name: 'Сонголт сонголтыг хасах' }).click()
  await page.getByRole('button', { name: 'Сонголт 2 сонголтыг хасах' }).click()
  await page.locator('summary').filter({ hasText: 'Дэлгэрэнгүй мэдээлэл' }).click()
  await page.getByLabel('Нийтлэх төлөв').selectOption('active')
  await page.getByRole('button', { name: 'Бараа үүсгэх' }).click()

  await expect(page).toHaveURL(/\/admin\/catalog\/prod_/u)
  await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible()
  const productId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.locator('summary').filter({ hasText: 'Нэмэлт тохиргоо' }).first().click()
  await expectSwitchTarget(page.getByLabel('Онцлох бараа'))

  await expect(page.getByText('1 зураг', { exact: true })).toBeVisible()

  const fileInput = page.getByLabel('Зургийн файл')
  const uploadAlt = page.getByLabel('Зургийн тайлбар').first()
  await fileInput.setInputFiles(imagePath)
  await uploadAlt.fill('Browser detail image')
  await page.getByRole('button', { name: 'Зураг оруулах' }).click()
  await expect(page.getByText('2 зураг', { exact: true })).toBeVisible()

  const detailResponse = await page.request.get(`${appUrl}/api/admin/catalog/products/${productId}`)
  const detail = (await detailResponse.json()) as {
    status: 'ok'
    value: { variants: Array<{ id: string }> }
  }
  expect(detail.status).toBe('ok')
  const checkoutResponse = await page.request.post(`${appUrl}/api/checkout`, {
    data: {
      items: [{ variantId: detail.value.variants[0]!.id, quantity: 1 }],
      customer: { name: 'Browser customer', phone: '99112233' },
      delivery: {
        district: 'Сүхбаатар',
        khoroo: '1-р хороо',
        address: 'Browser integration address',
      },
      paymentMethod: 'bank_transfer',
    },
  })
  const checkout = (await checkoutResponse.json()) as {
    status: 'ok'
    value: { orderId: string }
  }
  expect(checkout.status).toBe('ok')

  const imageEditors = page.locator('article')
  await imageEditors.first().getByLabel('Зургийн тайлбар').fill('Browser front image edited')
  await imageEditors.first().getByRole('button', { name: 'Зураг хадгалах' }).click()
  await expect(imageEditors.first().getByLabel('Зургийн тайлбар')).toHaveValue(
    'Browser front image edited',
  )

  await imageEditors.first().getByRole('button', { name: 'Зургийг хойш зөөх' }).click()
  await expect(imageEditors.first().getByLabel('Зургийн тайлбар')).toHaveValue(
    'Browser detail image',
  )

  await imageEditors.nth(1).getByRole('button', { name: 'Зураг хасах' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Зураг хасах' }).click()
  await expect(page.getByText('1 зураг', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Хувилбар нэмэх' }).click()
  await expectSwitchTarget(page.getByLabel('Шууд борлуулах'))
  await page.getByLabel('Барааны код', { exact: true }).fill(`BROWSER-BLUE-${suffix}`)
  await page.getByLabel('Хувилбарын нэр', { exact: true }).fill(secondVariantName)
  await page.getByLabel('Үнэ (₮)', { exact: true }).fill('150000')
  await page.getByLabel('Үлдэгдэл', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Хувилбар нэмэх' }).click()
  await expect(page.getByRole('button', { name: secondVariantName })).toBeVisible()

  const variantTable = page.getByRole('group', { name: /Барааны хувилбарын хүснэгт/u })
  await expect(variantTable.locator('tr[aria-selected="true"]')).toHaveCount(0)
  await variantTable.focus()
  await variantTable.press('ArrowDown')
  await expect(variantTable).toHaveAttribute('aria-activedescendant', /product-variants-row-var_/u)
  await expect(variantTable.locator('tr[aria-selected="true"]')).toHaveCount(1)

  await page.getByRole('button', { name: secondVariantName }).click()
  await page.getByLabel('Хувилбарын нэр', { exact: true }).fill(`${secondVariantName} edited`)
  await page.getByRole('button', { name: 'Хувилбар хадгалах' }).click()
  await expect(page.getByRole('button', { name: `${secondVariantName} edited` })).toBeVisible()

  await page.getByRole('button', { name: `${secondVariantName} edited` }).click()
  await page.getByRole('button', { name: 'Идэвхгүй болгох' }).click()
  await expect(page.getByRole('button', { name: 'Идэвхжүүлэх' })).toBeVisible()
  await page.getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  await expect(page.getByRole('button', { name: `${secondVariantName} edited` })).toHaveCount(0)

  await page.goto(`/admin/orders/${checkout.value.orderId}`)
  await page.getByRole('button', { name: 'Захиалга цуцлах' }).click()
  const cancellation = page.getByRole('dialog')
  await expect(cancellation.getByText('Энэ захиалгыг цуцлах уу?')).toBeVisible()
  await cancellation.getByRole('button', { name: 'Захиалга цуцлах' }).click()
  await expect(page.getByText('Цуцалсан', { exact: true })).toBeVisible()
  await page.goto(`/admin/catalog/${productId}`)

  await page.getByRole('button', { name: 'Барааг архивлах' }).click()
  await expect(page.getByText('Энэ барааг одоогоор засах боломжгүй.')).toBeVisible()
  await page.getByRole('button', { name: 'Ноорог төлөвт сэргээх' }).click()
  await expect(page.getByRole('button', { name: 'Барааг архивлах' })).toBeVisible()
  await page.getByRole('button', { name: 'Барааг архивлах' }).click()
  await page.getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  const deleteDialog = page.getByRole('dialog')
  await expect(deleteDialog.getByText(productName, { exact: false })).toBeVisible()
  await expect(deleteDialog.getByText(productId, { exact: true })).toHaveCount(0)
  await page.getByLabel('Баталгаажуулахын тулд УСТГАХ гэж оруулна уу').fill('УСТГАХ')
  await page.getByRole('dialog').getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  await expect(page.getByRole('heading', { name: 'Бараа устлаа' })).toBeVisible()
})

test('uses the mobile dashboard, order summaries, and checkout settings against the real Worker', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })

  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Өнөөдрийн ажил' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ноорог бараагаа дуусгах/u })).toBeVisible()
  await expect(page.getByText('Яаралтай ажил алга')).toBeVisible()
  const recentOrder = page.getByRole('link', { name: /Browser customer/u })
  await expect(recentOrder).toBeVisible()
  expect((await recentOrder.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await page.goto('/admin/orders')
  await expect(page.getByRole('heading', { level: 1, name: 'Захиалга' })).toBeVisible()
  const search = page.getByLabel('Захиалга хайх')
  await expect(search).toBeVisible()
  expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expect(page.getByText('Шүүлтүүр', { exact: true })).toBeVisible()
  const orderTable = page.getByRole('table', { name: 'Дэлгүүрийн захиалгууд' })
  await expect(orderTable).not.toBeVisible()
  await expect(page.getByRole('link', { name: /Browser customer/u })).toBeVisible()
  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(orderTable).not.toBeVisible()
  await page.setViewportSize({ width: 1024, height: 800 })
  await expect(orderTable).toBeVisible()
  await expect(
    page.getByRole('group', { name: /Дэлгүүрийн захиалгууд/u }).locator('tr[aria-selected="true"]'),
  ).toHaveCount(0)
  await page.setViewportSize({ width: 360, height: 800 })

  await search.fill('not-a-real-order')
  await expect(page.getByRole('heading', { level: 2, name: 'Илэрц олдсонгүй' })).toBeVisible()
  await expect(page.getByText('Захиалга хараахан алга')).toHaveCount(0)
  await search.fill('')
  await expect(page.getByRole('link', { name: /Browser customer/u })).toBeVisible()

  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Дэлгүүрийн тохиргоо' })).toBeVisible()
  const deliveryFee = page.getByLabel('Хүргэлтийн үнэ')
  await expect(deliveryFee).toHaveValue('5000')
  expect((await deliveryFee.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await deliveryFee.fill('6500')
  await expect(page.getByText('Хадгалаагүй өөрчлөлт байна')).toBeVisible()
  await page.getByRole('button', { name: 'Тохиргоо хадгалах' }).click()
  await expect(page.getByText('Бүх өөрчлөлт хадгалагдсан')).toBeVisible()
  await expect(deliveryFee).toHaveValue('6500')

  const currentResponse = await page.request.get(`${appUrl}/api/admin/settings/store`)
  const current = (await currentResponse.json()) as {
    status: 'ok'
    value: {
      deliveryFeeMnt: number
      bankName: string
      bankAccountName: string
      bankAccountNumber: string
      updatedAt: number
    }
  }
  expect(current.status).toBe('ok')
  await page.request.put(`${appUrl}/api/admin/settings/store`, {
    data: {
      deliveryFeeMnt: 7000,
      bankName: current.value.bankName,
      bankAccountName: current.value.bankAccountName,
      bankAccountNumber: current.value.bankAccountNumber,
      expectedUpdatedAt: current.value.updatedAt,
    },
  })

  await deliveryFee.fill('6750')
  await page.getByRole('button', { name: 'Тохиргоо хадгалах' }).click()
  await expect(page.getByText('Тохиргоо өөрчлөгдсөн байна')).toBeVisible()
  await expect(deliveryFee).toHaveValue('6750')
  const settingsGuardPromise = page.waitForEvent('dialog')
  const navigation = page.getByRole('link', { name: 'Бараа', exact: true }).click()
  const settingsGuard = await settingsGuardPromise
  expect(settingsGuard.type()).toBe('beforeunload')
  await settingsGuard.dismiss()
  await navigation
  await expect(page).toHaveURL(/\/admin\/settings$/u)
  await expect(deliveryFee).toHaveValue('6750')
})

const expectFocusBehaviorAtViewport = async (page: Page, width: number, height: number) => {
  await page.setViewportSize({ width, height })
  await page.goto('/admin/catalog/new')

  const actionSearch = page.getByRole('button', { name: 'Үйлдэл хайх' })
  await actionSearch.click()
  await page.keyboard.press('Escape')
  const pointerAppearance = await focusAppearance(actionSearch)
  expect(pointerAppearance.focusVisible).toBe(false)
  expect(pointerAppearance.outlineStyle).toBe('none')
  expect(pointerAppearance.boxShadow).toBe('none')

  await expectAdminFocusVisible(page, actionSearch)
  await expectAdminFocusVisible(page, page.getByLabel('Барааны нэр', { exact: true }))
  await expectAdminFocusVisible(page, page.getByLabel('Ангилал', { exact: true }))

  await page.locator('summary').filter({ hasText: 'Дэлгэрэнгүй мэдээлэл' }).click()
  await expectAdminFocusVisible(page, page.getByLabel('Товч тайлбар', { exact: true }))

  if (width >= 1024) return

  const bottomNavigationLink = page.getByRole('link', { name: 'Бараа', exact: true })
  await focusWithKeyboard(page, bottomNavigationLink)
  const bottomNavigationFocus = await focusAppearance(bottomNavigationLink)
  expect(bottomNavigationFocus.focusVisible).toBe(true)
  expect(bottomNavigationFocus.boxShadow).not.toBe('none')
}

test('shows focus only for keyboard navigation on admin controls at mobile and desktop sizes', async ({
  page,
}) => {
  await expectFocusBehaviorAtViewport(page, 360, 800)
  await expectFocusBehaviorAtViewport(page, 1280, 800)
})

test('guards drafts and runs the displayed command shortcuts', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/admin/catalog')
  await expect(page.getByRole('heading', { level: 1, name: 'Бараа' })).toBeVisible()
  await expect(page.getByLabel('Бараа хайх')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Шүүлтүүр' })).toBeVisible()
  const newProductButton = page.getByRole('button', { name: 'Шинэ бараа' })
  await expect(newProductButton).toBeVisible()
  expect((await newProductButton.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('g')
  await page.keyboard.press('n')
  await expect(page).toHaveURL(/\/admin\/catalog\/new$/u)

  await page.getByLabel('Барааны нэр', { exact: true }).fill('Хадгалаагүй ноорог бараа')
  const backButton = page.getByRole('button', { name: 'Барааны жагсаалт руу буцах' })
  const stayDialogPromise = page.waitForEvent('dialog')
  const stayNavigation = backButton.click()
  const stayDialog = await stayDialogPromise
  expect(stayDialog.type()).toBe('beforeunload')
  await stayDialog.dismiss()
  await stayNavigation
  await expect(page).toHaveURL(/\/admin\/catalog\/new$/u)

  const leaveDialogPromise = page.waitForEvent('dialog')
  const leaveNavigation = backButton.click()
  const leaveDialog = await leaveDialogPromise
  await leaveDialog.accept()
  await leaveNavigation
  await expect(page).toHaveURL(/\/admin\/catalog(?:\?.*)?$/u)
})
