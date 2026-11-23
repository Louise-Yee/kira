import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  title: ReactNode
  /** Before the title (a back button). */
  leading?: ReactNode
  /** After the title (a button). */
  action?: ReactNode
  /** Pinned under the title row (a switch, the month switcher). */
  children?: ReactNode
  className?: string
}

/** Page title that stays pinned while the page scrolls, and shrinks as you do. Phones and tablets only: at lg it's a plain header. The motion is CSS (`.page-header` in index.css), driven by the scroll position. */
export function PageHeader({ title, leading, action, children, className }: Props) {
  return (
    <header className={cn('page-header sticky top-0 z-20 -mx-5 flex flex-col gap-4 bg-background px-5 lg:static lg:mx-0 lg:bg-transparent lg:px-0', className)}>
      <div className="flex items-center gap-3">
        {leading}
        <h1 className="page-title min-w-0 flex-1 truncate font-heading font-extrabold tracking-tight">{title}</h1>
        {action}
      </div>
      {children}
    </header>
  )
}
