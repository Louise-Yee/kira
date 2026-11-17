import { useState } from 'react'
import { deleteTransaction, saveTransaction, useCategories, useMonth, type Transaction, type WithId } from '@/lib/db'
import { todayISO } from '@/lib/date'
import type { AppUser } from '@/lib/firebase'
import { Fab } from '@/components/fab'
import { TransactionSheet } from '@/components/transaction-sheet'
import { MonthView } from '@/screens/month-view'

export function Home({ user }: { user: AppUser }) {
  // ponytail: read once per mount, so "Today" goes stale if the app stays open past midnight.
  const [today] = useState(todayISO)
  const [ym, setYm] = useState(today.slice(0, 7))
  const categories = useCategories(user.uid) ?? []
  const transactions = useMonth(user.uid, ym)
  // `open` and `tx` are separate so the sheet keeps its title while it slides out.
  const [sheet, setSheet] = useState<{ open: boolean; tx?: WithId<Transaction> }>({ open: false })

  return (
    <>
      <MonthView
        name={user.displayName?.split(' ')[0] ?? 'there'}
        ym={ym}
        today={today}
        onMonthChange={setYm}
        transactions={transactions}
        categories={categories}
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
