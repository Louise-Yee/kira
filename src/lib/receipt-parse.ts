export type ScannedItem = { name: string; amount: number }

/** What OCR text of a receipt turned into. Amounts are integer sen; `null` means the receipt had no such line. */
export type ScannedReceipt = { items: ScannedItem[]; tax: number | null; total: number | null }

// A price closing the line: "12.50", "RM 12.50", "1,234.50", "12,50", optionally followed by a tax code like "SR" or "T".
const PRICE = /(?:RM\s*)?(\d{1,3}(?:,\d{3})+|\d+)[.,] ?(\d{2})(?:\s*[A-Za-z]{1,2})?\s*$/i

const IGNORE = /\b(cash|change|round(?:ing)?|tender(?:ed)?|visa|master(?:card)?|card|balance|paid|payment|discount|voucher|points?|qty|tel|invoice|receipt|table|pax|saved|savings|off|new price|adjusted price|summary|sr|zr|zrl)\b/i
// A line saying GST/tax is excluded is a partial figure, never the amount to pay.
const EXCL = /excl/i
const SUBTOTAL = /\bsub\s*-?\s*total\b/i
const TAX = /gst|sst|\b(tax|vat|service|svc|s\/c|tip|gratuity)\b/i
const TOTAL = /t[oa]tal|amount\s*due|amt\s*due|payable|nett/i

const MAX_SEN = 10_000_000

/** "1,234.50" -> 123450 by string maths, never a float. */
function toSen(whole: string, cents: string): number {
  return Number(whole.replace(/,/g, '')) * 100 + Number(cents)
}

/**
 * Read OCR text line by line: lines ending in a price are items, except the total, tax/service and payment
 * lines, which fill `total` and `tax` instead. The OCR is never trusted blindly; the caller shows the result
 * for the user to fix.
 */
export function parseReceipt(text: string): ScannedReceipt {
  const items: ScannedItem[] = []
  let tax: number | null = null
  let total: number | null = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const m = PRICE.exec(line)
    if (!m) continue
    const amount = toSen(m[1], m[2])
    // Over RM 100,000 is a phone or registration number misread as a price.
    if (amount > MAX_SEN) continue
    const label = line.slice(0, m.index).replace(/[\s.:*_-]+$/, '').trim()
    if (IGNORE.test(label) || SUBTOTAL.test(label) || EXCL.test(label)) continue
    const isTax = TAX.test(label)
    // "Total GST" is tax, but "Total Sales (Inclusive of GST)" is the total. The last total line wins.
    // A total with another price before it is a GST summary table row, not the bill's total.
    if (TOTAL.test(label) && PRICE.test(label)) continue
    if (TOTAL.test(label) && (!isTax || /incl/i.test(label))) total = amount
    else if (isTax) tax = (tax ?? 0) + amount
    else if (amount > 0) items.push({ name: label.replace(/[$\s]+/g, ' ').trim().slice(0, 40), amount })
  }
  return { items, tax, total }
}

/** The bill's real total: the printed one, else the items plus the tax lines, else unknown. */
export function scannedTotal({ items, tax, total }: ScannedReceipt): number | null {
  if (total !== null) return total
  return tax === null ? null : items.reduce((sum, i) => sum + i.amount, 0) + tax
}
