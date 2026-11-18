import { motion, useReducedMotion } from 'motion/react'
import { monthLabel, monthName } from '@/lib/date'
import type { MonthTotals } from '@/lib/chart-data'
import { glide, press } from '@/lib/motion'
import { formatRM } from '@/lib/money'
import { cn } from '@/lib/utils'

type Props = {
  months: readonly MonthTotals[]
  /** The month the screen is showing, "YYYY-MM". */
  selected: string
  onSelect: (ym: string) => void
}

/** Income vs expense for the last months as grouped bars; tap a month to open it. */
export function TrendBars({ months, selected, onSelect }: Props) {
  const reduce = useReducedMotion()
  const top = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]))
  // A tiny but non-zero amount still gets a visible sliver.
  const height = (sen: number) => (sen ? `${Math.max(3, (sen / top) * 100)}%` : '0%')
  const transition = reduce ? { duration: 0 } : glide

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-bold">Last 6 months</h2>
        <p className="flex gap-3 text-base text-muted-foreground">
          <Key className="bg-chart-3" label="In" />
          <Key className="bg-chart-1" label="Out" />
        </p>
      </div>
      <div className="mt-3 flex gap-0">
        {months.map((m) => {
          const active = m.ym === selected
          return (
            <motion.button
              key={m.ym}
              type="button"
              whileTap={press}
              onClick={() => onSelect(m.ym)}
              aria-pressed={active}
              aria-label={`${monthLabel(m.ym)}: in ${formatRM(m.income)}, out ${formatRM(m.expense)}`}
              className={cn('flex min-h-11 flex-1 flex-col items-center gap-1 rounded-xl p-1', active && 'bg-secondary')}
            >
              <span className="flex h-36 w-full items-end justify-center gap-1 py-3">
                <motion.span
                  className="w-1/3 max-w-4 rounded-t-md bg-chart-3"
                  initial={{ height: 0 }}
                  animate={{ height: height(m.income) }}
                  transition={transition}
                />
                <motion.span
                  className="w-1/3 max-w-4 rounded-t-md bg-chart-1"
                  initial={{ height: 0 }}
                  animate={{ height: height(m.expense) }}
                  transition={transition}
                />
              </span>
              <span className={cn('text-base', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {monthName(m.ym).slice(0, 3)}
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-2.5 rounded-full', className)} />
      {label}
    </span>
  )
}
