import { DatePicker } from '@/components/date-picker'
import { Avatar } from '@/components/avatar'
import type { FriendName } from '@/lib/friends'
import { useRef, useState } from 'react'
import { Check, Plus, Share2, Trash2, X } from 'lucide-react'
import { AmountInput } from '@/components/amount-input'
import { CategoryChips } from '@/components/category-chips'
import { CurrencySelect } from '@/components/currency-select'
import { RateField } from '@/components/rate-field'
import { Money } from '@/components/money'
import { SheetActions } from '@/components/sheet-actions'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Section } from '@/components/section'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { success, warning } from '@/lib/haptics'
import { todayISO } from '@/lib/date'
import { useDisplayCurrency } from '@/lib/display-currency'
import { useRate } from '@/lib/fx'
import { HOME } from '@/lib/money'
import type { Category, Split, SplitDraft, WithId } from '@/lib/db'
import {
  addPerson,
  computeForm,
  formatPercent,
  formFromSplit,
  parsePercent,
  removePerson,
  type SplitFriend,
  splitProblem,
  type SplitForm,
  type SplitMode,
} from '@/lib/split'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  categories: readonly WithId<Category>[]
  /** Names used in past splits, most recent first, offered as one-tap additions. */
  suggestions: readonly string[]
  /** My friends on kira, offered first; a picked one keeps their photo. */
  friends: readonly ({ uid: string } & FriendName)[]
  /** Set to edit an existing split; omit to add. */
  initial?: WithId<Split>
  onSave: (draft: SplitDraft) => void
  onDelete?: () => void
  /** Shows a share button in the title row of an existing split (opens its receipt over the editor). */
  onShare?: () => void
  /** Ticks a person as paid back (or not) on an existing split; saved at once, not with the form. */
  onPaid?: (person: number, paid: boolean) => void
}

const modeOptions = [
  { value: 'itemized', label: 'Itemized' },
  { value: 'even', label: 'Even' },
  { value: 'exact', label: 'Exact' },
] as const satisfies readonly { value: SplitMode; label: string }[]

const chargeOptions = [
  { value: 'percent', label: 'Tax %' },
  { value: 'total', label: 'Receipt total' },
] as const satisfies readonly { value: 'percent' | 'total'; label: string }[]

/** A new split is filled in over these steps; editing one shows everything at once. */
const STEPS = ['Who', 'What', 'Review'] as const

/** A one-tap person suggestion: a filled pill with the avatar, so it reads as a button. */
const SUGGESTION = 'flex h-11 items-center gap-2 rounded-full bg-secondary pr-3 pl-1.5 text-base font-semibold'

const emptyForm: SplitForm = {
  mode: 'itemized',
  people: ['Me'],
  items: [],
  evenTotal: 0,
  exact: [0],
  // 6% = 6% SST, the usual restaurant bill.
  charges: { type: 'percent', value: 600 },
}

