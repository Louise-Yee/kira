import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { CurrencySelect } from '@/components/currency-select'
import { Numpad } from '@/components/numpad'
import { currencySymbol, digitsToSen, formatSen, minorDigits, pressKey, HOME } from '@/lib/money'
import { pop, soft } from '@/lib/motion'
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
  /** On touch screens, type with a keypad pinned in the sheet instead of the OS keyboard. Needs to be inside a `Sheet`. */
  pad?: boolean
  /** `sm` for rows in a list (split items), `lg` (default) for the one big amount on a form. */
  size?: 'lg' | 'sm'
  className?: string
}

/**
 * TNG-style entry: digits fill from the right (0.00 -> 0.01 -> 0.12 -> 1.23).
 * A real numeric input so the phone's number pad opens; typing, backspace and paste
 * all go through digitsToSen.
 */
export function AmountInput({ value, onChange, currency = HOME, onCurrency, autoFocus, pad, size = 'lg', className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const touch = useTouch()
  const usePad = !!pad && touch
  // The keypad never opens the OS keyboard, so touch can focus right away too.
  const focus = autoFocus && (!touch || usePad)
  const [focused, setFocused] = useState(false)
  const caret = useRef<HTMLSpanElement>(null)
  // Quick taps can land before a re-render, so each press builds on the last one, not on a stale `value`.
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])
  const reduce = useReducedMotion()
  const prev = useRef(value)
  // Custom caret: blinks while idle, stays solid right after a press; static under reduced motion.
  useEffect(() => {
    const el = caret.current
    if (!el || reduce) return
    let on = true
    animate(el, { opacity: 1 }, soft)
    const id = window.setInterval(() => {
      on = !on
      animate(el, { opacity: on ? 1 : 0 }, soft)
    }, 530)
    return () => window.clearInterval(id)
  }, [focused, reduce, value])
  const font = cn('font-extrabold tracking-tight tabular-nums', size === 'sm' ? 'text-2xl' : 'text-6xl')
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
    <>
      <div className={cn('flex items-baseline justify-center gap-2 font-heading', className)}>
        {onCurrency ? (
          <CurrencySelect value={currency} onChange={onCurrency} className="self-center" />
        ) : (
          <span className={cn('font-bold text-muted-foreground', size === 'sm' ? 'text-base' : 'text-3xl')}>
            {currencySymbol(currency)}
          </span>
        )}
        {/* The hidden mirror sizes the box to the exact text, so the caret sits right at the end of it. */}
        <span className="relative inline-grid">
          <span aria-hidden className={cn('invisible col-start-1 row-start-1 whitespace-pre', font)}>
            {text}
          </span>
          <input
            ref={ref}
            value={text}
            onChange={(e) => onChange(digitsToSen(e.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSelect={(e) => {
              const el = e.currentTarget
              const end = el.value.length
              if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end)
            }}
            inputMode={usePad ? 'none' : 'numeric'}
            autoFocus={focus}
            data-autofocus={focus || undefined}
            autoComplete="off"
            aria-label="Amount"
            className={cn(
              'col-start-1 row-start-1 min-h-11 w-0 min-w-full bg-transparent caret-transparent outline-none',
              font,
              value === 0 ? 'text-muted-foreground' : 'text-foreground',
            )}
          />
          {focused && (
            <span
              ref={caret}
              aria-hidden
              className={cn('absolute inset-y-0 left-full my-auto ml-px rounded-full bg-primary', size === 'sm' ? 'h-6 w-0.5' : 'h-12 w-1')}
            />
          )}
        </span>
      </div>
      {usePad && <Numpad field={ref} onKey={(k) => onChange((latest.current = pressKey(latest.current, k)))} />}
    </>
  )
}
