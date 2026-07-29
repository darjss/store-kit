import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

const appUrl = 'http://127.0.0.1:4321'
const authSecret = 'admin-browser-auth-secret-at-least-thirty-two-characters'
const authToken = 'admin-browser-session-token-for-real-better-auth'
const imagePath = 'packages/api/src/test/fixtures/catalog-upload.jpg'

const authenticate = async (context: BrowserContext) => {
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(authSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    ),
    new TextEncoder().encode(authToken),
  )
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
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
  await page.getByLabel('Барааны код', { exact: true }).fill(`BROWSER-BLUE-${suffix}`)
  await page.getByLabel('Хувилбарын нэр', { exact: true }).fill(secondVariantName)
  await page.getByLabel('Үнэ (₮)', { exact: true }).fill('150000')
  await page.getByLabel('Үлдэгдэл', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Хувилбар нэмэх' }).click()
  await expect(page.getByRole('button', { name: secondVariantName })).toBeVisible()

  const variantTable = page.getByRole('group', { name: /Барааны хувилбарын хүснэгт/u })
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

  await page.getByRole('button', { name: 'Барааг архивлах' }).click()
  await expect(page.getByText('Энэ барааг одоогоор засах боломжгүй.')).toBeVisible()
  await page.getByRole('button', { name: 'Ноорог төлөвт сэргээх' }).click()
  await expect(page.getByRole('button', { name: 'Барааг архивлах' })).toBeVisible()
  await page.getByRole('button', { name: 'Барааг архивлах' }).click()
  await page.getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  await page.getByLabel('Баталгаажуулахын тулд барааны ID-г оруулна уу').fill(productId)
  await page.getByRole('dialog').getByRole('button', { name: 'Бүрмөсөн устгах' }).click()
  await expect(page.getByRole('heading', { name: 'Бараа устлаа' })).toBeVisible()

  await page.goto(`/admin/orders/${checkout.value.orderId}`)
  await page.getByRole('button', { name: 'Захиалга цуцлах' }).click()
  const cancellation = page.getByRole('dialog')
  await expect(cancellation.getByText('Энэ захиалгыг цуцлах уу?')).toBeVisible()
  await cancellation.getByRole('button', { name: 'Захиалга цуцлах' }).click()
  await expect(page.getByText('Цуцалсан', { exact: true })).toBeVisible()
})

test('uses the mobile dashboard, order summaries, and checkout settings against the real Worker', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })

  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'Өнөөдрийн ажил' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Анхны бараагаа нэмэх/u })).toBeVisible()
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

  await page.getByLabel('Барааны нэр', { exact: true }).fill('Unsaved browser draft')
  await page
    .getByRole('button', { name: 'Барааны жагсаалт руу буцах' })
    .evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Discard unsaved changes?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page).toHaveURL(/\/admin\/catalog\/new$/u)

  await page
    .getByRole('button', { name: 'Барааны жагсаалт руу буцах' })
    .evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.getByRole('dialog').getByRole('button', { name: 'Discard changes' }).click()
  await expect(page).toHaveURL(/\/admin\/catalog(?:\?.*)?$/u)
})
