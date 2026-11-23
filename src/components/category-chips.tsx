import { motion } from 'motion/react'
import { CategoryIcon } from '@/components/category-icon'
import type { Kind } from '@/lib/db'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Item = { id: string; name: string; icon: string; color: string; kind: Kind }

type Props = {
  /** In display order. Callers filter out archived ones. With both kinds, income ones get their own heading. */
  categories: readonly Item[]
  value: string | null
  onChange: (id: string) => void
}

/** Every category as a tappable chip, wrapping onto as many rows as needed: one tap, nothing hidden. */
export function CategoryChips({ categories, value, onChange }: Props) {
  const expense = categories.filter((c) => c.kind === 'expense')
  const income = categories.filter((c) => c.kind === 'income')
  const chips = (items: readonly Item[], label?: string) => (
    <div role={label ? 'group' : undefined} aria-label={label} className="flex flex-wrap gap-2">
      {items.map((c) => {
        const on = c.id === value
        return (
          <motion.button
            key={c.id}
            type="button"
            whileTap={press}
            aria-pressed={on}
            onClick={() => onChange(c.id)}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full pr-4 pl-3 text-base font-semibold',
              on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            )}
          >
            <CategoryIcon name={c.icon} color={on ? undefined : c.color} />
            <span className="max-w-40 truncate">{c.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
  return (
    <div role="group" aria-label="Category" className="flex flex-col gap-3">
      {expense.length > 0 && chips(expense)}
      {income.length > 0 && (
        <div className="flex flex-col gap-2">
          {expense.length > 0 && <h3 className="px-1 text-base font-semibold text-muted-foreground">Income</h3>}
          {chips(income, expense.length > 0 ? 'Income' : undefined)}
        </div>
      )}
    </div>
  )
}
