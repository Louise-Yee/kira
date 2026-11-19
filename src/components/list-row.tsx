import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { press } from '@/lib/motion'

type Props = {
  icon?: ReactNode
  title: string
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
}

const base = 'flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card p-3 text-left'

/** The standard row (transactions, rules, splits). A button when `onClick` is given. */
export function ListRow({ icon, title, subtitle, trailing, onClick }: Props) {
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold">{title}</span>
        {subtitle && <span className="block truncate text-base text-muted-foreground">{subtitle}</span>}
      </span>
      {trailing}
    </>
  )
  return onClick ? (
    <motion.button type="button" whileTap={press} onClick={onClick} className={base}>
      {content}
    </motion.button>
  ) : (
    <div className={base}>{content}</div>
  )
}
