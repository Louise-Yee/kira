import { expect, test, type User } from './fixtures.ts'
import { acceptFriend, addFriend, addGroupExpense, closeSheet, copyInviteLink, createGroup, groupSettings, joinByLink, openGroup, openGroups, section, sheet, tab } from './app.ts'

/** Alice makes "Trip" and everyone else joins it by link. */
async function tripWith(alice: User, ...others: User[]) {
  await createGroup(alice, 'Trip')
  const link = await copyInviteLink(alice)
  for (const u of others) await joinByLink(u, link, 'Trip')
  await expect(alice.page.getByText(`${others.length + 1} members`)).toBeVisible()
}

test('join a group from an invite link opened while signed out', async ({ signIn }) => {
  const alice = await signIn('Alice')
  await createGroup(alice, 'Trip')
  const link = await copyInviteLink(alice)

  const bob = await signIn('Bob', { path: new URL(link).pathname, signedOutFirst: true })
  await bob.page.getByRole('dialog', { name: 'Join Trip?' }).getByRole('button', { name: 'Join' }).click()
  await expect(bob.page.getByRole('heading', { name: 'Trip', level: 1 })).toBeVisible()
  await expect(bob.page.getByText('2 members')).toBeVisible()
  await expect(alice.page.getByText('2 members')).toBeVisible()
})

test('an expense split three ways shows the same totals and balances to everyone', async ({ signIn }) => {
  const [alice, bob, carol] = [await signIn('Alice'), await signIn('Bob'), await signIn('Carol')]
  await tripWith(alice, bob, carol)

  await addGroupExpense(alice, 'Dinner', '3000')

  for (const u of [alice, bob, carol]) {
    await expect(section(u, 'Total spent')).toContainText('RM 30.00')
    await expect(section(u, 'Expenses')).toContainText(/Dinner.*paid by Alice.*RM 30\.00/)
    const balances = section(u, 'Balances')
    // A balance row reads "<name> <net>", then "Paid RM x" and "Share RM y".
    await expect(balances).toContainText(/Alice\s*\+RM 20\.00\s*Paid RM 30\.00\s*Share RM 10\.00/)
    await expect(balances).toContainText(/Bob\s*−RM 10\.00\s*Paid RM 0\.00\s*Share RM 10\.00/)
    await expect(balances).toContainText(/Carol\s*−RM 10\.00\s*Paid RM 0\.00\s*Share RM 10\.00/)
  }
})

test('settle up: Bob pays, Alice confirms from her inbox, everyone is square', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)
  await addGroupExpense(alice, 'Dinner', '3000')

  const settle = section(bob, 'Settle up')
  await expect(settle).toContainText(/You pay Alice\s*RM 15\.00/)
  await settle.getByRole('button', { name: 'I paid' }).click()
  await expect(section(bob, 'Waiting for confirmation')).toContainText(/You paid Alice\s*RM 15\.00/)

  // Alice confirms from the People tab's "To confirm" inbox.
  await alice.page.getByRole('button', { name: 'Back to people' }).click()
  const inbox = section(alice, 'To confirm')
  await expect(inbox).toContainText(/Bob says they paid you\s*RM 15\.00 · Trip/)
  await inbox.getByRole('button', { name: 'Got it' }).click()
  await expect(alice.page.getByRole('heading', { name: 'To confirm' })).toBeHidden()

  await expect(bob.page.getByRole('heading', { name: 'Waiting for confirmation' })).toBeHidden()
  await expect(section(bob, 'Settle up')).toContainText('Everyone is settled up.')
  await expect(section(bob, 'Expenses')).toContainText(/Bob paid Alice.*confirmed/)
})

test('#120 settle up does not say "settled up" while a payment waits for confirmation', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)
  await addGroupExpense(alice, 'Dinner', '3000')

  await section(bob, 'Settle up').getByRole('button', { name: 'I paid' }).click()
  await expect(section(bob, 'Waiting for confirmation')).toBeVisible()
  await expect(section(bob, 'Settle up')).toContainText('All paid, waiting for confirmation.')
  await expect(section(alice, 'Settle up')).toContainText('All paid, waiting for confirmation.')
})

