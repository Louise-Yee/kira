import { motion } from 'motion/react'
import { soft } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** Labelled on/off switch. */
export function Toggle({ label, checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex min-h-11 w-full items-center justify-between gap-3 px-1 text-base font-semibold disabled:text-muted-foreground"
    >
      {label}
      <span className={cn('flex h-7 w-12 shrink-0 items-center rounded-full p-1 group-disabled:bg-muted', checked ? 'justify-end bg-primary' : 'justify-start bg-muted-foreground/40')}>
        <motion.span layout transition={soft} className={cn('size-5 rounded-full shadow-sm group-disabled:bg-muted-foreground/60', checked ? 'bg-primary-foreground' : 'bg-foreground')} />
      </span>
    </button>
  )
}
