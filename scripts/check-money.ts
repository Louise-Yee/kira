// Self-check for money + date helpers: node scripts/check-money.ts
import assert from 'node:assert/strict'
import { currencySymbol, digitsToSen, entered, formatMoney, formatRate, formatRM, formatSen, minorDigits, parseRate, senToDecimal, toHome, toSen } from '../src/lib/money.ts'
import { addMonths, inTrendWindow, lastMonths, longDate, monthLabel, monthRange, monthsRange, todayISO, trendMonths } from '../src/lib/date.ts'

// digitsToSen
assert.equal(digitsToSen(''), 0)
assert.equal(digitsToSen('0007'), 7)
assert.equal(digitsToSen('123'), 123)
assert.equal(digitsToSen('RM 12.50'), 1250)
assert.equal(digitsToSen('1234567890'), 123456789) // 10th digit ignored
assert.equal(digitsToSen('0000'), 0)

// formatSen / formatRM
assert.equal(formatSen(123450), '1,234.50')
assert.equal(formatSen(0), '0.00')
assert.equal(formatRM(0), 'RM 0.00')
assert.equal(formatRM(5), 'RM 0.05')
assert.equal(formatRM(500), 'RM 5.00')
assert.equal(formatRM(123450), 'RM 1,234.50')
assert.equal(formatRM(123456789), 'RM 1,234,567.89')
assert.equal(formatRM(500, { sign: true }), '+RM 5.00')
assert.equal(formatRM(-500, { sign: true }), '−RM 5.00')
assert.equal(formatRM(-500), '−RM 5.00')
assert.equal(formatRM(0, { sign: true }), 'RM 0.00')

// other currencies
assert.equal(minorDigits('MYR'), 2)
assert.equal(minorDigits('JPY'), 0)
assert.equal(minorDigits('KWD'), 3)
assert.equal(formatSen(300000, 0), '300,000')
assert.equal(formatSen(1234, 3), '1.234')
assert.equal(senToDecimal(3000, 0), '3000')
assert.equal(senToDecimal(1234, 3), '1.234')
assert.equal(formatMoney(3000, 'JPY'), 'JP¥3,000')
assert.equal(formatMoney(999, 'USD', { sign: true }), '+US$9.99')
assert.equal(formatMoney(-2500, 'SGD'), '−S$25.00')
assert.equal(formatMoney(500, 'CHF'), 'CHF 5.00') // no symbol: the code, with a space like RM
// a symbol only one currency uses stays plain; shared ones ($, ¥) get a prefix
assert.deepEqual(
  ['EUR', 'GBP', 'THB', 'KRW', 'IDR', 'VND', 'INR', 'PHP', 'USD', 'SGD', 'AUD', 'HKD', 'TWD', 'JPY', 'CNY', 'MYR'].map(currencySymbol),
  ['€', '£', '฿', '₩', 'Rp', '₫', '₹', '₱', 'US$', 'S$', 'A$', 'HK$', 'NT$', 'JP¥', 'CN¥', 'RM'],
)
assert.equal(currencySymbol('ARS'), 'ARS') // not "A$", which is AUD's
// no two currencies ever get the same label
const labels = Intl.supportedValuesOf('currency').map(currencySymbol)
assert.equal(new Set(labels).size, labels.length)
assert.equal(formatMoney(-1250), '−RM 12.50')

// conversion: integer maths, rounded half up
assert.equal(toSen(3000, 'JPY', 0.025923), 7777) // 77.769 -> 77.77
assert.equal(toSen(999, 'USD', 4.1125), 4108) // 41.083875 -> 41.08
assert.equal(toSen(1, 'USD', 4.15), 4) // 0.0415 -> 0.04
assert.equal(toSen(10, 'USD', 4.15), 42) // 0.415 -> 0.42 (half up)
assert.equal(toSen(1000, 'KWD', 14.5), 1450) // 1.000 KWD
assert.equal(toSen(1_000_000, 'IDR', 0.000283), 28300) // IDR has no minor unit in Intl
assert.equal(toSen(999_999_999, 'JPY', 0.025923), 2592299997) // big amounts stay exact
assert.deepEqual(toHome(1250, 'MYR', null), { amount: 1250 })
assert.equal(toHome(3000, 'JPY', null), null)
assert.deepEqual(toHome(3000, 'JPY', 0.025923), { amount: 7777, original: { currency: 'JPY', amount: 3000, rate: 0.025923 } })
assert.deepEqual(entered({ amount: 7777, original: { currency: 'JPY', amount: 3000, rate: 0.025923 } }), { currency: 'JPY', amount: 3000, rate: 0.025923 })
assert.deepEqual(entered({ amount: 1250 }), { currency: 'MYR', amount: 1250, rate: null })
assert.deepEqual(entered(), { currency: 'MYR', amount: 0, rate: null })

// typed rates
assert.equal(parseRate('0.0259'), 0.0259)
assert.equal(parseRate(' 4.11 '), 4.11)
assert.equal(parseRate('0'), null)
assert.equal(parseRate('0.'), null)
assert.equal(parseRate('1.2.3'), null)
assert.equal(parseRate(''), null)
assert.equal(formatRate(0.025923), '0.025923')
assert.equal(formatRate(4.1125), '4.1125')
assert.equal(formatRate(1 / 3), '0.333333')

// dates
assert.equal(todayISO(new Date(2026, 0, 5, 1, 30)), '2026-01-05') // local, not UTC
assert.equal(todayISO(new Date(2026, 10, 17, 23, 59)), '2026-11-17')
assert.equal(addMonths('2026-11', 1), '2026-12')
assert.equal(addMonths('2026-12', 1), '2027-01')
assert.equal(addMonths('2026-01', -1), '2025-12')
assert.equal(addMonths('2026-03', -15), '2024-12')
assert.deepEqual(monthRange('2026-11'), { start: '2026-11-01', end: '2026-12-01' })
assert.deepEqual(monthRange('2026-12'), { start: '2026-12-01', end: '2027-01-01' })
assert.equal(monthLabel('2026-11'), 'November 2026')

// monthsRange / lastMonths
assert.deepEqual(monthsRange('2026-06', '2026-11'), { start: '2026-06-01', end: '2026-12-01' })
assert.deepEqual(monthsRange('2026-12', '2026-12'), { start: '2026-12-01', end: '2027-01-01' })
assert.deepEqual(lastMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02'])

// trend window: 6 months ending now
assert.deepEqual(trendMonths('2026-02'), ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'])
assert.equal(inTrendWindow('2026-02', '2026-02'), true)
assert.equal(inTrendWindow('2025-09', '2026-02'), true)
assert.equal(inTrendWindow('2025-08', '2026-02'), false)
assert.equal(inTrendWindow('2026-03', '2026-02'), false)

assert.equal(longDate('2026-12-01'), '1 Dec 2026')
assert.equal(longDate('2027-01-09'), '9 Jan 2027')

console.log('check-money: ok')
