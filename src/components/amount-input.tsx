import { useEffect, useLayoutEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { CurrencySelect } from '@/components/currency-select'
import { currencySymbol, digitsToSen, formatSen, minorDigits, HOME } from '@/lib/money'
import { pop } from '@/lib/motion'
import { useTouch } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

type Props = {
  /** Integer sen (minor units of `currency`). 0 means empty. */
  value: number
  onChange: (sen: number) => void
  /** ISO code; RM when absent. */
  currency?: string
  /** Makes the prefix a currency picker. */
  onCurrency?: (currency: string) => void
  autoFocus?: boolean
  /** `sm` for rows in a list (split items), `lg` (default) for the one big amount on a form. */
  size?: 'lg' | 'sm'
  className?: string
}

/**
 * TNG-style entry: digits fill from the right (0.00 -> 0.01 -> 0.12 -> 1.23).
 * A real numeric input so the phone's number pad opens; typing, backspace and paste
 * all go through digitsToSen.
 */
export function AmountInput({ value, onChange, currency = HOME, onCurrency, autoFocus, size = 'lg', className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const touch = useTouch()
  const focus = autoFocus && !touch
  const reduce = useReducedMotion()
  const prev = useRef(value)
  const text = formatSen(value, minorDigits(currency))

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
      {onCurrency ? (
        <CurrencySelect value={currency} onChange={onCurrency} className="self-center" />
      ) : (
        <span className={cn('font-bold text-muted-foreground', size === 'sm' ? 'text-base' : 'text-3xl')}>
          {currencySymbol(currency)}
        </span>
      )}
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
        autoFocus={focus}
        data-autofocus={focus || undefined}
        autoComplete="off"
        aria-label="Amount"
        style={{ width: `${text.length}ch` }}
        className={cn(
          'min-h-11 min-w-[4ch] bg-transparent font-extrabold tracking-tight tabular-nums outline-none',
          size === 'sm' ? 'text-2xl' : 'text-6xl',
          value === 0 ? 'text-muted-foreground' : 'text-foreground',
        )}
      />
    </div>
  )
}
