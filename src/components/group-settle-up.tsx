import { Money } from '@/components/money'
import { PendingSettlementRow } from '@/components/pending-settlement-row'
import { PillButton } from '@/components/pill-button'
import { shortDate } from '@/lib/date'
import type { Group, WithId } from '@/lib/db'
import type { Settlement, Transfer } from '@/lib/group-ledger'

type Props = {
  group: WithId<Group>
  meUid: string
  /** The payments that would square the group up (what nobody has paid yet). */
  transfers: readonly Transfer[]
  /** Payments made but not yet confirmed by the person who got them. */
  pending: readonly WithId<Settlement>[]
  /** Nothing is owed: there are expenses and every balance is zero. */
  allSettled: boolean
  onSettle: (t: Transfer) => void
  onConfirm: (s: WithId<Settlement>) => void
  /** Undo my payment, or say I didn't get theirs. */
  onTakeBack: (s: WithId<Settlement>) => void
}

/** Who should pay whom to square the group up (one tap records my payment), and the payments waiting to be confirmed. */
export function GroupSettleUp({ group, meUid, transfers, pending, allSettled, onSettle, onConfirm, onTakeBack }: Props) {
  const name = (uid: string) => (uid === meUid ? 'You' : group.members[uid]?.displayName || (group.memberUids.includes(uid) ? 'Someone' : 'Someone who left'))
  // "You pay Aiman" but "Aiman pays you".
  const line = (from: string, to: string, verb: 'pay' | 'paid') =>
    `${name(from)} ${verb === 'pay' && from !== meUid ? 'pays' : verb} ${to === meUid ? 'you' : name(to)}`

  return (
    <>
      {(transfers.length > 0 || allSettled) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-muted-foreground">Settle up</h2>
          {allSettled && transfers.length === 0 && (
            <p className="text-base text-muted-foreground">{pending.length > 0 ? 'All paid, waiting for confirmation.' : 'Everyone is settled up.'}</p>
          )}
          {transfers.map((t) => (
            <div key={`${t.from}-${t.to}`} className="flex min-h-14 items-center gap-3 rounded-2xl bg-card p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{line(t.from, t.to, 'pay')}</span>
                <Money sen={t.amount} className="block text-base text-muted-foreground" />
              </span>
              {t.from === meUid && (
                <PillButton size="pill-sm" onClick={() => onSettle(t)}>
                  I paid
                </PillButton>
              )}
            </div>
          ))}
        </section>
      )}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-muted-foreground">Waiting for confirmation</h2>
          {pending.map((s) => (
            <PendingSettlementRow
              key={s.id}
              title={line(s.from, s.to, 'paid')}
              subtitle={
                <>
                  <Money sen={s.amount} /> · {shortDate(s.date)}
                </>
              }
              onConfirm={s.to === meUid ? () => onConfirm(s) : undefined}
              takeBack={s.to === meUid || s.from === meUid ? { label: s.to === meUid ? 'Not received' : 'Undo', onClick: () => onTakeBack(s) } : undefined}
            />
          ))}
        </section>
      )}
    </>
  )
}
