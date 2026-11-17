const RAMP = ' .:-=+*%#$@'
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// Dark → cobalt → white, matching the A1 palette.
const STOPS = [[18, 18, 18], [26, 42, 122], [53, 99, 255], [157, 178, 255], [255, 255, 255]]
const color = (v: number) => {
  const x = Math.min(0.999, Math.max(0, v)) * (STOPS.length - 1)
  const i = Math.floor(x)
  const t = x - i
  return `rgb(${STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * t)).join()})`
}

/**
 * Draw one ASCII frame into a w x h area (CSS pixels) of any 2D context: sample(nx, ny) in -1..1 gives a
 * brightness, which picks a glyph and a colour. Shared by the on-screen canvases and the receipt image.
 */
export function drawAscii(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  cell: number,
  floor: number,
  sample: (nx: number, ny: number) => number,
) {
  g.font = `500 ${cell}px ui-monospace, Menlo, Consolas, monospace`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let y = cell / 2; y < h; y += cell)
    for (let x = cell * 0.3; x < w; x += cell * 0.6) {
      const v = sample((x / w) * 2 - 1, (y / h) * 2 - 1) + (hash(x, y) - 0.5) * 0.25
      if (v < floor) continue
      g.fillStyle = color(v)
      g.fillText(RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))], x, y)
    }
}
