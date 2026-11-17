import { useEffect, useLayoutEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { digitsToSen, formatSen } from '@/lib/money'
import { pop } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Props = {
  /** Integer sen. 0 means empty. */
  value: number
  onChange: (sen: number) => void
  autoFocus?: boolean
  className?: string
}

/**
 * TNG-style entry: digits fill from the right (0.00 -> 0.01 -> 0.12 -> 1.23).
 * A real numeric input so the phone's number pad opens; typing, backspace and paste
 * all go through digitsToSen.
 */
export function AmountInput({ value, onChange, autoFocus, className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const reduce = useReducedMotion()
  const prev = useRef(value)
  const text = formatSen(value)

  // Typing in the middle makes no sense in this model: keep the caret at the end.
  useLayoutEffect(() => {
    const el = ref.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }, [value])

  // Tiny spring pop on each change.
  useEffect(() => {
    const el = ref.current
    if (el && !reduce && prev.current !== value) {
      animate(el, { scale: 1.06 }, { duration: 0 })
      animate(el, { scale: 1 }, pop)
    }
    prev.current = value
  }, [value, reduce])

  return (
    <div className={cn('flex items-baseline justify-center gap-2 font-heading', className)}>
      <span className="text-3xl font-bold text-muted-foreground">RM</span>
      <input
        ref={ref}
        value={text}
        onChange={(e) => onChange(digitsToSen(e.target.value))}
        onSelect={(e) => {
          const el = e.currentTarget
          const end = el.value.length
          if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end)
        }}
        inputMode="numeric"
        autoFocus={autoFocus}
        data-autofocus={autoFocus || undefined}
        autoComplete="off"
        aria-label="Amount"
        style={{ width: `${text.length}ch` }}
        className={cn(
          'min-w-[4ch] bg-transparent text-6xl font-extrabold tracking-tight tabular-nums outline-none',
          value === 0 ? 'text-muted-foreground' : 'text-foreground',
        )}
      />
    </div>
  )
}
