import { expect, test } from './fixtures.ts'
import { acceptFriend, addFriend, section } from './app.ts'

test('send a friend request by email, the other person accepts', async ({ signIn }) => {
  const alice = await signIn('Alice')
  const bob = await signIn('Bob')

  await addFriend(alice, bob)
  await expect(section(alice, 'Waiting for a reply')).toContainText('Bob')

  await acceptFriend(bob, alice)
  await expect(section(bob, 'Friends')).toContainText('Alice')
  // Alice's list moves on by itself, without a reload.
  await expect(section(alice, 'Friends')).toContainText('Bob')
  await expect(alice.page.getByText('Waiting for a reply')).toBeHidden()
})
