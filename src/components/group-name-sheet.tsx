import { useState } from 'react'
import { CurrencySelect } from '@/components/currency-select'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { TextField } from '@/components/text-field'
import { useDisplayCurrency } from '@/lib/display-currency'
import { MAX_NAME, cleanGroupName } from '@/lib/groups'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** The current name when renaming. */
  initial?: string
  label: string
  /** Creating: also pick the group's currency (starts as the display currency). Absent when renaming. */
  onCreate?: (name: string, currency: string) => void
  onSave?: (name: string) => void
}

/** Name a new group or rename one. */
export function GroupNameSheet({ open, onClose, title, initial = '', label, onCreate, onSave }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Mounted only while open, so the field starts from the current name each time. */}
      <Body onClose={onClose} initial={initial} label={label} onCreate={onCreate} onSave={onSave} />
    </Sheet>
  )
}

function Body({ onClose, initial = '', label, onCreate, onSave }: Omit<Props, 'open' | 'title'>) {
  const [name, setName] = useState(initial)
  const display = useDisplayCurrency()
  const [currency, setCurrency] = useState(display)
  const clean = cleanGroupName(name)
  const save = () => {
    if (!clean) return
    if (onCreate) onCreate(clean, currency)
    else onSave?.(clean)
    onClose()
  }
  return (
    <form
      className="flex flex-col gap-4 pb-1"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <TextField
        autoFocus
        value={name}
        maxLength={MAX_NAME}
        placeholder="Dorm, Dungeon, Trip…"
        aria-label="Group name"
        onChange={(e) => setName(e.target.value)}
      />
      {onCreate && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-base font-semibold">Currency</span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
          <p className="px-1 text-base text-muted-foreground">Everyone's expenses and balances are in it. It can't be changed later.</p>
        </div>
      )}
      <SheetActions label={label} disabled={!clean} onSave={save} />
    </form>
  )
}