test('#121 the payer is told when their payment is marked "Not received"', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)
  await addGroupExpense(alice, 'Dinner', '3000')

  await section(bob, 'Settle up').getByRole('button', { name: 'I paid' }).click()
  await section(alice, 'Waiting for confirmation').getByRole('button', { name: 'Not received' }).click()

  await expect(section(bob, 'Settle up')).toContainText(/You pay Alice\s*RM 15\.00/)
  const notice = section(bob, 'Not received')
  await expect(notice).toContainText(/Alice didn't get your payment\s*RM 15\.00/)
  await expect(section(bob, 'Expenses')).toContainText(/Bob paid Alice.*not received/)
  await notice.getByRole('button', { name: 'OK' }).click()
  await expect(notice).toBeHidden()
  await expect(section(alice, 'Balances')).toContainText(/Bob\s*−RM 15\.00/)
})

test('auto-log puts my share of a group expense in my own transactions', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)

  // On by default (#113) for everyone; Bob turns it off.
  await expect((await groupSettings(alice)).getByRole('switch', { name: 'Count my share in my spending' })).toHaveAttribute('aria-checked', 'true')
  await closeSheet(alice)
  const bobs = await groupSettings(bob)
  await bobs.getByRole('switch', { name: 'Count my share in my spending' }).click()
  await expect(bobs.getByRole('switch', { name: 'Count my share in my spending' })).toHaveAttribute('aria-checked', 'false')
  await closeSheet(bob)
  await addGroupExpense(bob, 'Groceries run', '4000')

  // The transaction row reads "<title> <category> <amount>" (the group's own expense row, on the People page still
  // sliding out, reads "<title> <date> · paid by …").
  const logged = (u: User) => u.page.getByRole('button', { name: /^Groceries run Other/ })
  await tab(alice, 'Home')
  await expect(logged(alice)).toContainText('−RM 20.00')
  // Bob turned it off, so his own transactions stay empty.
  await tab(bob, 'Home')
  await expect(bob.page.getByRole('heading', { name: 'Hi, Bob' })).toBeVisible()
  await expect(logged(bob)).toBeHidden()
})

const noGroups = 'Make a group for the people you hang out with'

async function leave(u: User) {
  await (await groupSettings(u)).getByRole('button', { name: 'Leave group' }).click()
  await u.page.getByRole('dialog', { name: 'Leave Trip?' }).getByRole('button', { name: 'Leave group' }).click()
}

test('a member leaves: everyone else sees them gone, and the group leaves their list', async ({ signIn }) => {
  const [alice, bob, carol] = [await signIn('Alice'), await signIn('Bob'), await signIn('Carol')]
  await tripWith(alice, bob, carol)
  // Bob opens the group from his list (leaving straight after joining by link is #125, the next test).
  await tab(bob, 'Home')
  await openGroup(bob, 'Trip')

  await leave(bob)
  await expect(bob.page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible()
  await expect(bob.page.getByText(noGroups)).toBeVisible()
  await expect(alice.page.getByText('2 members')).toBeVisible()
  await expect(carol.page.getByText('2 members')).toBeVisible()
  await expect(section(alice, 'Balances')).not.toContainText('Bob')
})

test('leaving a group right after joining it by link goes back to People', async ({ signIn }) => {
  // #125: the leaver used to be bounced back to the group they just left.
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)

  await leave(bob)
  // Short waits: this must fail on the assertion, not by running out the test's time.
  await expect(bob.page.getByRole('heading', { name: 'People', level: 1 })).toBeVisible({ timeout: 5000 })
  await expect(bob.page.getByText('Joining the group…')).toBeHidden({ timeout: 5000 })
  await expect(alice.page.getByText('1 member', { exact: true })).toBeVisible({ timeout: 5000 })
})

test('the owner deletes the group and it is gone for everyone', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)

  await (await groupSettings(alice)).getByRole('button', { name: 'Delete group' }).click()
  await alice.page.getByRole('dialog', { name: 'Delete Trip?' }).getByRole('button', { name: 'Delete group' }).click()
  await expect(alice.page.getByText(noGroups)).toBeVisible()

  await bob.page.goto('/people')
  await openGroups(bob)
  await expect(bob.page.getByText(noGroups)).toBeVisible()
})

test('a turned-off invite link says so instead of joining', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await createGroup(alice, 'Trip')
  const link = await copyInviteLink(alice)
  const settings = await groupSettings(alice)
  await settings.getByRole('button', { name: 'Turn off' }).click()
  await expect(settings.getByText('There is no working invite link.')).toBeVisible()

  // Alice's change is saved offline-first; Bob sees it once it has reached the server.
  await expect(async () => {
    await bob.page.goto(new URL(link).pathname)
    await expect(bob.page.getByRole('dialog')).toContainText('This invite link was turned off. Ask Alice for a new one.', { timeout: 2000 })
  }).toPass()
  await expect(bob.page.getByRole('dialog').getByRole('button', { name: 'Join' })).toBeHidden()
})

