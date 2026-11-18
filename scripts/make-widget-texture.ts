// Regenerate the widget's hero texture: node scripts/make-widget-texture.ts
// Same field, glyph ramp and palette as Home's hero card, baked to a transparent PNG (glyphs only).
// Home draws them at 50% with a screen blend over cobalt, so that blend is computed here per glyph.
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { RAMP, hash, rgb } from '../src/lib/ascii-draw.ts'
import { coinField } from '../src/lib/coin.ts'

const W = 450 // ~4x2 hero tile at 3x density
const H = 330
const CELL = 21
const FLOOR = 0.2
const COBALT = [53, 99, 255]
const screen = (a: number, b: number) => 255 - ((255 - a) * (255 - b)) / 255

const glyphs: string[] = []
for (let y = CELL / 2; y < H; y += CELL)
  for (let x = CELL * 0.3; x < W; x += CELL * 0.6) {
    const nx = (x / W) * 2 - 1
    const ny = (y / H) * 2 - 1
    const v = coinField((nx - 0.8) * 1.5, ny * 0.6, 0) + (hash(x, y) - 0.5) * 0.25
    if (v < FLOOR) continue
    const [r, g, b] = rgb(v).map((c, k) => Math.round(COBALT[k] + (screen(c, COBALT[k]) - COBALT[k]) * 0.5))
    const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))].replace('&', '&amp;').replace('<', '&lt;')
    glyphs.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="rgb(${r},${g},${b})">${ch}</text>`)
  }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="${CELL}" font-weight="500" text-anchor="middle" dominant-baseline="central" xml:space="preserve">${glyphs.join('')}</g></svg>`
writeFileSync('android/app/src/main/res/drawable-nodpi/widget_hero_texture.png', await sharp(Buffer.from(svg)).png().toBuffer())
