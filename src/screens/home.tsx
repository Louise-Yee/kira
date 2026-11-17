import { useState } from 'react'
import { deleteTransaction, saveTransaction, useCategories, useMonth, useMonths, type Transaction, type WithId } from '@/lib/db'
import { monthlyTotals } from '@/lib/chart-data'
import { inTrendWindow, trendMonths } from '@/lib/date'
import type { AppUser } from '@/lib/firebase'
import { Fab } from '@/components/fab'
import { TransactionSheet } from '@/components/transaction-sheet'
import { MonthView } from '@/screens/month-view'

/** `today` and `ym` live in the shell so the sync indicator watches the same months as this screen. */
export function Home({ user, today, ym, onYm }: { user: AppUser; today: string; ym: string; onYm: (ym: string) => void }) {
  const categories = useCategories(user.uid) ?? []
  const currentYm = today.slice(0, 7)
  // One listener covers the trend window; a month older than that falls back to its own listener.
  const yms = trendMonths(currentYm)
  const windowTx = useMonths(user.uid, yms[0], currentYm)
  const inWindow = inTrendWindow(ym, currentYm)
  const olderTx = useMonth(user.uid, ym, !inWindow)
  const transactions = inWindow ? windowTx?.filter((t) => t.date.startsWith(ym)) : olderTx
  // `open` and `tx` are separate so the sheet keeps its title while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; tx?: WithId<Transaction> }>({ open: false })

  return (
    <>
      <MonthView
        name={user.displayName?.split(' ')[0] ?? 'there'}
        ym={ym}
        today={today}
        onMonthChange={onYm}
        transactions={transactions}
        categories={categories}
        trend={windowTx && monthlyTotals(windowTx, yms)}
        onAdd={() => setSheet({ open: true })}
        onEdit={(tx) => setSheet({ open: true, tx })}
      />
      <Fab label="Add" onClick={() => setSheet({ open: true })} />
      <TransactionSheet
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        categories={categories}
        initial={sheet.tx}
        onSave={(draft) => saveTransaction(user.uid, draft, sheet.tx)}
        onDelete={() => sheet.tx && deleteTransaction(user.uid, sheet.tx.id)}
      />
    </>
  )
}
