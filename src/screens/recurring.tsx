import { useState, type ReactNode } from 'react'
import { Repeat } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { Fab } from '@/components/fab'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { RecurringSheet } from '@/components/recurring-sheet'
import { categoryOrOther } from '@/lib/category-lookup'
import { shortDate } from '@/lib/date'
import {
  countRecurringTransactions,
  deleteRecurring,
  saveRecurring,
  useCategories,
  useRecurring,
  type Recurring,
  type WithId,
} from '@/lib/db'
import type { AppUser } from '@/lib/firebase'
import { signed } from '@/lib/month-summary'
import { describeFrequency, nextDate } from '@/lib/recurrence'

const next = (r: Recurring) => nextDate(r, r.posted)

export function RecurringScreen({ user }: { user: AppUser }) {
  const rules = useRecurring(user.uid)
  const categories = useCategories(user.uid) ?? []
  const byId = new Map(categories.map((c) => [c.id, c]))
  // `open` and `rule` are separate so the sheet keeps its title while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; rule?: WithId<Recurring> }>({ open: false })
  const open = (rule?: WithId<Recurring>) => setSheet({ open: true, rule })

  const active = (rules ?? []).filter((r) => !r.paused && next(r)).toSorted((a, b) => (next(a) ?? '').localeCompare(next(b) ?? ''))
  const inactive = (rules ?? []).filter((r) => r.paused || !next(r))

  const row = (r: WithId<Recurring>) => {
    const cat = categoryOrOther(byId, r.categoryId, r.kind)
    const upcoming = next(r)
    const status = !upcoming ? 'ended' : r.paused ? 'paused' : `next ${shortDate(upcoming)}`
    return (
      <ListRow
        key={r.id}
        icon={<CategoryIcon name={cat?.icon ?? 'other'} color={cat?.color ?? 'cat-1'} tile />}
        title={r.note || cat?.name || 'Unknown category'}
        subtitle={`${describeFrequency(r.freq, r.interval)} · ${status}`}
        trailing={<Money sen={signed(r)} sign className="text-base font-semibold" />}
        onClick={() => open(r)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Recurring</h1>

      {rules?.length === 0 && (
        <EmptyState
          icon={Repeat}
          text="Rent, salary, subscriptions: add them once and they post themselves."
          action={{ label: 'Add recurring', onClick: () => open() }}
        />
      )}
      {active.length > 0 && <Section title="Active">{active.map(row)}</Section>}
      {inactive.length > 0 && <Section title="Paused and ended">{inactive.map(row)}</Section>}

      <Fab label="Add" onClick={() => open()} />
      <RecurringSheet
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        initial={sheet.rule}
        onSave={(draft) => saveRecurring(user.uid, draft, sheet.rule)}
        countTransactions={() => (sheet.rule ? countRecurringTransactions(user.uid, sheet.rule.id) : Promise.resolve(0))}
        onDelete={(withTx) => (sheet.rule ? deleteRecurring(user.uid, sheet.rule.id, withTx) : Promise.resolve())}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-base font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}
