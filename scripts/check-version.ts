// Self-check for the update-check logic: node scripts/check-version.ts
import assert from 'node:assert/strict'
import { isNewer, minVersionFrom, parseRelease, parseVersion, updateKind } from '../src/lib/version.ts'

// Parsing
assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3])
assert.deepEqual(parseVersion('v10.0.20'), [10, 0, 20])
for (const bad of ['1.2', '1.2.3.4', 'v1.2.x', '', '1.2.3-beta', 'vv1.2.3']) assert.equal(parseVersion(bad), null, bad)

// Comparison is numeric per part, not string order
assert.ok(isNewer('1.10.0', '1.9.0'))
assert.ok(isNewer('2.0.0', '1.99.99'))
assert.ok(isNewer('1.0.1', '1.0.0'))
assert.ok(!isNewer('1.0.0', '1.0.0'))
assert.ok(!isNewer('1.0.0', '1.0.1'))
assert.ok(!isNewer('garbage', '1.0.0'))
assert.ok(!isNewer('1.0.0', 'garbage'))

// Min-version marker
assert.equal(minVersionFrom('## What\'s Changed\n<!-- min-version: 1.4.0 -->\n* stuff'), '1.4.0')
assert.equal(minVersionFrom('<!--min-version:2.0.1-->'), '2.0.1')
assert.equal(minVersionFrom('<!-- min-version: nope -->'), null)
assert.equal(minVersionFrom('no marker'), null)
assert.equal(minVersionFrom(null), null)

// Release parsing
const gh = (tag: string, body: string | null, assets = [{ name: `kira-${tag}.apk`, browser_download_url: `https://x/${tag}.apk` }]) => ({
  tag_name: tag,
  body,
  assets,
})
assert.deepEqual(parseRelease(gh('v1.2.0', '<!-- min-version: 1.0.0 -->')), {
  version: '1.2.0',
  apkUrl: 'https://x/v1.2.0.apk',
  minVersion: '1.0.0',
})
assert.equal(parseRelease(gh('v1.2.0', null, [])), null, 'no apk asset')
assert.equal(parseRelease(gh('nightly', null)), null, 'bad tag')
assert.equal(parseRelease({}), null, 'empty response')

// Update kind
const rel = (version: string, minVersion: string | null) => ({ version, apkUrl: 'u', minVersion })
assert.equal(updateKind('1.2.0', rel('1.2.0', null)), 'none', 'same version')
assert.equal(updateKind('1.3.0', rel('1.2.0', '1.2.0')), 'none', 'installed is ahead (dev build)')
assert.equal(updateKind('1.1.0', rel('1.2.0', null)), 'optional')
assert.equal(updateKind('1.1.0', rel('1.2.0', '1.0.0')), 'optional', 'min below installed')
assert.equal(updateKind('1.1.0', rel('1.2.0', '1.1.0')), 'optional', 'min equal to installed')
assert.equal(updateKind('1.1.0', rel('1.2.0', '1.2.0')), 'forced')
// The point of a minimum: a routine release after an urgent one still forces old installs.
assert.equal(updateKind('1.2.0', rel('1.3.1', '1.3.0')), 'forced')

console.log('check-version: ok')
