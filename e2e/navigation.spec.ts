import { expect, test } from './fixtures.ts'
import { flick, sheet } from './app.ts'

test('flick sideways to move between tabs', async ({ signIn }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'a touch gesture; the desktop has the sidebar')
  const alice = await signIn('Alice')
  const { page } = alice
  const heading = (name: string) => page.getByRole('heading', { name, level: 1 })
  await expect(heading('Hi, Alice')).toBeVisible()

  await flick(alice, 'left')
  await expect(heading('Recurring')).toBeVisible()
  await flick(alice, 'left')
  await expect(heading('Split')).toBeVisible()
  await flick(alice, 'right')
  await expect(heading('Recurring')).toBeVisible()
  await flick(alice, 'right')
  await expect(heading('Hi, Alice')).toBeVisible()
  // Home is the first tab: nothing further right.
  await flick(alice, 'right')
  await expect(heading('Hi, Alice')).toBeVisible()

  // Not while a sheet is open.
  const add = page.getByRole('button', { name: 'Add', exact: true })
  await expect(add).toHaveCount(1) // the pages that slid out are gone
  await add.click()
  await expect(sheet(alice, 'New transaction')).toBeVisible()
  await flick(alice, 'left')
  await expect(sheet(alice, 'New transaction')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Home', exact: true, includeHidden: true })).toHaveAttribute('aria-current', 'page')
})
