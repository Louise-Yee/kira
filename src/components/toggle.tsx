import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { soft } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** A leading tile, to line up with list rows. */
  icon?: ReactNode
  /** A line under the label saying what it does. */
  description?: string
}

/** Labelled on/off switch. */
export function Toggle({ label, checked, onChange, disabled, icon, description }: Props) {
  const descriptionId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      // Named by the label alone; the description is read after it.
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex min-h-11 w-full items-center gap-3 px-1 text-left text-base font-semibold disabled:text-muted-foreground"
    >
      {icon}
      <span className="min-w-0 flex-1">
        {label}
        {description && (
          <span id={descriptionId} className="block font-normal text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span className={cn('flex h-7 w-12 shrink-0 items-center rounded-full p-1 group-disabled:bg-muted', checked ? 'justify-end bg-primary' : 'justify-start bg-muted-foreground/40')}>
        <motion.span layout transition={soft} className={cn('size-5 rounded-full shadow-sm group-disabled:bg-muted-foreground/60', checked ? 'bg-primary-foreground' : 'bg-foreground')} />
      </span>
    </button>
  )
}
