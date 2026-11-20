import { expect, test } from './fixtures.ts'
import { pickCategory, sheet, tab, typeAmount } from './app.ts'

test('sign in, sign out', async ({ signIn }) => {
  const alice = await signIn('Alice')
  await expect(alice.page.getByRole('heading', { name: 'Hi, Alice' })).toBeVisible()
  await tab(alice, 'Settings')
  await alice.page.getByRole('button', { name: 'Sign out' }).click()
  await expect(alice.page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})

test('add, edit and delete a transaction', async ({ signIn }) => {
  const alice = await signIn('Alice')
  const { page } = alice
  // The month's "Out" card (the trend chart further down has its own "Out" legend).
  const out = page.getByText('Out', { exact: true }).first().locator('..')

  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const add = sheet(alice, 'New transaction')
  await typeAmount(alice, '1250')
  await expect(page.getByLabel('Amount')).toHaveValue('12.50')
  await pickCategory(alice, 'Food')
  await add.getByLabel('Note').fill('Nasi lemak')
  await add.getByRole('button', { name: 'Save' }).click()
  await expect(add).toBeHidden()

  const row = page.getByRole('button', { name: /Nasi lemak/ })
  await expect(row).toContainText('−RM 12.50')
  await expect(out).toContainText('RM 12.50')

  await row.click()
  const edit = sheet(alice, 'Edit transaction')
  await typeAmount(alice, '2000')
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(row).toContainText('−RM 20.00')
  await expect(out).toContainText('RM 20.00')

  // Delete has no "are you sure": the toast offers Undo instead.
  await row.click()
  await edit.getByRole('button', { name: 'Delete transaction' }).click()
  await expect(row).toBeHidden()
  await expect(out).toContainText('RM 0.00')
  const toast = page.getByRole('status').filter({ hasText: 'Transaction deleted' })
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(row).toContainText('−RM 20.00')
  await expect(out).toContainText('RM 20.00')

  // Left alone, it stays deleted once the toast is gone.
  await row.click()
  await edit.getByRole('button', { name: 'Delete transaction' }).click()
  await expect(toast).toBeHidden({ timeout: 6000 })
  await expect(row).toBeHidden()
})
