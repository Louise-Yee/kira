import { drawAscii } from '@/lib/ascii-draw'
import { coinField } from '@/lib/coin'
import { longDate } from '@/lib/date'
import { formatRM } from '@/lib/money'
import type { Receipt, ReceiptPerson } from '@/lib/receipt-data'

export const RECEIPT_WIDTH = 1080

const PAD = 64
const CARD_PAD = 40
const HEADER = 320
const ROW = 52
const SANS = '"Inter Variable", system-ui, sans-serif'
const HEAD = '"Bricolage Grotesque Variable", "Inter Variable", system-ui, sans-serif'

type Palette = { background: string; foreground: string; card: string; muted: string; border: string; hero: string; heroText: string; primary: string }

/** The receipt is always dark, whatever the app theme: read the colours from a hidden `.dark` element. */
function readPalette(): Palette {
  const probe = document.createElement('div')
  probe.className = 'dark'
  probe.hidden = true
  document.body.append(probe)
  const css = getComputedStyle(probe)
  const get = (name: string) => css.getPropertyValue(name).trim()
  const palette = {
    background: get('--background'),
    foreground: get('--foreground'),
    card: get('--card'),
    muted: get('--muted-foreground'),
    border: get('--border'),
    hero: get('--hero'),
    heroText: get('--hero-foreground'),
    primary: get('--primary'),
  }
  probe.remove()
  return palette
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  g.font = font
  g.fillStyle = color
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillText(s, x, y)
}

/** Break `s` into at most `maxLines` lines that fit `maxWidth`; the last line gets an ellipsis if cut. */
function wrap(g: CanvasRenderingContext2D, s: string, maxWidth: number, font: string, maxLines: number): string[] {
  g.font = font
  const lines: string[] = []
  let line = ''
  const words = s.split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]
    if (g.measureText(next).width <= maxWidth || !line) {
      line = next
    } else {
      lines.push(line)
      line = words[i]
    }
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line)
  const cut = lines.length === maxLines && lines.join(' ').length < words.join(' ').length
  if (cut) {
    let last = lines[maxLines - 1]
    while (last.length > 1 && g.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[maxLines - 1] = `${last}…`
  }
  return lines
}

const money = (sen: number) => formatRM(sen, { sign: sen < 0 })

function personHeight(p: ReceiptPerson, r: Receipt): number {
  const charge = r.chargeLabel && p.charge !== 0 ? ROW : 0
  const divider = p.rows.length || charge ? 28 : 0
  return CARD_PAD + 56 + 8 + p.rows.length * ROW + charge + divider + 84 + CARD_PAD
}

/**
 * Draw the receipt into `g` (1080 wide) and return its height. `t` is the time in seconds for the ASCII
 * texture: 0 gives the still image, and an animation can call this once per frame.
 * Call it once to measure on any canvas, then again on a canvas of that height.
 */
