import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { CategoryBars } from '@/components/category-bars'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { TrendBars } from '@/components/trend-bars'
import { byCategory, type MonthTotals } from '@/lib/chart-data'
import { Ascii } from '@/components/ascii'
import { categoryOrOther } from '@/lib/category-lookup'
import { coinField, type Field } from '@/lib/coin'
import { addMonths, dayLabel, monthLabel, monthName } from '@/lib/date'
import { formatMoney, HOME } from '@/lib/money'
import type { shownIn } from '@/lib/display'
import type { Category, Transaction, WithId } from '@/lib/db'
import { pop, press } from '@/lib/motion'
import { groupByDay, signed, totals } from '@/lib/month-summary'

// Coin peeking in from the right edge of the balance card; x scaled for the ~2.5:1 card.
const heroField: Field = (nx, ny) => coinField((nx - 0.8) * 1.5, ny * 0.6, 0)

type Props = {
  name: string
  /** Month being shown, "YYYY-MM". */
  ym: string
  /** Today as YYYY-MM-DD; the month can't go past it. */
  today: string
  onMonthChange: (ym: string) => void
  /** undefined while the first snapshot is loading. */
  transactions: readonly WithId<Transaction>[] | undefined
  categories: readonly WithId<Category>[]
  /** Income and expense of the last months for the trend chart; undefined while loading. */
  trend: readonly MonthTotals[] | undefined
  /** The display currency and each transaction's value in it. */
  view: ReturnType<typeof shownIn>
  onAdd: () => void
  onEdit: (tx: WithId<Transaction>) => void
}

export function MonthView({ name, ym, today, onMonthChange, transactions, categories, trend, view, onAdd, onEdit }: Props) {
  const currentYm = today.slice(0, 7)
  const { currency, amountOf } = view
  const { income, expense } = totals(transactions ?? [], amountOf)
  const days = groupByDay(transactions ?? [], amountOf)
  const byId = new Map(categories.map((c) => [c.id, c]))
  const breakdown = byCategory(transactions ?? [], 6, amountOf)
  // One month of data makes five empty bars, so the chart waits for a second.
  const showTrend = trend && trend.filter((m) => m.income || m.expense).length >= 2
  const over = expense > income
  // Index of each day's first row across all groups, for the stagger delay.
  const starts = days.map((_, i) => days.slice(0, i).reduce((n, d) => n + d.items.length, 0))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Hi, ${name}`}>
      <div className="flex items-center justify-between">
        <motion.button
          type="button"
          whileTap={press}
          onClick={() => onMonthChange(addMonths(ym, -1))}
          aria-label="Previous month"
          className="flex size-11 items-center justify-center rounded-full bg-secondary"
        >
          <ChevronLeft className="size-5" />
        </motion.button>
        <p className="font-heading text-xl font-bold">{monthLabel(ym)}</p>
        <motion.button
          type="button"
          whileTap={press}
          onClick={() => onMonthChange(addMonths(ym, 1))}
          disabled={ym >= currentYm}
          aria-label="Next month"
          className="flex size-11 items-center justify-center rounded-full bg-secondary disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </motion.button>
      </div>
      </PageHeader>

      <motion.section
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={pop}
        className="relative overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground"
      >
        {/* screen blend: dark glyphs vanish into the blue, bright ones glow */}
        <Ascii field={heroField} cell={6} floor={0.2} className="absolute inset-0 size-full opacity-50 mix-blend-screen" />
        <p className="relative text-base font-semibold opacity-85">{over ? `Spent more than earned in ${monthName(ym)}` : `Left in ${monthName(ym)}`}</p>
        <Money sen={income - expense} currency={currency} countUp className="relative mt-1 block font-heading text-5xl font-extrabold tracking-tight" />
      </motion.section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-base text-muted-foreground">In</p>
          <Money sen={income} currency={currency} countUp className="block font-heading text-xl font-bold" />
        </div>
        <div className="rounded-2xl bg-card p-4">
          <p className="text-base text-muted-foreground">Out</p>
          <Money sen={expense} currency={currency} countUp className="block font-heading text-xl font-bold" />
        </div>
      </div>

      {(breakdown.total > 0 || showTrend) && (
        // The trend is first (left at lg). Phones keep each card's own height; at lg the category card
        // stretches to the trend's (fixed) height, so it matches even with fewer rows.
        <div className="grid items-start gap-3 lg:grid-cols-2 lg:items-stretch">
          {trend && showTrend && <TrendBars months={trend} selected={ym} onSelect={onMonthChange} currency={currency} />}
          {breakdown.total > 0 ? (
            <CategoryBars breakdown={breakdown} categories={byId} currency={currency} />
          ) : (
            // Keeps the second column occupied at lg; phones just skip it.
            <section className="hidden rounded-2xl bg-card p-4 lg:block">
              <h2 className="font-heading text-xl font-bold">Spending by category</h2>
              <p className="mt-3 text-base text-muted-foreground">No spending in {monthName(ym)}.</p>
            </section>
          )}
        </div>
      )}

      {transactions?.length === 0 && (
        <EmptyState icon={Receipt} text="Nothing logged this month yet." action={{ label: 'Add expense', onClick: onAdd }} />
      )}

      {days.map((day, di) => (
        <section key={day.date} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-base font-semibold text-muted-foreground">{dayLabel(day.date, today)}</h2>
            <Money sen={day.net} currency={currency} sign className="text-base font-semibold text-muted-foreground" />
          </div>
          {day.items.map((t, ti) => {
            const cat = categoryOrOther(byId, t.categoryId, t.kind)
            const i = starts[di] + ti
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...pop, delay: Math.min(i, 10) * 0.04 }}
              >
                <ListRow
                  icon={<CategoryIcon name={cat?.icon ?? 'other'} color={cat?.color ?? 'cat-1'} tile />}
                  title={t.note || cat?.name || 'Unknown category'}
                  // What was paid, with its value in the display currency underneath when that differs.
                  subtitle={
                    [t.note && cat?.name, (t.original?.currency ?? HOME) !== currency && formatMoney(amountOf(t), currency)]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  trailing={
                    <Money
                      sen={signed({ kind: t.kind, amount: t.original?.amount ?? t.amount })}
                      currency={t.original?.currency}
                      sign
                      className="text-base font-semibold"
                    />
                  }
                  onClick={() => onEdit(t)}
                />
              </motion.div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
