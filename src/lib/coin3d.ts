// 3D coin, ray-marched per ASCII cell. Plain .ts with no imports (Node-runnable for the self-check).
// World axes: x right, y down, z into the screen; camera is orthographic, looking along +z.

/** 3x3 rotation, row-major. Maps object space → world space. */
export type Mat = [number, number, number, number, number, number, number, number, number]

export const identity = (): Mat => [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** Rotate m about a unit world axis: returns A·m (Rodrigues). */
export function rotateWorld(m: Mat, ax: number, ay: number, az: number, angle: number): Mat {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const k = 1 - c
  const a = [
    c + ax * ax * k, ax * ay * k - az * s, ax * az * k + ay * s,
    ay * ax * k + az * s, c + ay * ay * k, ay * az * k - ax * s,
    az * ax * k - ay * s, az * ay * k + ax * s, c + az * az * k,
  ]
  const r = new Array<number>(9)
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * m[j] + a[i * 3 + 1] * m[3 + j] + a[i * 3 + 2] * m[6 + j]
  return r as Mat
}

/** Gram-Schmidt on rows; stops float drift from thousands of incremental rotations. */
export function orthonormalize(m: Mat): Mat {
  let [a, b, c, d, e, f] = m
  let n = Math.hypot(a, b, c)
  a /= n; b /= n; c /= n
  const dot = a * d + b * e + c * f
  d -= dot * a; e -= dot * b; f -= dot * c
  n = Math.hypot(d, e, f)
  d /= n; e /= n; f /= n
  return [a, b, c, d, e, f, b * f - c * e, c * d - a * f, a * e - b * d]
}

const R = 0.8 // radius
const H = 0.1 // half thickness
const RIM = 0.64 // inner edge of the raised rim
const DEPTH = 0.025 // how far the face sits below the rim

/** Signed distance to the coin (face normal = object z). */
export function coinSdf(x: number, y: number, z: number) {
  const q = Math.hypot(x, y)
  const az = Math.abs(z)
  // milled edge: shallow grooves around the rim
  const rr = R - 0.012 * (0.5 + 0.5 * Math.cos(64 * Math.atan2(y, x)))
  const dx = q - rr + 0.02
  const dz = az - H + 0.02
  const body = Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) - 0.02
  const recess = Math.max(q - RIM, H - DEPTH - az) // carve the face down inside the rim
  const ring = Math.hypot(q - 0.42, az - (H - DEPTH)) - 0.022 // embossed inner ring
  return Math.min(Math.max(body, -recess), ring)
}

const L = (() => {
  const n = Math.hypot(-0.5, -0.65, -0.6)
  return [-0.5 / n, -0.65 / n, -0.6 / n] // toward the light: top-left, in front
})()

/** Brightness 0..1 of the coin at world (sx, sy), or -1 on a miss. */
export function shadeCoin(m: Mat, sx: number, sy: number): number {
  if (sx * sx + sy * sy > 0.83 * 0.83) return -1 // bounding sphere
  // ray in object space: origin Mᵀ(sx, sy, -1.5), direction Mᵀ(0, 0, 1)
  const ox = m[0] * sx + m[3] * sy - m[6] * 1.5
  const oy = m[1] * sx + m[4] * sy - m[7] * 1.5
  const oz = m[2] * sx + m[5] * sy - m[8] * 1.5
  const [dx, dy, dz] = [m[6], m[7], m[8]]
  let t = 0.65
  let px = 0, py = 0, pz = 0
  let hit = false
  for (let i = 0; i < 48 && t < 2.35; i++) {
    px = ox + dx * t; py = oy + dy * t; pz = oz + dz * t
    const d = coinSdf(px, py, pz)
    if (d < 0.002) { hit = true; break }
    t += d * 0.9
  }
  if (!hit) return -1
  // tetrahedral normal (object space) → world
  const e = 0.003
  const a = coinSdf(px + e, py - e, pz - e)
  const b = coinSdf(px - e, py - e, pz + e)
  const c = coinSdf(px - e, py + e, pz - e)
  const f = coinSdf(px + e, py + e, pz + e)
  let nx = a - b - c + f, ny = -a - b + c + f, nz = -a + b - c + f
  const nn = Math.hypot(nx, ny, nz)
  nx /= nn; ny /= nn; nz /= nn
  const wx = m[0] * nx + m[1] * ny + m[2] * nz
  const wy = m[3] * nx + m[4] * ny + m[5] * nz
  const wz = m[6] * nx + m[7] * ny + m[8] * nz
  const diff = Math.max(0, wx * L[0] + wy * L[1] + wz * L[2])
  // Blinn half-vector between light and camera (0, 0, -1)
  const hx = L[0], hy = L[1], hz = L[2] - 1
  const hn = Math.hypot(hx, hy, hz)
  const spec = Math.max(0, (wx * hx + wy * hy + wz * hz) / hn) ** 40
  const fresnel = (1 - Math.abs(wz)) ** 3
  // engraved concentric lines on the flat face
  const lines = Math.abs(nz) > 0.9 ? 0.1 * Math.sin(Math.hypot(px, py) * 70) : 0
  return 0.08 + 0.5 * diff + 0.55 * spec + 0.2 * fresnel + lines
}

/** Background behind the coin: slowly turning rays + faint haze, fading at the edges. */
export function haloField(sx: number, sy: number, t: number) {
  const r = Math.hypot(sx, sy)
  const a = Math.atan2(sy, sx)
  const rays = r > 0.84 ? Math.max(0, Math.cos(a * 36 + t * 0.35)) ** 10 * Math.max(0, 1 - (r - 0.84) / 0.5) * 0.7 : 0
  const haze = (0.1 + 0.05 * Math.sin(sx * 9 + sy * 7 + t * 0.6)) * Math.max(0, 1 - Math.max(0, r - 0.9) / 0.35)
  return Math.max(rays, haze)
}
