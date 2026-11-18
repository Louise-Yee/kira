import { useState } from 'react'
import { EntryFields, type Entry } from '@/components/entry-fields'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { error, success, warning } from '@/lib/haptics'
import { shortDate, todayISO } from '@/lib/date'
import type { Category, Recurring, RecurringDraft, WithId } from '@/lib/db'
import { nextDate, restartFloor, scheduleChanged, type Freq, type RecurrenceEnd } from '@/lib/recurrence'

type Props = {
  open: boolean
  onClose: () => void
  categories: readonly WithId<Category>[]
  /** Set to edit an existing rule; omit to add. */
  initial?: WithId<Recurring>
  onSave: (draft: RecurringDraft) => void
  /** How many transactions the rule has posted. Rejects when offline. */
  countTransactions: () => Promise<number>
  /** Rejects when offline, in which case nothing was deleted. */
  onDelete: (withTransactions: boolean) => Promise<void>
}

type Preset = Exclude<Freq, 'day'> | 'custom'

const presetOptions = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
] as const satisfies readonly { value: Preset; label: string }[]

const unitOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const satisfies readonly { value: Freq; label: string }[]

const endOptions = [
  { value: 'never', label: 'Never' },
  { value: 'date', label: 'On date' },
  { value: 'count', label: 'After N' },
] as const satisfies readonly { value: RecurrenceEnd['type']; label: string }[]

const stateOptions = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
] as const satisfies readonly { value: 'active' | 'paused'; label: string }[]

