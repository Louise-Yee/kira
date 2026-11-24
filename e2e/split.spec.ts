import { expect, test } from './fixtures.ts'
import { acceptFriend, addFriend, section, sheet, tab, typeAmount } from './app.ts'

test('pick a friend on a split, and they stay picked when it is reopened', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await addFriend(alice, bob)
  await acceptFriend(bob, alice)
  await expect(section(alice, 'Friends')).toContainText('Bob')

  await tab(alice, 'Split')
  const add = alice.page.getByRole('button', { name: 'Add', exact: true })
  await expect(add).toHaveCount(1) // the page that slid out is gone
  await add.click()
  const s = sheet(alice, 'New split')
  await s.getByLabel('Title').fill('Dinner')
  // Friends are offered with their photo; picking one adds them like a typed name.
  await s.getByRole('button', { name: /\+ Bob$/ }).click()
  await expect(s.getByRole('button', { name: 'Remove Bob' })).toBeVisible()
  await expect(s.getByRole('button', { name: /\+ Bob$/ })).toBeHidden()
  await s.getByRole('button', { name: 'Next' }).click()
  await s.getByRole('button', { name: 'Even', exact: true }).click()
  await typeAmount(alice, '3000')
  await s.getByRole('button', { name: 'Next' }).click()
  await s.getByRole('button', { name: 'Save' }).click()
  await expect(s).toBeHidden()

  await alice.page.getByRole('button', { name: /^Dinner/ }).click()
  const edit = sheet(alice, 'Edit split')
  // Still linked to Bob the friend: his chip has his avatar (no photo here, so his initial) before the name.
  await expect(edit.getByRole('button', { name: 'Remove Bob' }).locator('..')).toHaveText('BBob')
  await expect(edit.getByRole('button', { name: /\+ Bob$/ })).toBeHidden()

  // Bob's half is still owed until he is ticked as paid back; then the row says Settled.
  await alice.page.keyboard.press('Escape')
  const row = alice.page.getByRole('button', { name: /^Dinner/ })
  await expect(row).toContainText('RM 15.90 owed') // half of 30.00 plus the default 6% tax
  await row.click()
  await edit.getByRole('button', { name: 'Bob paid' }).click()
  await alice.page.keyboard.press('Escape')
  await expect(row).toContainText('Settled')
})
