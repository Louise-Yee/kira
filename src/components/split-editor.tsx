import { DatePicker } from '@/components/date-picker'
import { Avatar } from '@/components/avatar'
import type { FriendName } from '@/lib/friends'
import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { AmountInput } from '@/components/amount-input'
import { CategoryPicker } from '@/components/category-picker'
import { Money } from '@/components/money'
import { SheetActions } from '@/components/sheet-actions'
import { PillButton } from '@/components/pill-button'
import { ScanReceiptButton } from '@/components/scan-receipt-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { success, warning } from '@/lib/haptics'
import { todayISO } from '@/lib/date'
import { scannedTotal, type ScannedReceipt } from '@/lib/receipt-parse'
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

const emptyForm: SplitForm = {
  mode: 'itemized',
  people: ['Me'],
  items: [],
  evenTotal: 0,
  exact: [0],
  // 6% = 6% SST, the usual restaurant bill.
  charges: { type: 'percent', value: 600 },
}

export function SplitEditor({ open, onClose, initial, ...rest }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Edit split' : 'New split'}
      size="full"
    >
      {/* Mounted only while open, so the form starts fresh each time. */}
      <Form initial={initial} onClose={onClose} {...rest} />
    </Sheet>
  )
}

function Form({ initial, categories, suggestions, friends, onSave, onDelete, onClose }: Omit<Props, 'open'>) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [form, setForm] = useState<SplitForm>(initial ? formFromSplit(initial) : emptyForm)
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
  const problem =
    splitProblem(effective) ??
    (!title.trim() ? 'Add a title.' : null) ??
    (form.mode !== 'exact' && form.charges.type === 'percent' && percent === null ? 'Enter a tax percentage from 0 to 100.' : null) ??
    (!categoryId ? 'Pick a category for your share.' : null)

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

  // A scan replaces the items (each shared by everyone until people are tapped on) and sets the receipt total.
  const applyScan = (r: ScannedReceipt) => {
    const total = scannedTotal(r)
    patch((f) => ({
      mode: 'itemized',
      items: r.items.map((i) => ({ name: i.name, amount: i.amount, people: f.people.map((_, p) => p) })),
      ...(total === null ? {} : { charges: { type: 'total', value: total } }),
    }))
  }

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
      <div className="flex flex-col gap-2">
        <TextField value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Dinner at Sushi King)" aria-label="Title" maxLength={60} />
        <DatePicker value={date} onChange={setDate} aria-label="Date" />
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
                onClick={() => add(f.displayName, { uid: f.uid, photoURL: f.photoURL })}
                className="flex h-11 items-center gap-2 rounded-full border border-dashed border-border pr-4 pl-1.5 text-base text-muted-foreground"
              >
                <Avatar photoURL={f.photoURL} name={f.displayName} className="size-8 text-sm" />+ {f.displayName}
              </button>
            ))}
          </div>
        )}
        {nameChoices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nameChoices
              .slice(0, 8)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="h-11 rounded-full border border-dashed border-border px-4 text-base text-muted-foreground"
                >
                  + {s}
                </button>
              ))}
          </div>
        )}
      </Section>

      <Segmented options={modeOptions} value={form.mode} onChange={(mode) => patch({ mode })} />

      {form.mode === 'itemized' && (
        <Section title="Items">
          <ScanReceiptButton onScanned={applyScan} />
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
              <AmountInput size="sm" value={item.amount} onChange={(amount) => setItem(i, { amount })} />
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
          <AmountInput size="sm" value={form.evenTotal} onChange={(evenTotal) => patch({ evenTotal })} />
        </Section>
      )}

      {form.mode === 'exact' && (
        <Section title="What each person owes">
          {form.people.map((p, i) => (
            <div key={p} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{p}</span>
              <AmountInput
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
            <div className="flex items-center gap-2">
              <TextField
                inputMode="decimal"
                value={percentText}
                onChange={(e) => setPercentText(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
                aria-label="Tax percentage"
                className="w-28 text-center"
              />
              <span className="text-base font-semibold">%</span>
            </div>
          ) : (
            <>
              <AmountInput size="sm" value={form.charges.value} onChange={(value) => patch({ charges: { type: 'total', value } })} />
              <p className="px-1 text-base text-muted-foreground">
                The total on the receipt. Everyone's share is scaled so the bill adds up exactly.
              </p>
            </>
          )}
          <div className="flex items-baseline justify-between px-1 pt-1">
            <span className="text-base text-muted-foreground">Total</span>
            <Money sen={result.total} className="font-heading text-xl font-bold" />
          </div>
        </Section>
      )}

      <Section title="Who pays what">
        {form.people.map((p, i) => {
          const s = result.shares[i]
          return (
            <div key={p} className="flex items-baseline gap-3 px-1">
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{p}</span>
              {s.charge !== 0 && (
                <span className="text-base text-muted-foreground tabular-nums">
                  <Money sen={s.subtotal} /> + <Money sen={s.charge} />
                </span>
              )}
              <Money sen={s.total} className="text-base font-semibold" />
            </div>
          )
        })}
        <div className="flex items-baseline justify-between border-t border-border px-1 pt-2">
          <span className="text-base font-semibold">Total</span>
          <Money sen={result.total} className="font-heading text-xl font-bold" />
        </div>
      </Section>

      <Section title="Category for my share">
        <CategoryPicker categories={choices} value={categoryId} onChange={setCategoryId} />
      </Section>

      {problem && <p className="px-1 text-base text-muted-foreground">{problem}</p>}
      <SheetActions
        disabled={!!problem}
        onSave={() => {
          if (problem || !categoryId) return
          success()
          onSave({ title: title.trim(), date, categoryId, form: effective })
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-1 text-base font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}
