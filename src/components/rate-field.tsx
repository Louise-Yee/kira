import { useState } from 'react'
import { TextField } from '@/components/text-field'
import { formatRate, formatRM, parseRate, toSen } from '@/lib/money'

type Props = {
  currency: string
  /** The rate typed by the user, or null to use `fetched`. */
  value: number | null
  onChange: (rate: number | null) => void
  /** From `useRate`. */
  fetched: { rate: number | null; loading: boolean }
  /** Minor units of `currency`, previewed in RM. */
  amount: number
  /** What `amount` is, for the preview ("Total"). */
  amountLabel?: string
}

/**
 * "1 JPY = RM [0.0259]" plus the amount in RM. Left empty, the fetched rate is used (shown as the placeholder);
 * typing one overrides it. Give it `key={currency}` so a new currency starts empty.
 */
export function RateField({ currency, value, onChange, fetched, amount, amountLabel }: Props) {
  const [text, setText] = useState(value ? formatRate(value) : '')
  const rate = value ?? fetched.rate
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2">
        <span className="shrink-0 text-base font-semibold">1 {currency} = RM</span>
        <TextField
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d.]/g, '').slice(0, 16)
            setText(t)
            onChange(parseRate(t))
          }}
          placeholder={fetched.rate ? formatRate(fetched.rate) : fetched.loading ? 'Getting rate…' : 'Rate'}
          aria-label={`Exchange rate, RM per 1 ${currency}`}
        />
      </label>
      <p className="px-1 text-base text-muted-foreground">
        {rate
          ? `${amountLabel ? `${amountLabel} ` : ''}≈ ${formatRM(toSen(amount, currency, rate))}`
          : fetched.loading
            ? 'Getting the rate…'
            : `No rate found for ${currency}. Enter it to save.`}
      </p>
    </div>
  )
}
