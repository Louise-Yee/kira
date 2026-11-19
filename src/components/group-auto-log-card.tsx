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
  const enabled = !!log?.enabled
  const save = (patch: Partial<GroupLog>) =>
    onChange({ enabled, categoryId, from: log?.from ?? todayISO(), ...patch, updatedAt: Date.now() })

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      {/* Turning it on starts from today, so old expenses never turn up in my transactions. */}
      <Toggle label="Add my share to my transactions" checked={enabled} disabled={!categoryId} onChange={(on) => save(on ? { enabled: true, from: todayISO() } : { enabled: false })} />
      <p className="px-1 text-base text-muted-foreground">
        {enabled && log
          ? `From ${longDate(log.from)}, each expense you are part of becomes one transaction of your share. Edit its category there any time.`
          : 'Each expense you are part of becomes one transaction of your share, so your own spending stays right.'}
      </p>
      {enabled && <CategoryPicker categories={choices} value={categoryId} onChange={(id) => save({ categoryId: id })} />}
    </section>
  )
}