export function RecurringSheet({ open, onClose, initial, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Edit recurring' : 'New recurring'}>
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

/** A whole number from 1 to 999, or null. */
const wholeNumber = (text: string) => (/^\d{1,3}$/.test(text) && Number(text) >= 1 ? Number(text) : null)

const initialPreset = (r?: Recurring): Preset =>
  !r ? 'month' : r.interval === 1 && r.freq !== 'day' ? r.freq : 'custom'

function Form({ initial, categories, onSave, countTransactions, onDelete, onClose }: Omit<Props, 'open'>) {
  const [entry, setEntry] = useState<Entry>({
    kind: initial?.kind ?? 'expense',
    amount: initial?.amount ?? 0,
    categoryId: initial?.categoryId ?? null,
    note: initial?.note ?? '',
  })
  const [preset, setPreset] = useState(() => initialPreset(initial))
  const [interval, setInterval] = useState(String(initial?.interval ?? 1))
  const [unit, setUnit] = useState<Freq>(initial?.freq ?? 'month')
  const [today] = useState(todayISO)
  // null until the user touches the start date, so a frequency change can move it for them.
  const [pickedStart, setPickedStart] = useState<string | null>(null)
  const [endType, setEndType] = useState<RecurrenceEnd['type']>(initial?.end.type ?? 'never')
  const [endDate, setEndDate] = useState(initial?.end.type === 'date' ? initial.end.value : '')
  const [endCount, setEndCount] = useState(initial?.end.type === 'count' ? String(initial.end.value) : '')
  const [paused, setPaused] = useState(initial?.paused ?? false)

  const freq: Freq = preset === 'custom' ? unit : preset
  const n = preset === 'custom' ? wholeNumber(interval) : 1
  const count = wholeNumber(endCount)

  // Changing the schedule of a rule that has posted starts a new rule. It must not begin before the old
  // rule's next due date, or the dates already posted would be posted again.
  const floor = initial && initial.posted > 0 ? restartFloor(initial, initial.posted) : null
  const freqChanged = !!initial && (freq !== initial.freq || n !== initial.interval)
  const startDate = pickedStart ?? (freqChanged && floor ? floor : (initial?.startDate ?? today))
  const restarts = !!floor && (freqChanged || startDate !== initial?.startDate)
  const tooEarly = restarts && startDate < floor
  const end: RecurrenceEnd | null =
    endType === 'never'
      ? { type: 'never' }
      : endType === 'date'
        ? endDate && endDate >= startDate
          ? { type: 'date', value: endDate }
          : null
        : count
          ? { type: 'count', value: count }
          : null
  // null until the form can be saved.
  const draft: RecurringDraft | null =
    entry.amount > 0 && entry.categoryId && startDate && !tooEarly && n && end
      ? {
          kind: entry.kind,
          amount: entry.amount,
          categoryId: entry.categoryId,
          note: entry.note.trim(),
          freq,
          interval: n,
          startDate,
          end,
          paused,
        }
      : null

  // Upcoming dates: from what's already posted when the schedule is unchanged, else from the start.
  const resumes = initial && draft && !scheduleChanged(initial, draft)
  const preview: string[] = []
  for (let i = 0; draft && i < 3; i++) {
    const d = nextDate(draft, (resumes ? initial.posted : 0) + i)
    if (!d) break
    preview.push(shortDate(d))
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <EntryFields value={entry} onChange={setEntry} categories={categories} keepCategoryId={initial?.categoryId} autoFocus={!initial} />

      <Segmented options={presetOptions} value={preset} onChange={setPreset} />
      {preset === 'custom' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold">Every</span>
            <TextField
              inputMode="numeric"
              value={interval}
              onChange={(e) => setInterval(e.target.value.replace(/\D/g, '').slice(0, 3))}
              aria-label="Repeat every"
              className="w-24 text-center"
            />
          </div>
          <Segmented options={unitOptions} value={unit} onChange={setUnit} />
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="px-1 text-base font-semibold">Starts</span>
        <TextField
          type="date"
          value={startDate}
          min={restarts ? floor : undefined}
          onChange={(e) => setPickedStart(e.target.value)}
        />
        {tooEarly && (
          <span className="px-1 text-base text-destructive">
            A changed schedule can't start before {shortDate(floor)}, when the next payment was due.
          </span>
        )}
      </label>

      <div className="flex flex-col gap-2">
        <span className="px-1 text-base font-semibold">Ends</span>
        <Segmented options={endOptions} value={endType} onChange={setEndType} />
        {endType === 'date' && (
          <TextField type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
        )}
        {endType === 'count' && (
          <TextField
            inputMode="numeric"
            value={endCount}
            onChange={(e) => setEndCount(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Number of payments"
            aria-label="Number of payments"
          />
        )}
      </div>

      {initial && <Segmented options={stateOptions} value={paused ? 'paused' : 'active'} onChange={(v) => setPaused(v === 'paused')} />}

      {preview.length > 0 && (
        <p className="px-1 text-base text-muted-foreground">
          {resumes ? 'Next' : 'Starts'}: {preview.join(', ')}
          {preview.length === 3 && '…'}
        </p>
      )}
      {initial && (
        <p className="px-1 text-base text-muted-foreground">
          Amount, category, note, end and pause apply to future payments. Changing the repeat or start date starts a
          new rule from the next payment date or later; payments already posted stay as they are.
        </p>
      )}

      <PillButton
        disabled={!draft}
        onClick={() => {
          if (!draft) return
          success()
          onSave(draft)
          onClose()
        }}
      >
        Save
      </PillButton>
      {initial && <DeleteFlow countTransactions={countTransactions} onDelete={onDelete} onClose={onClose} />}
    </div>
  )
}

type Del = { phase: 'idle' } | { phase: 'checking' } | { phase: 'offline' } | { phase: 'ready'; count: number }

/** Delete needs the server (it counts what was posted), so it is blocked while offline. */
function DeleteFlow({ countTransactions, onDelete, onClose }: Pick<Props, 'countTransactions' | 'onDelete' | 'onClose'>) {
  const [del, setDel] = useState<Del>({ phase: 'idle' })
  const run = (withTransactions: boolean) => {
    warning()
    setDel({ phase: 'checking' })
    onDelete(withTransactions).then(onClose, () => {
      error()
      setDel({ phase: 'offline' })
    })
  }

  if (del.phase === 'idle') {
    return (
      <PillButton
        variant="destructive"
        onClick={() => {
          setDel({ phase: 'checking' })
          countTransactions().then(
            (count) => setDel({ phase: 'ready', count }),
            () => setDel({ phase: 'offline' }),
          )
        }}
      >
        Delete rule
      </PillButton>
    )
  }
  if (del.phase === 'checking') return <PillButton disabled>Checking…</PillButton>
  if (del.phase === 'offline') {
    return (
      <>
        <p className="px-1 text-base text-muted-foreground">
          Can't delete right now (you may be offline). It has to check what the rule posted first.
        </p>
        <PillButton variant="secondary" onClick={() => setDel({ phase: 'idle' })}>
          Back
        </PillButton>
      </>
    )
  }
  return (
    <>
      <PillButton variant="destructive" onClick={() => run(false)}>
        {del.count > 0 ? 'Delete rule, keep past transactions' : 'Delete rule'}
      </PillButton>
      {del.count > 0 && (
        <PillButton variant="destructive" onClick={() => run(true)}>
          Delete rule and its {del.count} transaction{del.count === 1 ? '' : 's'}
        </PillButton>
      )}
      <PillButton variant="secondary" onClick={() => setDel({ phase: 'idle' })}>
        Keep
      </PillButton>
    </>
  )
}