export function SplitEditor({ open, onClose, initial, onShare, ...rest }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit split' : 'New split'}
      size="full"
      action={
        initial &&
        onShare && (
          <PillButton variant="secondary" size="pill-sm" className="w-11 px-0" aria-label={`Share ${initial.title}`} onClick={onShare}>
            <Share2 className="size-5" />
          </PillButton>
        )
      }
    >
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ initial, categories, suggestions, friends, onSave, onDelete, onPaid, onClose }: Omit<Props, 'open'>) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [form, setForm] = useState<SplitForm>(initial ? formFromSplit(initial) : emptyForm)
  // Every amount on the split is in `currency`; my expense is converted to RM on save.
  const display = useDisplayCurrency()
  // An existing split without a currency is RM; a new one starts in the display currency.
  const [currency, setCurrency] = useState(initial ? (initial.currency ?? HOME) : display)
  const [manualRate, setManualRate] = useState<number | null>(initial?.rate ?? null)
  const fetched = useRate(currency, date)
  const rate = currency === HOME ? null : (manualRate ?? fetched.rate)
  const [percentText, setPercentText] = useState(initial?.charges.type === 'percent' ? formatPercent(initial.charges.value) : '6')
  const [newName, setNewName] = useState('')
  const choices = categories.filter((c) => c.kind === 'expense' && (!c.archived || c.id === initial?.categoryId))
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.categoryId ?? (choices.find((c) => c.name === 'Food') ?? choices[0])?.id ?? null,
  )

  // The percentage is typed as text; an unreadable value counts as 0 for the preview and blocks saving.
  const percent = parsePercent(percentText)
  const effective: SplitForm = form.charges.type === 'percent' ? { ...form, charges: { type: 'percent', value: percent ?? 0 } } : form
  const result = computeForm(effective)
  // What is missing on each step: Who (title, people, rate), What (items or amounts, tax), Review (category).
  const problems = [
    (!title.trim() ? 'Add a title.' : null) ??
      (form.people.length < 2 ? 'Add at least one other person.' : null) ??
      (currency !== HOME && !rate ? `Enter the rate for ${currency}.` : null),
    splitProblem(effective) ??
      (form.mode !== 'exact' && form.charges.type === 'percent' && percent === null ? 'Enter a tax percentage from 0 to 100.' : null),
    !categoryId ? 'Pick a category for your share.' : null,
  ]
  const problem = problems.find((p) => p !== null) ?? null
  const stepped = !initial
  const [step, setStep] = useState(0)
  const top = useRef<HTMLParagraphElement>(null)
  const go = (n: number) => {
    setStep(n)
    top.current?.scrollIntoView({ block: 'start' })
  }
  const show = (n: number) => !stepped || step === n
  const last = !stepped || step === STEPS.length - 1

  // Every update reads the latest form (not the one this render closed over), so two quick taps never lose one.
  const patch = (p: Partial<SplitForm> | ((f: SplitForm) => Partial<SplitForm>)) =>
    setForm((f) => ({ ...f, ...(typeof p === 'function' ? p(f) : p) }))
  const setItem = (i: number, p: Partial<SplitForm['items'][number]>) =>
    patch((f) => ({ items: f.items.map((item, j) => (j === i ? { ...item, ...p } : item)) }))
  const togglePerson = (i: number, person: number) =>
    patch((f) => ({
      items: f.items.map((item, j) =>
        j !== i
          ? item
          : {
              ...item,
              people: item.people.includes(person)
                ? item.people.filter((p) => p !== person)
                : [...item.people, person].toSorted((a, b) => a - b),
            },
      ),
    }))

  const name = newName.trim()
  const taken = (n: string) => form.people.some((p) => p.toLowerCase() === n.toLowerCase())
  const nameTaken = taken(name)
  const add = (n: string, friend?: SplitFriend) => {
    setForm((f) => addPerson(f, n, friend))
    setNewName('')
  }
  // Friends not on the split yet (a name already used, typed or picked, can't be added twice).
  const picked = new Set(Object.values(form.friends ?? {}).map((f) => f.uid))
  const friendChoices = friends.filter((f) => !picked.has(f.uid) && f.displayName && !taken(f.displayName))
  const friendNames = new Set(friends.map((f) => f.displayName.toLowerCase()))
  const nameChoices = suggestions.filter((s) => !taken(s) && !friendNames.has(s.toLowerCase()))

  return (
    <div className="flex flex-col gap-5 pb-1">
      {stepped && (
        <p ref={top} className="px-1 text-base text-muted-foreground">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
      )}
      {show(0) && (
        <>
          <div className="flex flex-col gap-2">
            <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Dinner at Sushi King)" aria-label="Title" maxLength={60} />
            <div className="flex gap-2">
              <CurrencySelect
                value={currency}
                onChange={(c) => {
                  setCurrency(c)
                  setManualRate(null)
                }}
              />
              <div className="min-w-0 flex-1">
                <DatePicker value={date} onChange={setDate} aria-label="Date" />
              </div>
            </div>
            {currency !== HOME && (
              <RateField
                key={currency}
                currency={currency}
                value={manualRate}
                onChange={setManualRate}
                fetched={fetched}
                amount={result.shares[0].total}
                amountLabel="My share"
              />
            )}
          </div>

          <Section title="People">
            <div className="flex flex-wrap gap-2">
              {form.people.map((p, i) => (
                <span key={p} className={cn('flex h-11 items-center gap-2 rounded-full bg-secondary text-base font-semibold', i === 0 ? 'px-4' : form.friends?.[i] ? 'pl-1.5' : 'pl-4')}>
                  {form.friends?.[i] && <Avatar photoURL={form.friends[i].photoURL} name={p} className="size-8 text-sm" />}
                  {p}
                  {i > 0 && (
                    <button
                      type="button"
                      aria-label={`Remove ${p}`}
                      onClick={() => setForm((f) => removePerson(f, i))}
                      className="flex size-11 items-center justify-center rounded-full text-muted-foreground"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <TextField
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name && !nameTaken) add(name)
                }}
                placeholder="Add a person"
                aria-label="Add a person"
                maxLength={20}
              />
              <PillButton size="pill-sm" disabled={!name || nameTaken} onClick={() => add(name)}>
                Add
              </PillButton>
            </div>
            {friendChoices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {friendChoices.map((f) => (
                  <button
                    key={f.uid}
                    type="button"
                    aria-label={`+ ${f.displayName}`}
                    onClick={() => add(f.displayName, { uid: f.uid, photoURL: f.photoURL })}
                    className={SUGGESTION}
                  >
                    <Avatar photoURL={f.photoURL} name={f.displayName} className="size-8 text-sm" />
                    {f.displayName}
                    <Plus className="size-4 text-muted-foreground" aria-hidden />
                  </button>
                ))}
              </div>
            )}
            {nameChoices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nameChoices
                  .slice(0, 8)
                  .map((s) => (
                    <button key={s} type="button" aria-label={`+ ${s}`} onClick={() => add(s)} className={SUGGESTION}>
                      <Avatar name={s} className="size-8 text-sm" />
                      {s}
                      <Plus className="size-4 text-muted-foreground" aria-hidden />
                    </button>
                  ))}
              </div>
            )}
          </Section>
        </>
      )}

      {show(1) && (
        <>
          <Segmented options={modeOptions} value={form.mode} onChange={(mode) => patch({ mode })} />

          {form.mode === 'itemized' && (
            <Section title="Items">
              {form.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl bg-secondary p-3">
                  <div className="flex items-center gap-2">
                    <TextField
                      value={item.name ?? ''}
                      onChange={(e) => setItem(i, { name: e.target.value })}
                      placeholder="Item (optional)"
                      aria-label="Item name"
                      maxLength={40}
                      className="bg-card"
                    />
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => patch((f) => ({ items: f.items.filter((_, j) => j !== i) }))}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </div>
                  <AmountInput currency={currency} size="sm" value={item.amount} onChange={(amount) => setItem(i, { amount })} />
                  <div className="flex flex-wrap gap-2">
                    {form.people.map((p, person) => {
                      const on = item.people.includes(person)
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={on}
                          onClick={() => togglePerson(i, person)}
                          className={cn(
                            'h-11 rounded-full px-4 text-base font-semibold',
                            on ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
                          )}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <PillButton
                variant="secondary"
                size="pill-sm"
                // A new item starts shared by everyone; tap names to take people off it.
                onClick={() => patch((f) => ({ items: [...f.items, { amount: 0, people: f.people.map((_, i) => i) }] }))}
              >
                Add item
              </PillButton>
            </Section>
          )}

          {form.mode === 'even' && (
            <Section title="Total bill, shared equally">
              <AmountInput currency={currency} size="sm" value={form.evenTotal} onChange={(evenTotal) => patch({ evenTotal })} />
            </Section>
          )}

          {form.mode === 'exact' && (
            <Section title="What each person owes">
              {form.people.map((p, i) => (
                <div key={p} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{p}</span>
                  <AmountInput
                    currency={currency}
                    size="sm"
                    value={form.exact[i]}
                    onChange={(a) => patch((f) => ({ exact: f.exact.map((x, j) => (j === i ? a : x)) }))}
                    className="justify-end"
                  />
                </div>
              ))}
            </Section>
          )}

          {form.mode !== 'exact' && (
            <Section title="Tax and service charge">
              <Segmented
                options={chargeOptions}
                value={form.charges.type}
                onChange={(type) => patch({ charges: type === 'percent' ? { type, value: percent ?? 600 } : { type, value: 0 } })}
              />
              {form.charges.type === 'percent' ? (
                <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                  <span className="min-w-0 flex-1 text-base font-semibold">Tax rate</span>
                  <input
                    inputMode="decimal"
                    value={percentText}
                    onChange={(e) => setPercentText(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
                    aria-label="Tax percentage"
                    className="min-h-11 w-20 bg-transparent text-right font-heading text-2xl font-extrabold tabular-nums outline-none"
                  />
                  <span className="font-heading text-2xl font-bold text-muted-foreground">%</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                    <span className="min-w-0 flex-1 text-base font-semibold">Receipt total</span>
                    <AmountInput currency={currency} size="sm" value={form.charges.value} onChange={(value) => patch({ charges: { type: 'total', value } })} className="justify-end" />
                  </div>
                  <p className="px-1 text-base text-muted-foreground">
                    The total on the receipt. Everyone's share is scaled so the bill adds up exactly.
                  </p>
                </>
              )}
              <div className="flex items-baseline justify-between border-t border-border px-1 pt-2">
                <span className="text-base font-semibold">Total</span>
                <Money currency={currency} sen={result.total} className="font-heading text-xl font-bold" />
              </div>
            </Section>
          )}

        </>
      )}

      {show(2) && (
        <>
          <Section title="Who pays what">
            {form.people.map((p, i) => {
              const s = result.shares[i]
              // Only for the people the saved split has at this position, who actually owe something.
              const tickable = !!initial && !!onPaid && i > 0 && s.total > 0 && initial.people[i] === p
              const paid = !!initial?.paid?.[i]
              return (
                <div key={p} className={cn('flex gap-3 px-1', tickable ? 'items-center' : 'items-baseline')}>
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{p}</span>
                  {s.charge !== 0 && (
                    <span className="text-base text-muted-foreground tabular-nums">
                      <Money currency={currency} sen={s.subtotal} /> + <Money currency={currency} sen={s.charge} />
                    </span>
                  )}
                  <Money currency={currency} sen={s.total} className="text-base font-semibold" />
                  {tickable && (
                    <PillButton
                      variant={paid ? 'default' : 'secondary'}
                      size="pill-sm"
                      aria-pressed={paid}
                      aria-label={`${p} paid`}
                      onClick={() => onPaid(i, !paid)}
                    >
                      {paid && <Check className="size-5" aria-hidden />}
                      Paid
                    </PillButton>
                  )}
                </div>
              )
            })}
            <div className="flex items-baseline justify-between border-t border-border px-1 pt-2">
              <span className="text-base font-semibold">Total</span>
              <Money currency={currency} sen={result.total} className="font-heading text-xl font-bold" />
            </div>
          </Section>

          <Section title="Category for my share">
            <CategoryChips categories={choices} value={categoryId} onChange={setCategoryId} />
          </Section>

        </>
      )}

      <SheetActions
        label={last ? 'Save' : 'Next'}
        extras={stepped && step > 0 ? [{ label: 'Back', onClick: () => go(step - 1) }] : undefined}
        disabled={last ? !!problem : !!problems[step]}
        hint={last ? problem : problems[step]}
        onSave={() => {
          if (!last) return go(step + 1)
          if (problem || !categoryId) return
          success()
          onSave({ title: title.trim(), date, categoryId, form: effective, ...(rate ? { currency, rate } : {}) })
          onClose()
        }}
        onDelete={
          initial && onDelete
            ? () => {
                warning()
                onDelete()
                onClose()
              }
            : undefined
        }
        deleteLabel="Delete split"
        // Undo on the toast replaces asking first.
        confirmDelete={false}
      />
    </div>
  )
}
