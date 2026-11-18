import { Fragment, useEffect, useRef, useState } from 'react'
import { ReceiptText, Users } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Fab } from '@/components/fab'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { ReceiptSheet } from '@/components/receipt-sheet'
import { Segmented } from '@/components/segmented'
import { SplitEditor } from '@/components/split-editor'
import { SwipeRow } from '@/components/swipe-row'
import { addDays, dayLabel, monthLabel } from '@/lib/date'
import {
  createShare,
  deleteSplit,
  saveSplit,
  useCategories,
  useOlderSplits,
  useRecentSplits,
  useSettings,
  SPLITS_PAGE,
  type Split,
  type WithId,
} from '@/lib/db'
import type { AppUser } from '@/lib/firebase'

export function SplitScreen({ user, today }: { user: AppUser; today: string }) {
  const since = addDays(today, -30)
  const [tab, setTab] = useState<'recent' | 'history'>('recent')
  const [count, setCount] = useState(SPLITS_PAGE)
  const recent = useRecentSplits(user.uid, since)
  const older = useOlderSplits(user.uid, since, count, tab === 'history')
  const splits = tab === 'recent' ? recent : older
  // Infinite scroll: when the sentinel scrolls into view and the last page was full, ask for another page.
  // The effect re-runs per page, so a sentinel that is still visible fires again.
  const sentinel = useRef<HTMLDivElement>(null)
  const more = tab === 'history' && older !== undefined && older.length >= count
  useEffect(() => {
    const el = sentinel.current
    if (!more || !el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setCount((c) => c + SPLITS_PAGE))
    io.observe(el)
    return () => io.disconnect()
  }, [more, older?.length])
  const categories = useCategories(user.uid) ?? []
  const qr = useSettings(user.uid)?.tngQr
  // `open` and `split` are separate so a sheet keeps its content while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; split?: WithId<Split> }>({ open: false })
  const [receipt, setReceipt] = useState<{ open: boolean; split?: WithId<Split> }>({ open: false })
  // The receipt sheet shows the live split, so a link made a moment ago is found again on the next tap.
  const receiptSplit = [...(recent ?? []), ...(older ?? [])].find((s) => s.id === receipt.split?.id) ?? receipt.split
  const open = (split?: WithId<Split>) => setSheet({ open: true, split })

  // Names from past splits (newest first, without me), offered as one-tap additions.
  const suggestions = [...new Set([...(recent ?? []), ...(older ?? [])].flatMap((s) => s.people.slice(1)))]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Split</h1>

      <Segmented
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {splits?.length === 0 &&
        (tab === 'recent' ? (
          <EmptyState
            icon={ReceiptText}
            text="No splits in the last 30 days. Your own share of a bill lands in your expenses."
            action={{ label: 'New split', onClick: () => open() }}
          />
        ) : (
          <EmptyState icon={ReceiptText} text="No older splits yet." />
        ))}
      <div className="flex flex-col gap-2">
        {splits?.map((s, i) => (
          <Fragment key={s.id}>
            {tab === 'history' && (i === 0 || s.date.slice(0, 7) !== splits[i - 1].date.slice(0, 7)) && (
              <h2 className="px-1 pt-3 text-base font-semibold text-muted-foreground">{monthLabel(s.date.slice(0, 7))}</h2>
            )}
            <SwipeRow label="Share" onSwipe={() => setReceipt({ open: true, split: s })}>
              <ListRow
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
            </SwipeRow>
          </Fragment>
        ))}
        {more && <div ref={sentinel} className="h-8" />}
      </div>

      <Fab label="Add" onClick={() => open()} />
      <SplitEditor
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        suggestions={suggestions}
        initial={sheet.split}
        onSave={(draft) => saveSplit(user.uid, draft, sheet.split)}
        onDelete={() => sheet.split && deleteSplit(user.uid, sheet.split)}
        onShare={() => {
          setReceipt({ open: true, split: sheet.split })
          setSheet((s) => ({ ...s, open: false }))
        }}
      />
      <ReceiptSheet
        open={receipt.open}
        onClose={() => setReceipt((r) => ({ ...r, open: false }))}
        split={receiptSplit}
        qr={qr}
        onCreateLink={(split, person) => createShare(user.uid, split, person)}
      />
    </div>
  )
}
