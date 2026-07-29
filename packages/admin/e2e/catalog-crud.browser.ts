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
  await page.getByLabel('Name', { exact: true }).fill(productName)
  await page.getByLabel('SKU', { exact: true }).fill(`BROWSER-${suffix}`)
  await page.getByLabel('Price (MNT)', { exact: true }).fill('120000')
  await page.getByLabel('Stock quantity', { exact: true }).fill('5')
  await page.getByRole('button', { name: 'Add option' }).click()
  await page.getByRole('button', { name: 'Add option' }).click()
  const optionNames = page.getByLabel('Option name')
  await optionNames.nth(1).fill('Option')
  await optionNames.nth(1).press('Tab')
  await expect(page.getByText('Option names must be unique.')).toBeVisible()
  await expect(optionNames.nth(1)).toHaveValue('Option 2')
  await page.getByRole('button', { name: 'Remove Option option' }).click()
  await page.getByRole('button', { name: 'Remove Option 2 option' }).click()
  await page.getByLabel('Status').selectOption('active')
  await page.getByRole('button', { name: 'Create product' }).click()

  await expect(page).toHaveURL(/\/admin\/catalog\/prod_/u)
  await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible()
  const productId = new URL(page.url()).pathname.split('/').at(-1)!

  const fileInput = page.getByLabel('Image file')
  const uploadAlt = page.getByLabel('Alt text').first()
  await fileInput.setInputFiles(imagePath)
  await uploadAlt.fill('Browser front image')
  await page.getByRole('button', { name: 'Upload image' }).click()
  await expect(page.getByText('1 image', { exact: true })).toBeVisible()

  await fileInput.setInputFiles(imagePath)
  await uploadAlt.fill('Browser detail image')
  await page.getByRole('button', { name: 'Upload image' }).click()
  await expect(page.getByText('2 images', { exact: true })).toBeVisible()

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
  await imageEditors.first().getByLabel('Alt text').fill('Browser front image edited')
  await imageEditors.first().getByRole('button', { name: 'Save image' }).click()
  await expect(imageEditors.first().getByLabel('Alt text')).toHaveValue(
    'Browser front image edited',
  )

  await imageEditors.first().getByRole('button', { name: 'Move image next' }).click()
  await expect(imageEditors.first().getByLabel('Alt text')).toHaveValue('Browser detail image')

  await imageEditors.nth(1).getByRole('button', { name: 'Remove image' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove image' }).click()
  await expect(page.getByText('1 image', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Add variant' }).click()
  await page.getByLabel('SKU', { exact: true }).fill(`BROWSER-BLUE-${suffix}`)
  await page.getByLabel('Display name', { exact: true }).fill(secondVariantName)
  await page.getByLabel('Price (MNT)', { exact: true }).fill('150000')
  await page.getByLabel('Stock quantity', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Create variant' }).click()
  await expect(page.getByRole('button', { name: secondVariantName })).toBeVisible()

  const variantTable = page.getByRole('group', { name: /Product variants/u })
  await variantTable.focus()
  await variantTable.press('ArrowDown')
  await expect(variantTable).toHaveAttribute('aria-activedescendant', /product-variants-row-var_/u)
  await expect(variantTable.locator('tr[aria-selected="true"]')).toHaveCount(1)

  await page.getByRole('button', { name: secondVariantName }).click()
  await page.getByLabel('Display name', { exact: true }).fill(`${secondVariantName} edited`)
  await page.getByRole('button', { name: 'Save variant' }).click()
  await expect(page.getByRole('button', { name: `${secondVariantName} edited` })).toBeVisible()

  await page.getByRole('button', { name: `${secondVariantName} edited` }).click()
  await page.getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByRole('button', { name: 'Activate' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByRole('button', { name: `${secondVariantName} edited` })).toHaveCount(0)

  await page.getByRole('button', { name: 'Archive product' }).click()
  await expect(page.getByText('This record is read-only.')).toBeVisible()
  await page.getByRole('button', { name: 'Restore to draft' }).click()
  await expect(page.getByRole('button', { name: 'Archive product' })).toBeVisible()
  await page.getByRole('button', { name: 'Archive product' }).click()
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  await page.getByLabel('Enter the product ID to confirm').fill(productId)
  await page.getByRole('dialog').getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByRole('heading', { name: 'Product deleted' })).toBeVisible()

  await page.goto(`/admin/orders/${checkout.value.orderId}`)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  const cancellation = page.getByRole('dialog')
  await expect(cancellation.getByText('Cancel this order?')).toBeVisible()
  await cancellation.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
})

test('guards drafts and runs the displayed command shortcuts', async ({ page }) => {
  await page.goto('/admin/catalog')
  await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible()
  await expect(page.getByLabel('Search catalog')).toBeVisible()
  await page.keyboard.press('g')
  await page.keyboard.press('n')
  await expect(page).toHaveURL(/\/admin\/catalog\/new$/u)

  await page.getByLabel('Name', { exact: true }).fill('Unsaved browser draft')
  await page
    .getByRole('button', { name: 'Back to catalog' })
    .evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Discard unsaved changes?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page).toHaveURL(/\/admin\/catalog\/new$/u)

  await page
    .getByRole('button', { name: 'Back to catalog' })
    .evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.getByRole('dialog').getByRole('button', { name: 'Discard changes' }).click()
  await expect(page).toHaveURL(/\/admin\/catalog(?:\?.*)?$/u)
})
