import { motion, useReducedMotion } from 'motion/react'
import { CategoryIcon } from '@/components/category-icon'
import { Money } from '@/components/money'
import { catColor } from '@/lib/category-icons'
import { categoryOrOther } from '@/lib/category-lookup'
import type { CategoryBreakdown } from '@/lib/chart-data'
import { glide } from '@/lib/motion'

type Props = {
  breakdown: CategoryBreakdown
  /** Name, icon and colour token per category id. Unknown ids fall back to "Other". */
  categories: ReadonlyMap<string, { name: string; icon: string; color: string }>
  /** What the amounts are in; RM when absent. */
  currency?: string
}

/** Spending by category: bars sized against the biggest row, which grow in with a spring. */
export function CategoryBars({ breakdown, categories, currency }: Props) {
  const reduce = useReducedMotion()
  const { rows, others } = breakdown
  const biggest = rows[0]?.amount ?? 0
  const items = [
    ...rows.map((r) => {
      const c = categoryOrOther(categories, r.categoryId, 'expense')
      return { key: r.categoryId, name: c?.name ?? 'Other', icon: c?.icon ?? 'other', color: c?.color ?? '', amount: r.amount, percent: r.percent }
    }),
    ...(others ? [{ key: 'others', name: 'Others', icon: 'other', color: '', ...others }] : []),
  ]

  return (
    <section className="rounded-2xl bg-card p-4 lg:flex lg:flex-col">
      <h2 className="font-heading text-xl font-bold">Spending by category</h2>
      <ul className="mt-3 flex flex-col gap-4 lg:flex-1 lg:justify-evenly">
        {items.map((it) => (
          <li key={it.key}>
            <div className="flex items-center gap-2">
              <CategoryIcon name={it.icon} color={it.color || undefined} />
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{it.name}</span>
              <Money sen={it.amount} currency={currency} className="text-base font-semibold" />
              <span className="w-12 text-right text-base text-muted-foreground tabular-nums">{it.percent}%</span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: catColor(it.color) }}
                initial={{ width: 0 }}
                animate={{ width: `${biggest ? (it.amount / biggest) * 100 : 0}%` }}
                transition={reduce ? { duration: 0 } : glide}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