test('#116 a just-created group works without a reload (on a slow connection)', async ({ signIn }) => {
  const alice = await signIn('Alice')
  // The local emulator answers instantly, which hides #116. Hold writes back like a phone network does.
  await alice.page.route('**/google.firestore.v1.Firestore/Write/channel**', async (route) => {
    await new Promise((r) => setTimeout(r, 1500))
    await route.continue()
  })
  await createGroup(alice, 'Trip')
  await addGroupExpense(alice, 'Dinner', '3000')
  // The refused listeners also fail the test through the console check.
  await expect(section(alice, 'Expenses')).toContainText(/Dinner.*RM 30\.00/, { timeout: 5000 })
})

test('the owner renames the group from its settings and everyone sees the new name', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await tripWith(alice, bob)

  const settings = await groupSettings(alice)
  await settings.getByLabel('Group name').fill('Langkawi')
  await settings.getByRole('button', { name: 'Rename' }).click()
  await closeSheet(alice)
  await expect(alice.page.getByRole('heading', { name: 'Langkawi', level: 1 })).toBeVisible()
  await expect(bob.page.getByRole('heading', { name: 'Langkawi', level: 1 })).toBeVisible()

  // A member gets the same sheet without the owner's controls.
  const bobs = await groupSettings(bob)
  await expect(bobs.getByRole('button', { name: 'Share invite link' })).toBeVisible()
  await expect(bobs.getByLabel('Group name')).toBeHidden()
  await expect(bobs.getByRole('button', { name: 'Turn off' })).toBeHidden()
})

/** On the open group screen: invite a friend from the "Add friends" sheet. */
async function inviteFriend(u: User, friend: User) {
  await u.page.getByRole('button', { name: 'Add friends' }).click()
  const s = sheet(u, 'Add friends to Trip')
  await s.getByRole('button', { name: 'Invite', exact: true }).click()
  await expect(s.getByRole('button', { name: 'Invited' })).toBeDisabled()
  await closeSheet(u)
  await expect(section(u, '1 member')).toContainText(`${friend.name}Invited by you`)
}

test('invite a friend into a group; they join from their People tab', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await addFriend(alice, bob)
  await acceptFriend(bob, alice)
  await createGroup(alice, 'Trip')

  await inviteFriend(alice, bob)
  await tab(bob, 'People')
  const invites = section(bob, 'Group invites')
  await expect(invites).toContainText('Alice invited you to Trip')
  await invites.getByRole('button', { name: 'Join' }).click()
  await expect(bob.page.getByRole('heading', { name: 'Trip', level: 1 })).toBeVisible()
  await expect(section(bob, 'Balances')).toContainText('Alice')

  await expect(alice.page.getByText('2 members')).toBeVisible()
  await expect(alice.page.getByText('Invited by you')).toBeHidden()
})

test('an invite can be declined, or cancelled by whoever sent it', async ({ signIn }) => {
  const [alice, bob] = [await signIn('Alice'), await signIn('Bob')]
  await addFriend(alice, bob)
  await acceptFriend(bob, alice)
  await createGroup(alice, 'Trip')

  await inviteFriend(alice, bob)
  await tab(bob, 'People')
  await section(bob, 'Group invites').getByRole('button', { name: 'Decline' }).click()
  await expect(bob.page.getByRole('heading', { name: 'Group invites' })).toBeHidden()
  await expect(alice.page.getByText('Invited by you')).toBeHidden()

  await inviteFriend(alice, bob)
  await expect(section(bob, 'Group invites')).toContainText('Alice invited you to Trip')
  await section(alice, '1 member').getByRole('button', { name: 'Cancel' }).click()
  await expect(bob.page.getByRole('heading', { name: 'Group invites' })).toBeHidden()
  await expect(alice.page.getByText('1 member', { exact: true })).toBeVisible()
})

test('a group in another currency keeps its amounts in that currency', async ({ signIn }) => {
  const alice = await signIn('Alice')
  await createGroup(alice, 'Singapore trip', { search: 'singapore', code: 'SGD' })
  await addGroupExpense(alice, 'Chicken rice', '1250')
  await expect(section(alice, 'Total spent')).toContainText('S$12.50')
  await expect(section(alice, 'Expenses')).toContainText(/Chicken rice.*S\$12\.50/)
})
