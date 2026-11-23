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
