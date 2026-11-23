// Self-check for receipt text parsing: node scripts/check-receipt-parse.ts
import assert from 'node:assert/strict'
import { parseReceipt, scannedTotal } from '../src/lib/receipt-parse.ts'

const sushi = `SUSHI KING SDN BHD
Tel: 03-1234 5678
Date 12/11/2026
Salmon Sashimi      18.90
2 x Green Tea        7.00
Chicken Katsu Don   RM 15.50 SR
Subtotal            41.40
Service Charge 10%   4.14
SST 6%               2.73
Rounding             0.03
TOTAL               48.30
Cash               100.00
Change              51.70`
const r = parseReceipt(sushi)
assert.deepEqual(r.items, [
  { name: 'Salmon Sashimi', amount: 1890 },
  { name: '2 x Green Tea', amount: 700 },
  { name: 'Chicken Katsu Don', amount: 1550 },
])
assert.equal(r.tax, 414 + 273)
assert.equal(r.total, 4830)
assert.equal(scannedTotal(r), 4830)

// Thousands separators and a decimal comma
assert.deepEqual(parseReceipt('Wagyu 1,234.50\nSake 12,50').items, [
  { name: 'Wagyu', amount: 123450 },
  { name: 'Sake', amount: 1250 },
])

// The last total wins; no total but tax -> items + tax; neither -> unknown
assert.equal(parseReceipt('Total (excl. tax) 40.00\nGrand Total 48.00').total, 4800)
assert.equal(scannedTotal(parseReceipt('Tea 10.00\nCake 5.00\nSST 6% 0.90')), 1590)
assert.equal(scannedTotal(parseReceipt('Tea 10.00')), null)
// A total read below its items (58 misread as 53) falls back to the items' sum
assert.equal(scannedTotal(parseReceipt('Rice 23.00
Gyoza 12.00
Noodle 23.00
Total (MYR) 53.00')), 5800)

// Junk and empty text give nothing, and a zero price is not an item
assert.deepEqual(parseReceipt('hello\n\nThank you!\nFree refill 0.00'), { items: [], tax: null, total: null })
assert.deepEqual(parseReceipt(''), { items: [], tax: null, total: null })

// A tip is a charge, not an item; "You Saved" is not an item
assert.deepEqual(parseReceipt('Sub Total USD$ 25.23\nTip: 3.78\nTotal USD$ 29.01\nYou Saved $14.00'), { items: [], tax: 378, total: 2901 })

// Malaysian GST-era wording: "Excluding GST" is partial, "Inclusive of GST" is the total, "Total GST" is tax,
// a phone number is not a price, and a GST summary row is not the total
const gst = 'Plastic Bag 0.20 SR\nTotal Sales (Excluding GST) 60.91\nTotal GST 3.65\nRounding 0.01\nTotal Sales (Inclusive of GST) : 64.57\nGST ID 0005840896.0280\nTotal 60.91 3.65'
assert.deepEqual(parseReceipt(gst), { items: [{ name: 'Plastic Bag', amount: 20 }], tax: 365, total: 6457 })

console.log('check-receipt-parse: ok')
