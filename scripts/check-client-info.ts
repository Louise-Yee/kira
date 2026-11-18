// Self-check for client info parsing: node scripts/check-client-info.ts
import assert from 'node:assert/strict'
import { needsWrite, parseUserAgent, REFRESH_MS, type ClientInfo } from '../src/lib/client-info.ts'

// User agents
const ua = {
  webview:
    'Mozilla/5.0 (Linux; Android 17; sdk_gphone64_x86_64 Build/CE2A.260420.051.A2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/145.0.7632.218 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36',
  chromeReduced: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
  noModel: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
}
assert.deepEqual(parseUserAgent(ua.webview), { os: 'Android 17', model: 'sdk_gphone64_x86_64' })
assert.deepEqual(parseUserAgent(ua.samsung), { os: 'Android 14', model: 'SM-S918B' })
assert.deepEqual(parseUserAgent(ua.chromeReduced), { os: 'Android 10', model: null })
assert.deepEqual(parseUserAgent(ua.noModel), { os: 'Android 13', model: null })
assert.deepEqual(parseUserAgent(ua.iphone), { os: 'iOS 18.1', model: null })
assert.deepEqual(parseUserAgent(ua.windows), { os: 'Windows', model: null })
assert.deepEqual(parseUserAgent(ua.mac), { os: 'macOS', model: null })
assert.deepEqual(parseUserAgent(ua.linux), { os: 'Linux', model: null })
assert.deepEqual(parseUserAgent(''), { os: null, model: null })

// When to write
const info: ClientInfo = {
  appVersion: '1.1.0',
  platform: 'android',
  os: 'Android 17',
  model: 'SM-S918B',
  locale: 'en-MY',
  timeZone: 'Asia/Kuala_Lumpur',
}
const t = 1_800_000_000_000
assert.ok(needsWrite(null, info, t), 'first launch')
assert.ok(!needsWrite({ info, at: t }, info, t + 1000), 'nothing changed')
assert.ok(!needsWrite({ info, at: t }, { ...info }, t + REFRESH_MS - 1), 'same values, new object, within a week')
assert.ok(needsWrite({ info, at: t }, info, t + REFRESH_MS), 'a week later')
assert.ok(needsWrite({ info, at: t }, { ...info, appVersion: '1.2.0' }, t + 1), 'updated app')
assert.ok(needsWrite({ info, at: t }, { ...info, timeZone: 'Asia/Singapore' }, t + 1), 'travelled')
assert.ok(needsWrite({ info, at: t }, { ...info, model: null }, t + 1), 'model changed')

console.log('check-client-info: ok')
