import { motion } from 'motion/react'
import { CategoryIcon } from '@/components/category-icon'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Item = { id: string; name: string; icon: string; color: string }

type Props = { categories: readonly Item[]; value: string | null; onChange: (id: string) => void }

/** Wrapping grid of category chips; single select. Callers filter out archived categories. */
export function CategoryPicker({ categories, value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = c.id === value
        return (
          <motion.button
            key={c.id}
            type="button"
            whileTap={press}
            onClick={() => onChange(c.id)}
            aria-pressed={active}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full px-4 text-base font-semibold',
              active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            <CategoryIcon name={c.icon} color={active ? undefined : c.color} />
            {c.name}
          </motion.button>
        )
      })}
    </div>
  )
}
