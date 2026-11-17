// Self-check for image-size maths: node scripts/check-image-size.ts
import assert from 'node:assert/strict'
import { dataUrlBytes, fitWithin } from '../src/lib/image-size.ts'

// fitWithin: long side capped, aspect kept, never upscaled
assert.deepEqual(fitWithin(1200, 600, 600), { width: 600, height: 300 })
assert.deepEqual(fitWithin(600, 1200, 600), { width: 300, height: 600 })
assert.deepEqual(fitWithin(4000, 3000, 600), { width: 600, height: 450 })
assert.deepEqual(fitWithin(300, 200, 600), { width: 300, height: 200 }) // already small
assert.deepEqual(fitWithin(600, 600, 600), { width: 600, height: 600 })
assert.deepEqual(fitWithin(10000, 1, 600), { width: 600, height: 1 }) // never rounds to 0

// dataUrlBytes: base64 length minus padding
assert.equal(dataUrlBytes('data:image/webp;base64,'), 0)
assert.equal(dataUrlBytes('data:image/png;base64,QUJD'), 3) // "ABC"
assert.equal(dataUrlBytes('data:image/png;base64,QUI='), 2) // "AB"
assert.equal(dataUrlBytes('data:image/png;base64,QQ=='), 1) // "A"
assert.equal(dataUrlBytes(`data:image/png;base64,${'A'.repeat(4000)}`), 3000)

console.log('check-image-size: ok')
