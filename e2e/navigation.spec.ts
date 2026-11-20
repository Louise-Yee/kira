import { expect, test } from './fixtures.ts'
import { drag, flick, sheet } from './app.ts'

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

test('#135 a slow drag follows the finger: past 30% it switches, short of it it springs back', async ({ signIn }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'a touch gesture; the desktop has the sidebar')
  const alice = await signIn('Alice')
  const { page } = alice
  // The suite runs with reduced motion, where the page doesn't follow the finger. Motion reads the setting once, so reload.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.reload()
  const heading = (name: string) => page.getByRole('heading', { name, level: 1 })
  await expect(heading('Hi, Alice')).toBeVisible()

  // Short of the line: the next tab peeks in while held, then it goes back to Home.
  await drag(alice, 0.7, 0.55, async () => {
    await expect(page.getByText('Recurring', { exact: true }).locator('xpath=ancestor::*[@inert]')).toHaveCount(1)
  })
  await expect(heading('Hi, Alice')).toBeVisible()
  await expect(page.locator('[inert]')).toHaveCount(0)

  // Past it, slowly: switches.
  await drag(alice, 0.8, 0.3)
  await expect(heading('Recurring')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(1)
})
