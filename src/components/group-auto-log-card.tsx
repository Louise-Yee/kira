import { CategoryPicker } from '@/components/category-picker'
import { Toggle } from '@/components/toggle'
import { todayISO, longDate } from '@/lib/date'
import type { Category, GroupLog, WithId } from '@/lib/db'

type Props = {
  /** My setting for this group, if I ever turned it on or off. */
  log: GroupLog | undefined
  /** All my categories; the expense ones that aren't archived can be picked. */
  categories: readonly WithId<Category>[]
  onChange: (log: GroupLog) => void
}

/** Whether my share of this group's expenses is added to my own transactions, and under which category. */
export function GroupAutoLogCard({ log, categories, onChange }: Props) {
  const choices = categories.filter((c) => c.kind === 'expense' && (!c.archived || c.id === log?.categoryId))
  const categoryId = log?.categoryId ?? choices.find((c) => c.name === 'Other')?.id ?? choices[0]?.id ?? ''
  // On by default: a group with no setting yet gets one turned on (useDefaultGroupLogs).
  const enabled = log ? log.enabled : true
  const save = (patch: Partial<GroupLog>) =>
    onChange({ enabled, categoryId, from: log?.from ?? todayISO(), ...patch, updatedAt: Date.now() })

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      {/* Turning it on starts from today, so old expenses never turn up in my transactions. */}
      <Toggle label="Count my share in my spending" checked={enabled} disabled={!categoryId} onChange={(on) => save(on ? { enabled: true, from: todayISO() } : { enabled: false })} />
      <p className="px-1 text-base text-muted-foreground">
        {enabled && log ? `Adds your share of each expense from ${longDate(log.from)} to your own spending.` : 'Adds your share of each expense to your own spending.'}
      </p>
      {enabled && (
        <>
          <CategoryPicker categories={choices} value={categoryId} onChange={(id) => save({ categoryId: id })} />
          <p className="px-1 text-base text-muted-foreground">Only new expenses use a new category.</p>
        </>
      )}
    </section>
  )
}
