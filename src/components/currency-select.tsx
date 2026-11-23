import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { motion } from 'motion/react'
import { ListRow } from '@/components/list-row'
import { Sheet } from '@/components/sheet'
import { Section } from '@/components/section'
import { TextField } from '@/components/text-field'
import { recentCurrencies, rememberCurrency } from '@/lib/fx'
import { currencySymbol, HOME } from '@/lib/money'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'

const names = new Intl.DisplayNames(['en'], { type: 'currency' })
const nameOf = (c: string) => names.of(c) ?? c
const ALL = Intl.supportedValuesOf('currency').filter((c) => c !== HOME)

type Props = { value: string; onChange: (currency: string) => void; className?: string }

/** A pill showing the currency; tapping it opens a searchable list (RM, then recent, then all). */
export function CurrencySelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <motion.button
        type="button"
        whileTap={press}
        onClick={() => setOpen(true)}
        aria-label={`Currency: ${nameOf(value)}`}
        className={cn('flex h-11 shrink-0 items-center gap-1 rounded-full bg-secondary pr-3 pl-4 font-sans text-base font-semibold', className)}
      >
        {currencySymbol(value)}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </motion.button>
      <CurrencySheet open={open} onClose={() => setOpen(false)} value={value} onPick={onChange} />
    </>
  )
}

/** The currency list in a sheet; picking one closes it. */
export function CurrencySheet({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: string; onPick: (currency: string) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Currency" size="full">
      {/* Mounted only while open, so the search starts empty each time. */}
      <CurrencyList
        value={value}
        onPick={(c) => {
          onPick(c)
          onClose()
        }}
      />
    </Sheet>
  )
}

/** Search plus RM, recent and all currencies. Remembers the pick as recent. */
export function CurrencyList({ value, onPick }: { value: string; onPick: (currency: string) => void }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const row = (c: string) => (
    <ListRow
      key={c}
      title={currencySymbol(c) === c ? c : `${c} · ${currencySymbol(c)}`}
      subtitle={nameOf(c)}
      trailing={c === value ? <Check className="size-5 text-primary" aria-label="Selected" /> : undefined}
      onClick={() => {
        rememberCurrency(c)
        onPick(c)
      }}
    />
  )
  const recent = recentCurrencies()
  const matches = [HOME, ...ALL].filter((c) => c.toLowerCase().includes(q) || nameOf(c).toLowerCase().includes(q))

  return (
    <div className="flex flex-col gap-4 pb-1">
      <label className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (e.g. yen, USD)"
          aria-label="Search currencies"
          data-autofocus
          className="pl-12"
        />
      </label>
      {q ? (
        matches.length ? (
          <Section>{matches.map(row)}</Section>
        ) : (
          <p className="px-1 text-base text-muted-foreground">No currency matches “{query.trim()}”.</p>
        )
      ) : (
        <>
          <Section>{row(HOME)}</Section>
          {recent.length > 0 && <Section title="Recent">{recent.map(row)}</Section>}
          <Section title="All currencies">{ALL.map(row)}</Section>
        </>
      )}
    </div>
  )
}
