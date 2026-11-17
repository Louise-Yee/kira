import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** The standard single-line input (note, date, names). */
export function TextField({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-2xl bg-secondary px-4 text-base outline-none placeholder:text-muted-foreground',
        className,
      )}
    />
  )
}
