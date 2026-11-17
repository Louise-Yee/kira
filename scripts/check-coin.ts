// Self-check for the coin math: node scripts/check-coin.ts
import assert from 'node:assert/strict'
import { coinSdf, identity, orthonormalize, rotateWorld, shadeCoin } from '../src/lib/coin3d.ts'

// 1. Thousands of incremental rotations stay a proper rotation (orthonormal, det = +1).
let m = identity()
for (let i = 0; i < 20000; i++) {
  m = rotateWorld(m, 0, 1, 0, 0.013)
  m = rotateWorld(m, 1, 0, 0, -0.007)
  if (i % 60 === 0) m = orthonormalize(m)
}
m = orthonormalize(m)
const row = (i: number) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]]
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
for (let i = 0; i < 3; i++) {
  assert.ok(Math.abs(dot(row(i), row(i)) - 1) < 1e-9, `row ${i} not unit`)
  for (let j = i + 1; j < 3; j++) assert.ok(Math.abs(dot(row(i), row(j))) < 1e-9, `rows ${i},${j} not orthogonal`)
}
const [a, b, c, d, e, f, g, h, k] = m
assert.ok(Math.abs(a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g) - 1) < 1e-9, 'det != 1')

// 2. SDF sanity: centre is inside, far away is outside, rim is proud of the face.
assert.ok(coinSdf(0, 0, 0) < 0)
assert.ok(coinSdf(2, 0, 0) > 0)
assert.ok(coinSdf(0.72, 0, -0.099) < 0, 'rim should be solid near the top')
assert.ok(coinSdf(0.3, 0, -0.099) > 0, 'face should be recessed below the rim')

// 3. Facing the camera: centre ray hits, corner ray misses; edge-on: a thin sliver still hits.
assert.ok(shadeCoin(identity(), 0, 0) > 0)
assert.equal(shadeCoin(identity(), 0.9, 0.9), -1)
const edgeOn = rotateWorld(identity(), 0, 1, 0, Math.PI / 2)
assert.ok(shadeCoin(edgeOn, 0, 0) > 0, 'edge-on centre should hit the coin edge')
assert.equal(shadeCoin(edgeOn, 0.3, 0), -1, 'edge-on coin is thin')

console.log('coin3d ok')
