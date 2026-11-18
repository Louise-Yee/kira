import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { select } from '@/lib/haptics'
import { press, soft } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type TabItem<Id extends string> = { id: Id; label: string; icon: LucideIcon }

type Props<Id extends string> = {
  tabs: readonly TabItem<Id>[]
  active: Id
  onChange: (id: Id) => void
  /** Sidebar layout at lg (nav position left/right). */
  side: boolean
}

export function TabBar<Id extends string>({ tabs, active: current, onChange, side }: Props<Id>) {
  return (
    <nav
      className={cn(
        // Floating glass pill, centered above the safe area.
        'fixed inset-x-0 bottom-[max(1rem,var(--inset-bottom))] z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-0.5 rounded-full border border-glass-edge bg-glass p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150',
        // Sidebar at lg when the user picks left/right.
        side &&
          'lg:sticky lg:inset-x-auto lg:top-6 lg:bottom-auto lg:mx-0 lg:h-fit lg:w-56 lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none lg:backdrop-saturate-100',
      )}
    >
      {tabs.map((t) => {
        const active = current === t.id
        return (
          <motion.button
            key={t.id}
            whileTap={press}
            onClick={() => {
              if (!active) select()
              onChange(t.id)
            }}
            aria-label={t.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-14 w-[4.5rem] min-w-0 items-center justify-center rounded-full text-base font-semibold',
              active ? 'text-foreground' : 'text-muted-foreground',
              side && 'lg:h-12 lg:w-auto lg:justify-start lg:rounded-2xl lg:px-4',
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-active"
                transition={soft}
                className={cn('absolute inset-0 rounded-full bg-foreground/10', side && 'lg:rounded-2xl')}
              />
            )}
            <motion.span
              initial={false}
              animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0 }}
              transition={soft}
              className={cn('absolute bottom-1.5 h-0.5 w-5 rounded-full bg-foreground', side && 'lg:hidden')}
            />
            <t.icon className="relative size-6 shrink-0 lg:size-5" />
            <span className={cn('relative hidden', side && 'lg:block lg:pl-3')}>{t.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
