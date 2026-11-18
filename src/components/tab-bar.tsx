import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { glide, press } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type TabItem<Id extends string> = { id: Id; label: string; icon: LucideIcon }

type Props<Id extends string> = {
  tabs: readonly TabItem<Id>[]
  active: Id
  onChange: (id: Id) => void
  /** Sidebar layout at lg (nav position left/right). */
  side: boolean
  /** Viewport is at the lg breakpoint or wider. */
  lg: boolean
}

export function TabBar<Id extends string>({ tabs, active: current, onChange, side, lg }: Props<Id>) {
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
            onClick={() => onChange(t.id)}
            aria-label={t.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-11 items-center justify-center rounded-full px-2.5 text-base font-semibold',
              active ? 'text-foreground' : 'text-muted-foreground',
              side && 'lg:h-12 lg:justify-start lg:rounded-2xl lg:px-4',
            )}
          >
            <motion.span
              initial={false}
              animate={{ opacity: active ? 1 : 0 }}
              transition={glide}
              className={cn('absolute inset-0 rounded-full bg-foreground/10', side && 'lg:rounded-2xl')}
            />
            <t.icon className="relative size-6 shrink-0 lg:size-5" />
            <AnimatePresence initial={false}>
              {(active || (side && lg)) && (
                <motion.span
                  initial={{ width: 0, opacity: 0, x: -10 }}
                  animate={{ width: 'auto', opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: -10 }}
                  transition={glide}
                  className="relative overflow-hidden whitespace-nowrap"
                >
                  <span className={cn('block pl-2', side && 'lg:pl-3')}>{t.label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </nav>
  )
}
