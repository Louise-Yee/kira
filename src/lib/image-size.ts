// Pure image-size maths (no DOM) so scripts/check-image-size.ts can run it under plain node.

/** Scale (width, height) down to fit `max` on the long side. Never scales up. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Decoded size in bytes of a base64 data URL. */
export function dataUrlBytes(url: string): number {
  const b64 = url.slice(url.indexOf(',') + 1)
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return (b64.length / 4) * 3 - padding
}
