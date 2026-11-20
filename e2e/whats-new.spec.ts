import { expect, test } from './fixtures.ts'
import { sheet, tab } from './app.ts'

test("What's new shows once after an update, and again from Settings", async ({ signIn }) => {
  const alice = await signIn('Alice')
  const { page } = alice
  // A fresh install shows nothing.
  await expect(page.getByRole('heading', { name: 'Hi, Alice' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // As if this device last ran 0.1.0.
  await page.evaluate(() => localStorage.setItem('kira.lastSeenVersion', '0.1.0'))
  await page.reload()
  const news = sheet(alice, "What's new")
  await expect(news).toContainText('Undo a delete')
  await news.getByRole('button', { name: 'Got it' }).click()
  await expect(news).toBeHidden()

  // Only once.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hi, Alice' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await tab(alice, 'Settings')
  await page.getByRole('button', { name: /What's new/ }).click()
  await expect(sheet(alice, "What's new")).toContainText('Swipe between pages')
})
