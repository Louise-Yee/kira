// Self-check for the changelog: node scripts/check-changelog.ts
import assert from 'node:assert/strict'
import { changelog, newEntries, releasedEntries, type ChangelogEntry } from '../src/lib/changelog.ts'
import { isNewer, parseVersion } from '../src/lib/version.ts'

// The real list: valid versions, newest first, no duplicates, nothing empty
for (const e of changelog) {
  assert.ok(parseVersion(e.version), e.version)
  assert.ok(e.items.length > 0, e.version)
  for (const i of e.items) assert.ok(i.title.trim() && i.text.trim(), e.version)
}
for (let i = 1; i < changelog.length; i++) assert.ok(isNewer(changelog[i - 1].version, changelog[i].version), 'newest first')

const e = (version: string): ChangelogEntry => ({ version, items: [{ title: version, text: version }] })
const list = [e('0.4.0'), e('0.3.0'), e('0.2.0')]
const versions = (l: ChangelogEntry[]) => l.map((x) => x.version)

// After updating from 0.2.0 to 0.3.0: only 0.3.0 (0.4.0 is written but not released yet)
assert.deepEqual(versions(newEntries('0.2.0', '0.3.0', list)), ['0.3.0'])
// Skipped a release: both
assert.deepEqual(versions(newEntries('0.1.0', '0.3.0', list)), ['0.3.0', '0.2.0'])
// Already seen, or a fresh install: nothing
assert.deepEqual(newEntries('0.3.0', '0.3.0', list), [])
assert.deepEqual(newEntries(null, '0.3.0', list), [])
// Settings shows everything released
assert.deepEqual(versions(releasedEntries('0.3.0', list)), ['0.3.0', '0.2.0'])

console.log('check-changelog: all good')
