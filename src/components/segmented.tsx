import { useId } from 'react'
import { motion } from 'motion/react'
import { press, soft } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Option<V extends string> = { value: V; label: string }

type Props<V extends string> = {
  options: readonly Option<V>[]
  value: V
  onChange: (value: V) => void
  className?: string
}

/** Pill toggle with a thumb that slides between options. */
export function Segmented<V extends string>({ options, value, onChange, className }: Props<V>) {
  const id = useId()
  return (
    <div className={cn('flex rounded-full bg-secondary p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <motion.button
            key={o.value}
            type="button"
            whileTap={press}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={cn(
              'relative h-11 flex-1 rounded-full px-3 text-base font-semibold',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                transition={soft}
                className="absolute inset-0 rounded-full bg-card shadow-sm"
              />
            )}
            <span className="relative">{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
