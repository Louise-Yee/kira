// Plain .ts with no imports so scripts/make-icon.ts can reuse it under Node.
/** Brightness 0..1 at normalized coords (-1..1). t = seconds. */
export type Field = (nx: number, ny: number, t: number) => number

/** Engraved coin: lit sphere + bright rim + rotating rays. Shared by sign-in and icon script. */
export const coinField: Field = (nx, ny, t) => {
  const r = Math.hypot(nx, ny)
  const a = Math.atan2(ny, nx)
  let sphere = 0
  if (r < 0.58) {
    const z = Math.sqrt(1 - (r / 0.58) ** 2)
    sphere = Math.max(0, (-nx * 0.5 - ny * 0.6 + z * 0.8) / 1.2) * 0.9 + 0.08
  }
  const rim = Math.exp(-((r - 0.6) ** 2) / 0.0015) * 0.9
  const rays = r > 0.6 ? Math.max(0, Math.cos(a * 36 + t * 0.35)) ** 10 * Math.max(0, 1 - (r - 0.6) / 0.45) * 0.85 : 0
  const haze = (0.1 + 0.06 * Math.sin(nx * 9 + ny * 7 + t * 0.6)) * Math.max(0, 1 - Math.max(0, r - 0.7) / 0.3)
  return Math.max(sphere, rim, rays, haze)
}
