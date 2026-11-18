import { drawAscii } from '@/lib/ascii-draw'
import { haloField, identity, rotateWorld, shadeCoin } from '@/lib/coin3d'
import { longDate } from '@/lib/date'
import { formatRM } from '@/lib/money'
import type { Receipt } from '@/lib/receipt-data'

export const RECEIPT_WIDTH = 1080

const MARGIN = 48 // grey page around the paper
const PAD = 64 // paper edge to text
const ROW = 52
const COIN = 280
const SANS = '"Inter Variable", system-ui, sans-serif'
const HEAD = '"Bricolage Grotesque Variable", "Inter Variable", system-ui, sans-serif'

type Palette = { background: string; foreground: string; card: string; muted: string; border: string; primary: string }

/** The receipt is always light paper, whatever the app theme: read the colours from a hidden `.light` element. */
function readPalette(): Palette {
  const probe = document.createElement('div')
  probe.className = 'light'
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

const COIN_TILT = rotateWorld(identity(), 1, 0, 0, -0.35)

/** A dashed rule across the paper's text area at `y`. */
function dashed(g: CanvasRenderingContext2D, y: number, color: string) {
  g.save()
  g.strokeStyle = color
  g.globalAlpha = 0.5
  g.lineWidth = 2
  g.setLineDash([12, 10])
  g.beginPath()
  g.moveTo(MARGIN + PAD, y)
  g.lineTo(RECEIPT_WIDTH - MARGIN - PAD, y)
  g.stroke()
  g.restore()
}

/**
 * Draw the receipt into `g` (1080 wide) and return its height. `t` is the time in seconds for the ASCII
 * texture: 0 gives the still image, and an animation can call this once per frame.
 * Call it once to measure on any canvas, then again on a canvas of that height.
 */
function drawReceipt(g: CanvasRenderingContext2D, r: Receipt, qr: ImageBitmap | null, pal: Palette, t: number): number {
  const W = RECEIPT_WIDTH
  const H = g.canvas.height
  g.fillStyle = pal.background
  g.fillRect(0, 0, W, H)
  // The paper: a white card the full height of the canvas, less the margin.
  roundRect(g, MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 40)
  g.fillStyle = pal.card
  g.fill()
  g.strokeStyle = pal.border
  g.lineWidth = 2
  g.stroke()

  const left = MARGIN + PAD
  const right = W - MARGIN - PAD
  let y = MARGIN + 56

  // The blue coin, centred like a shop logo.
  g.save()
  g.translate((W - COIN) / 2, y)
  g.beginPath()
  g.rect(0, 0, COIN, COIN)
  g.clip()
  drawAscii(
    g,
    COIN,
    COIN,
    7,
    0.16,
    (nx, ny) => {
      const sx = nx * 1.05
      const sy = ny * 1.05
      const v = shadeCoin(COIN_TILT, sx, sy)
      return v >= 0 ? v : haloField(sx, sy, t)
    },
    pal.primary,
  )
  g.restore()
  y += COIN + 40

  const titleFont = `800 64px ${HEAD}`
  const lines = wrap(g, r.title, right - left, titleFont, 2)
  lines.forEach((l, i) => text(g, l, W / 2, y + i * 76, titleFont, pal.foreground, 'center'))
  y += (lines.length - 1) * 76 + 64
  const sub = r.everyone ? `${longDate(r.date)} · ${r.people.length} people` : `${longDate(r.date)} · ${r.people[0].name}`
  text(g, sub, W / 2, y, `500 32px ${SANS}`, pal.muted, 'center')
  y += 52

  for (const p of r.people) {
    dashed(g, y, pal.muted)
    y += 40
    text(g, p.name, left, y + 24, `800 46px ${HEAD}`, pal.foreground)
    y += 24 + 28 + ROW / 2
    for (const row of p.rows) {
      text(g, row.label, left, y, `500 30px ${SANS}`, pal.muted)
      text(g, money(row.amount), right, y, `600 30px ${SANS}`, pal.foreground, 'right')
      y += ROW
    }
    if (r.chargeLabel && p.charge !== 0) {
      text(g, r.chargeLabel, left, y, `500 30px ${SANS}`, pal.muted)
      text(g, money(p.charge), right, y, `600 30px ${SANS}`, pal.foreground, 'right')
      y += ROW
    }
    y += 8
    text(g, 'Total', left, y + 24, `700 34px ${SANS}`, pal.foreground)
    text(g, money(p.total), right, y + 24, `800 60px ${HEAD}`, pal.primary, 'right')
    y += 48 + 24
  }

  if (r.everyone && r.people.length > 1) {
    dashed(g, y, pal.muted)
    y += 52
    text(g, 'Bill total', left, y, `700 34px ${SANS}`, pal.muted)
    text(g, money(r.total), right, y, `800 60px ${HEAD}`, pal.foreground, 'right')
    y += 52
  }

  if (qr) {
    dashed(g, y, pal.muted)
    y += 48
    const box = 440
    const x = (W - box) / 2
    roundRect(g, x, y, box, box, 32)
    g.fillStyle = '#fff' // the QR image has its own white backdrop: keep it scannable
    g.fill()
    g.strokeStyle = pal.border
    g.lineWidth = 2
    g.stroke()
    const fit = Math.min(390 / qr.width, 390 / qr.height)
    const w = qr.width * fit
    const h = qr.height * fit
    g.drawImage(qr, x + (box - w) / 2, y + (box - h) / 2, w, h)
    text(g, 'Scan to pay (TNG)', W / 2, y + box + 48, `700 36px ${SANS}`, pal.foreground, 'center')
    text(g, 'Type in your total from above', W / 2, y + box + 92, `500 28px ${SANS}`, pal.muted, 'center')
    y += box + 92 + 28
  }

  text(g, 'Split with kira', W / 2, y + 48, `500 26px ${SANS}`, pal.muted, 'center')
  return y + 48 + 40 + MARGIN
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
