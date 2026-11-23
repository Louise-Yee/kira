import { expect, type User } from './fixtures.ts'

/** Steps a person takes in the app, in the words a person would use. */

export async function tab(u: User, name: 'Home' | 'Recurring' | 'Split' | 'People' | 'Settings') {
  await u.page.getByRole('button', { name, exact: true }).click()
  // The page being left stays (inert) for its exit animation; role queries still see it, so wait until it's gone.
  await expect(u.page.locator('main [inert]')).toHaveCount(0)
}

/** The open sheet (dialog) with this title. */
export const sheet = (u: User, title: string | RegExp) => u.page.getByRole('dialog', { name: title })

/** Types an amount the way a person does on the TNG-style pad: "3000" is RM 30.00. */
export const typeAmount = async (u: User, digits: string, nth = 0) => {
  await u.page.getByLabel('Amount').nth(nth).fill(digits)
}

/** Taps the category's chip in the open form (expense ones come first, so "Other" is the expense one). */
export async function pickCategory(u: User, name: string) {
  await u.page.getByRole('dialog').getByRole('group', { name: 'Category' }).getByRole('button', { name, exact: true }).first().click()
}

/** People opens on Groups; friends and friend requests are under Friends. */
export async function openFriends(u: User) {
  await tab(u, 'People')
  await u.page.getByRole('button', { name: 'Friends', exact: true }).click()
}

export async function addFriend(u: User, friend: User) {
  await openFriends(u)
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
  await openFriends(u)
  await u.page.getByRole('button', { name: `Accept ${friend.name}` }).click()
}

export async function openGroups(u: User) {
  await tab(u, 'People')
  await u.page.getByRole('button', { name: 'Groups', exact: true }).click()
}

/** Creates a group and leaves its screen open. */
/** `currency` (searched by name, then picked by code) when the group shouldn't be in RM. */
export async function createGroup(u: User, name: string, currency?: { search: string; code: string }) {
  await openGroups(u)
  await u.page.getByRole('button', { name: 'New group' }).first().click()
  const s = sheet(u, 'New group')
  await s.getByLabel('Group name').fill(name)
  if (currency) {
    await s.getByRole('button', { name: /^Currency:/ }).click()
    const picker = sheet(u, 'Currency')
    await picker.getByLabel('Search currencies').fill(currency.search)
    await picker.getByRole('button', { name: new RegExp(`^${currency.code} `) }).click()
    await expect(picker).toBeHidden()
  }
  await s.getByRole('button', { name: 'Create' }).click()
  await expect(u.page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

export async function openGroup(u: User, name: string) {
  await openGroups(u)
  // A group row reads "<initial> <name> <n> members".
  await u.page.getByRole('button', { name: new RegExp(` ${name} \\d+ members?$`) }).click()
  await expect(u.page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

/** Opens the open group's settings sheet (name, invite link, auto-log, leave or delete). */
export async function groupSettings(u: User) {
  await u.page.getByRole('button', { name: 'Group settings' }).click()
  const s = sheet(u, 'Group settings')
  await expect(s).toBeVisible()
  return s
}

/** Closes the open sheet the way a person dismisses it (Escape, or the back gesture). */
export async function closeSheet(u: User) {
  await u.page.keyboard.press('Escape')
  await expect(u.page.getByRole('dialog')).toBeHidden()
}

/** Taps "Share invite link" in the open group's settings and returns the copied link. */
export async function copyInviteLink(u: User): Promise<string> {
  const s = await groupSettings(u)
  await s.getByRole('button', { name: 'Share invite link' }).click()
  // The toast lives outside the sheet, in a polite live region.
  await expect(u.page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible()
  const link = await u.page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/\/join\/[A-Za-z0-9]+$/)
  await closeSheet(u)
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

/** A quick sideways flick across the middle of the screen, as a finger does (touch events, phone only). */
export async function flick(u: User, direction: 'left' | 'right') {
  const cdp = await u.page.context().newCDPSession(u.page)
  const { width, height } = u.page.viewportSize() ?? { width: 412, height: 839 }
  const [from, to] = direction === 'left' ? [0.8, 0.2] : [0.2, 0.8]
  const y = height / 2
  const at = (f: number) => [{ x: width * f, y }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from) })
  for (const f of [0.75, 0.5, 0.25]) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(from + (to - from) * f) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

/**
 * A slow sideways drag from `from` to `to` (shares of the screen width). `whileHeld` runs before letting go, to check
 * what shows mid-swipe.
 */
export async function drag(u: User, from: number, to: number, whileHeld?: () => Promise<void>) {
  const cdp = await u.page.context().newCDPSession(u.page)
  const { width, height } = u.page.viewportSize() ?? { width: 412, height: 839 }
  const at = (f: number) => [{ x: width * f, y: height / 2 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from) })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(from + ((to - from) * i) / 10) })
    await u.page.waitForTimeout(80) // slower than a flick: only the distance can make it switch
  }
  await whileHeld?.()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