function drawReceipt(g: CanvasRenderingContext2D, r: Receipt, qr: ImageBitmap | null, pal: Palette, t: number): number {
  const W = RECEIPT_WIDTH
  g.fillStyle = pal.background
  g.fillRect(0, 0, W, g.canvas.height)

  // Header: the cobalt band with the coin texture peeking in from the right, like the Home card.
  g.fillStyle = pal.hero
  g.fillRect(0, 0, W, HEADER)
  g.save()
  g.beginPath()
  g.rect(0, 0, W, HEADER)
  g.clip()
  g.globalAlpha = 0.85
  g.globalCompositeOperation = 'screen'
  // A coin about as tall as the band, centred near the right edge: x scale 1.7 and y scale 0.5 make it round on a 1080x320 band.
  drawAscii(g, W, HEADER, 13, 0.12, (nx, ny) => coinField((nx - 0.72) * 1.7, ny * 0.5, t))
  g.restore()
  const titleFont = `800 76px ${HEAD}`
  // The title stays left of the coin.
  const lines = wrap(g, r.title, 680, titleFont, 2)
  lines.forEach((l, i) => text(g, l, PAD, 96 + i * 88, titleFont, pal.heroText))
  const sub = r.everyone ? `${longDate(r.date)} · ${r.people.length} people` : `${longDate(r.date)} · ${r.people[0].name}`
  text(g, sub, PAD, 96 + lines.length * 88 + 14, `500 34px ${SANS}`, pal.heroText)

  let y = HEADER + 48
  const left = PAD + CARD_PAD
  const right = W - PAD - CARD_PAD
  for (const p of r.people) {
    const h = personHeight(p, r)
    roundRect(g, PAD, y, W - PAD * 2, h, 36)
    g.fillStyle = pal.card
    g.fill()
    let cy = y + CARD_PAD + 28
    text(g, p.name, left, cy, `800 48px ${HEAD}`, pal.foreground)
    cy += 28 + 8 + ROW / 2
    for (const row of p.rows) {
      text(g, row.label, left, cy, `500 30px ${SANS}`, pal.muted)
      text(g, money(row.amount), right, cy, `600 30px ${SANS}`, pal.foreground, 'right')
      cy += ROW
    }
    if (r.chargeLabel && p.charge !== 0) {
      text(g, r.chargeLabel, left, cy, `500 30px ${SANS}`, pal.muted)
      text(g, money(p.charge), right, cy, `600 30px ${SANS}`, pal.foreground, 'right')
      cy += ROW
    }
    if (p.rows.length || (r.chargeLabel && p.charge !== 0)) {
      cy += 4
      g.fillStyle = pal.border
      g.fillRect(left, cy, right - left, 2)
      cy += 24
    }
    cy += 28
    text(g, 'Total', left, cy, `700 34px ${SANS}`, pal.foreground)
    text(g, money(p.total), right, cy, `800 60px ${HEAD}`, pal.primary, 'right')
    y += h + 24
  }

  if (r.everyone && r.people.length > 1) {
    y += 16
    text(g, 'Bill total', PAD + CARD_PAD, y + 32, `700 34px ${SANS}`, pal.muted)
    text(g, money(r.total), W - PAD - CARD_PAD, y + 32, `800 60px ${HEAD}`, pal.foreground, 'right')
    y += 64 + 24
  }

  if (qr) {
    y += 32
    const box = 480
    const x = (W - box) / 2
    roundRect(g, x, y, box, box, 36)
    g.fillStyle = '#fff' // the QR image has its own white backdrop: keep it scannable
    g.fill()
    const fit = Math.min(420 / qr.width, 420 / qr.height)
    const w = qr.width * fit
    const h = qr.height * fit
    g.drawImage(qr, x + (box - w) / 2, y + (box - h) / 2, w, h)
    text(g, 'Scan to pay (TNG)', W / 2, y + box + 52, `700 38px ${SANS}`, pal.foreground, 'center')
    text(g, 'Type in your total from above', W / 2, y + box + 100, `500 28px ${SANS}`, pal.muted, 'center')
    y += box + 100 + 24
  }

  text(g, 'Split with kira', W / 2, y + 56, `500 26px ${SANS}`, pal.muted, 'center')
  return y + 56 + 56
}

const FONTS = [`800 76px "Bricolage Grotesque Variable"`, `500 30px "Inter Variable"`, `600 30px "Inter Variable"`, `700 34px "Inter Variable"`]

/** Render the receipt as a PNG. Waits for the fonts first, or the canvas would silently use a fallback. */
export async function renderReceipt(receipt: Receipt, qrDataUrl: string | undefined, t = 0): Promise<Blob> {
  await Promise.all(FONTS.map((f) => document.fonts.load(f, 'RM 0123456789÷+−&%.,')))
  const qr = qrDataUrl ? await createImageBitmap(await (await fetch(qrDataUrl)).blob()) : null
  const pal = readPalette()

  const probe = document.createElement('canvas')
  probe.width = RECEIPT_WIDTH
  probe.height = 10
  const height = drawReceipt(probe.getContext('2d')!, receipt, qr, pal, t)

  const canvas = document.createElement('canvas')
  canvas.width = RECEIPT_WIDTH
  canvas.height = height
  drawReceipt(canvas.getContext('2d')!, receipt, qr, pal, t)
  qr?.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image."))), 'image/png'))
}
