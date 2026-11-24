// What changed in each release, in plain words for people who use the app (not developers). Pure: no React.
// Every chores/release-X.Y.Z PR adds its version at the top. Write it the way you'd tell a friend: what they can
// now do and where, no technical terms (no "sync", "cache", "database", "soft delete").
import { isNewer } from './version.ts'

export type ChangelogEntry = {
  version: string
  items: { title: string; text: string }[]
}

/** Newest first. */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.3',
    items: [
      {
        title: 'Add an amount with a keypad',
        text: 'When you add an expense on your phone, a number keypad sits right above Save, so the keyboard no longer pushes the page around.',
      },
      {
        title: 'New splits, one step at a time',
        text: 'Splitting a bill now goes Who, What, Review. Each step tells you what is still missing before you can move on.',
      },
      {
        title: 'See who still owes you',
        text: 'Your groups and splits now show what is still owed, or "Settled". On a split, tick "Paid" when someone pays you back.',
      },
      {
        title: 'Clearer foreign amounts',
        text: 'When you add an expense in another currency, the amount in RM now shows big under the amount you typed.',
      },
      {
        title: 'Smaller touches',
        text: 'Pick a category with one tap. Settings is sorted into sections. Save always says what is missing. The date is now a small "Today" chip, and recurring payments are simpler to edit.',
      },
    ],
  },
  {
    version: '0.1.2',
    items: [{ title: 'Small improvements', text: 'A few small fixes to make the app smoother to use.' }],
  },
  {
    version: '0.1.1',
    items: [
      {
        title: 'Undo a delete',
        text: 'Deleted something by mistake? Tap Undo on the message at the top of the screen, within a few seconds, and it comes back.',
      },
      {
        title: 'Swipe between pages',
        text: 'Slide your finger left or right to move to the next page. The page follows your finger, so you can peek and change your mind.',
      },
      {
        title: 'Clearer messages',
        text: 'When you copy a link or save a file, a short message at the top lets you know it worked.',
      },
      {
        title: "What's new",
        text: 'After each update, this page shows what changed. You can read it again any time in Settings.',
      },
    ],
  },
]

/** Entries up to the installed version (newer ones are written ahead of their release). */
export const releasedEntries = (current: string, entries = changelog) => entries.filter((e) => !isNewer(e.version, current))

/**
 * What to show after an update: the released entries newer than the version this device last saw.
 * Nothing on a fresh install (`lastSeen` null): there's nothing new to someone who just started.
 */
export const newEntries = (lastSeen: string | null, current: string, entries = changelog) =>
  lastSeen === null ? [] : releasedEntries(current, entries).filter((e) => isNewer(e.version, lastSeen))
