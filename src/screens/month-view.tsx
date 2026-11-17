import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { CategoryBars } from '@/components/category-bars'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { TrendBars } from '@/components/trend-bars'
import { byCategory, type MonthTotals } from '@/lib/chart-data'
import { Ascii } from '@/components/ascii'
import { coinField, type Field } from '@/lib/coin'
import { addMonths, dayLabel, monthLabel, monthName } from '@/lib/date'
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
  onAdd: () => void
  onEdit: (tx: WithId<Transaction>) => void
}

export function MonthView({ name, ym, today, onMonthChange, transactions, categories, trend, onAdd, onEdit }: Props) {
  const currentYm = today.slice(0, 7)
  const { income, expense } = totals(transactions ?? [])
  const days = groupByDay(transactions ?? [])
  const byId = new Map(categories.map((c) => [c.id, c]))
  const breakdown = byCategory(transactions ?? [])
  const showTrend = trend?.some((m) => m.income || m.expense)
  // Index of each day's first row across all groups, for the stagger delay.
  const starts = days.map((_, i) => days.slice(0, i).reduce((n, d) => n + d.items.length, 0))

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Hi, {name}</h1>

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

      <motion.section
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={pop}
        className="relative overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground"
      >
        {/* screen blend: dark glyphs vanish into the blue, bright ones glow */}
        <Ascii field={heroField} cell={6} floor={0.2} className="absolute inset-0 size-full opacity-50 mix-blend-screen" />
        <p className="relative text-base font-semibold opacity-85">Left in {monthName(ym)}</p>
        <Money sen={income - expense} countUp className="relative mt-1 block font-heading text-5xl font-extrabold tracking-tight" />
      </motion.section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-base text-muted-foreground">In</p>
          <Money sen={income} countUp className="block font-heading text-xl font-bold" />
        </div>
        <div className="rounded-2xl bg-card p-4">
          <p className="text-base text-muted-foreground">Out</p>
          <Money sen={expense} countUp className="block font-heading text-xl font-bold" />
        </div>
      </div>

      {(breakdown.total > 0 || showTrend) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {breakdown.total > 0 && <CategoryBars breakdown={breakdown} categories={byId} />}
          {trend && showTrend && <TrendBars months={trend} selected={ym} onSelect={onMonthChange} />}
        </div>
      )}

      {transactions?.length === 0 && (
        <EmptyState icon={Receipt} text="Nothing logged this month yet." action={{ label: 'Add expense', onClick: onAdd }} />
      )}

      {days.map((day, di) => (
        <section key={day.date} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-base font-semibold text-muted-foreground">{dayLabel(day.date, today)}</h2>
            <Money sen={day.net} sign className="text-base font-semibold text-muted-foreground" />
          </div>
          {day.items.map((t, ti) => {
            const cat = byId.get(t.categoryId)
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
                  subtitle={t.note ? cat?.name : undefined}
                  trailing={<Money sen={signed(t)} sign className="text-base font-semibold" />}
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
