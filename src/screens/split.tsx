import { useState } from 'react'
import { ReceiptText, Users } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Fab } from '@/components/fab'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { SplitEditor } from '@/components/split-editor'
import { dayLabel } from '@/lib/date'
import { deleteSplit, saveSplit, useCategories, useSplits, type Split, type WithId } from '@/lib/db'
import type { AppUser } from '@/lib/firebase'

export function SplitScreen({ user, today }: { user: AppUser; today: string }) {
  const splits = useSplits(user.uid)
  const categories = useCategories(user.uid) ?? []
  // `open` and `split` are separate so the sheet keeps its title while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; split?: WithId<Split> }>({ open: false })
  const open = (split?: WithId<Split>) => setSheet({ open: true, split })

  // Names from past splits (newest first, without me), offered as one-tap additions.
  const suggestions = [...new Set((splits ?? []).flatMap((s) => s.people.slice(1)))]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Split</h1>

      {splits?.length === 0 && (
        <EmptyState
          icon={ReceiptText}
          text="Split a bill between friends. Your own share lands in your expenses."
          action={{ label: 'New split', onClick: () => open() }}
        />
      )}
      <div className="flex flex-col gap-2">
        {splits?.map((s) => (
          <ListRow
            key={s.id}
            icon={
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                <Users className="size-5" aria-hidden />
              </span>
            }
            title={s.title}
            subtitle={`${dayLabel(s.date, today)} · ${s.people.length} people`}
            trailing={<Money sen={s.shares[0].total} className="text-base font-semibold" />}
            onClick={() => open(s)}
          />
        ))}
      </div>

      <Fab label="Add" onClick={() => open()} />
      <SplitEditor
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        suggestions={suggestions}
        initial={sheet.split}
        onSave={(draft) => saveSplit(user.uid, draft, sheet.split)}
        onDelete={() => sheet.split && deleteSplit(user.uid, sheet.split.id)}
      />
    </div>
  )
}
