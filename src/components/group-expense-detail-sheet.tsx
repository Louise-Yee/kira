import { Money } from '@/components/money'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { longDate, shortDate, todayISO } from '@/lib/date'
import type { Group, WithId } from '@/lib/db'
import { involvesOnly, type GroupExpense } from '@/lib/group-ledger'
import { warning } from '@/lib/haptics'

type Props = {
  open: boolean
  onClose: () => void
  group: WithId<Group>
  meUid: string
  /** The expense to show; kept after closing so the sheet keeps its content while it slides out. */
  expense: WithId<GroupExpense> | undefined
  onEdit: (expense: WithId<GroupExpense>) => void
  onDelete: (expense: WithId<GroupExpense>) => void
}

/** Everything about one expense: who paid, each person's share, and every earlier version, for checking back with friends. */
export function GroupExpenseDetailSheet({ open, onClose, group, meUid, expense, onEdit, onDelete }: Props) {
  const nameOf = (uid: string) => group.members[uid]?.displayName || (group.memberUids.includes(uid) ? 'Someone' : 'Someone who left')
  const author = expense?.createdBy === meUid
  // The rules only let an expense name current members, so one that names someone who left can't be edited.
  const editable = !!expense && author && involvesOnly(expense, group.memberUids)
  const canDelete = !!expense && (author || group.ownerUid === meUid)

  return (
    <Sheet open={open} onClose={onClose} title={expense?.title ?? ''}>
      {expense && (
        <div className="flex flex-col gap-4 pb-1">
          <p className="text-base text-muted-foreground">
            {longDate(expense.date)} · paid by {nameOf(expense.paidBy)}
          </p>
          <Money sen={expense.amount} className="font-heading text-4xl font-extrabold" />

          <section className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-muted-foreground">Split</h3>
            {Object.entries(expense.shares).map(([uid, share]) => (
              <div key={uid} className="flex min-h-11 items-center justify-between gap-3 text-base">
                <span className="min-w-0 truncate">{nameOf(uid)}</span>
                <Money sen={share} className="font-semibold" />
              </div>
            ))}
          </section>

          <p className="text-base text-muted-foreground">Added by {nameOf(expense.createdBy)}.</p>
          {author && !editable && (
            <p className="text-base text-muted-foreground">Someone in this expense has left the group, so it can't be edited. Delete it and add it again to change it.</p>
          )}

          {!!expense.previous?.length && (
            <section className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-muted-foreground">Earlier versions</h3>
              {expense.previous.map((v) => (
                <div key={v.at} className="flex items-center justify-between gap-3 text-base text-muted-foreground">
                  <span className="min-w-0 truncate">
                    Before {nameOf(v.by)}'s edit on {shortDate(todayISO(new Date(v.at)))}: {v.title}
                  </span>
                  <Money sen={v.amount} className="shrink-0" />
                </div>
              ))}
            </section>
          )}

          <SheetActions
            label={editable ? 'Edit' : 'Close'}
            onSave={() => (editable ? onEdit(expense) : onClose())}
            onDelete={
              canDelete
                ? () => {
                    warning()
                    onDelete(expense)
                    onClose()
                  }
                : undefined
            }
            deleteLabel="Delete expense"
          />
        </div>
      )}
    </Sheet>
  )
}
