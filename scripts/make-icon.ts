// Regenerate icons: node scripts/make-icon.ts && npx @vite-pwa/assets-generator --preset minimal-2023 public/icon.svg
// Bayer-dithered coin (same field as the sign-in screen) as crisp SVG pixels.
import { writeFileSync } from 'node:fs'
import { coinField } from '../src/lib/coin.ts'

const N = 64 // pixel grid
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const rects: string[] = []
for (let y = 0; y < N; y++)
  for (let x = 0; x < N; x++) {
    const v = coinField(((x + 0.5) / N) * 2.6 - 1.3, ((y + 0.5) / N) * 2.6 - 1.3, 0)
    if (v * 16 <= BAYER[y % 4][x % 4] + 1) continue
    rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${v > 0.7 ? '#fff' : '#9db2ff'}"/>`)
  }
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#3563ff"/>${rects.join('')}</svg>\n`,
)
