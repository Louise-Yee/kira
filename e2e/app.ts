import { expect, knownFirestoreErrors, type User } from './fixtures.ts'

/** Steps a person takes in the app, in the words a person would use. */

export const tab = (u: User, name: 'Home' | 'Recurring' | 'Split' | 'People' | 'Settings') =>
  u.page.getByRole('button', { name, exact: true }).click()

/** The open sheet (dialog) with this title. */
export const sheet = (u: User, title: string | RegExp) => u.page.getByRole('dialog', { name: title })

/** Types an amount the way a person does on the TNG-style pad: "3000" is RM 30.00. */
export const typeAmount = async (u: User, digits: string, nth = 0) => {
  await u.page.getByLabel('Amount').nth(nth).fill(digits)
}

export async function pickCategory(u: User, name: string) {
  await u.page.getByRole('button', { name: 'Category' }).click()
  await u.page.getByRole('button', { name, exact: true }).click()
}

export async function addFriend(u: User, friend: User) {
  await tab(u, 'People')
  await u.page.getByRole('button', { name: /^Add friends?$/ }).first().click()
  const s = sheet(u, 'Add friends')
  await s.getByLabel("Friend's email").fill(friend.email)
  // The friend's directory entry is written just after they sign in, so search again until it is there.
  await expect(async () => {
    await s.getByRole('button', { name: 'Find' }).click()
    await expect(s.getByRole('button', { name: 'Add', exact: true })).toBeVisible({ timeout: 1000 })
  }).toPass()
  await s.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(s.getByText('Requested')).toBeVisible()
  await s.getByRole('button', { name: 'Done' }).click()
}

export async function acceptFriend(u: User, friend: User) {
  await tab(u, 'People')
  await u.page.getByRole('button', { name: `Accept ${friend.name}` }).click()
}

export async function openGroups(u: User) {
  await tab(u, 'People')
  await u.page.getByRole('button', { name: 'Groups', exact: true }).click()
}

/** Creates a group and leaves its screen open. */
export async function createGroup(u: User, name: string, { workaround116 = true } = {}) {
  await openGroups(u)
  await u.page.getByRole('button', { name: 'New group' }).first().click()
  const s = sheet(u, 'New group')
  await s.getByLabel('Group name').fill(name)
  await s.getByRole('button', { name: 'Create' }).click()
  await expect(u.page.getByRole('heading', { name, level: 1 })).toBeVisible()
  if (workaround116) {
    // #116: a just-created group's expense and payment listeners are refused and never retried.
    // Reloading is what a person does today. Drop this once #116 is fixed.
    knownFirestoreErrors('#116')
    await expect(u.page.getByText('Share invite link')).toBeVisible()
    await u.page.reload()
    await openGroup(u, name)
  }
}

export async function openGroup(u: User, name: string) {
  await openGroups(u)
  // A group row reads "<initial> <name> <n> members".
  await u.page.getByRole('button', { name: new RegExp(` ${name} \\d+ members?$`) }).click()
  await expect(u.page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

/** Taps "Share invite link" on the open group screen and returns the copied link. */
export async function copyInviteLink(u: User): Promise<string> {
  await u.page.getByRole('button', { name: 'Share invite link' }).click()
  await expect(u.page.getByText('Link copied')).toBeVisible()
  const link = await u.page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/\/join\/[A-Za-z0-9]+$/)
  return link
}

/** Opens an invite link as an already signed-in person and joins. */
export async function joinByLink(u: User, link: string, group: string) {
  await u.page.goto(new URL(link).pathname)
  const s = sheet(u, `Join ${group}?`)
  await s.getByRole('button', { name: 'Join' }).click()
  await expect(u.page.getByRole('heading', { name: group, level: 1 })).toBeVisible()
}

/** Adds an expense on the open group screen, split equally between everyone ticked (all members by default). */
export async function addGroupExpense(u: User, title: string, digits: string) {
  await u.page.getByRole('button', { name: 'Add expense' }).click()
  const s = sheet(u, 'Add expense')
  await s.getByLabel('Title').fill(title)
  await typeAmount(u, digits)
  await s.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(s).toBeHidden()
}

/** A section of the screen by its heading, e.g. section(u, 'Balances'). */
export const section = (u: User, heading: string) =>
  u.page.locator('section').filter({ has: u.page.getByRole('heading', { name: heading, exact: true }) })
