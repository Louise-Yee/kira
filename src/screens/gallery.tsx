import { useState } from 'react'
import { Inbox } from 'lucide-react'
import { AmountInput } from '@/components/amount-input'
import { CategoryIcon } from '@/components/category-icon'
import { CategoryPicker } from '@/components/category-picker'
import { EmptyState } from '@/components/empty-state'
import { Fab } from '@/components/fab'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { TransactionSheet } from '@/components/transaction-sheet'
import { defaultCategories } from '@/lib/default-categories'
import type { Category, Transaction, TransactionDraft, WithId } from '@/lib/db'
import { categoryIconNames } from '@/lib/category-icons'

const cats = [
  { id: 'food', name: 'Food', icon: 'food', color: 'cat-1' },
  { id: 'transport', name: 'Transport', icon: 'transport', color: 'cat-6' },
  { id: 'rent', name: 'Rent', icon: 'rent', color: 'cat-4' },
  { id: 'coffee', name: 'Coffee', icon: 'coffee', color: 'cat-2' },
]

const fakeCategories: WithId<Category>[] = defaultCategories.map((c) => (c.id === 'bills' ? { ...c, archived: true } : c))
const editing: WithId<Transaction> = {
  id: 'tx1',
  kind: 'expense',
  amount: 1250,
  categoryId: 'bills', // archived on purpose: still shown while editing
  date: '2026-11-03',
  note: 'Electric',
  recurringId: 'r1',
  createdAt: 1,
  updatedAt: 1,
}

// Temporary, dev only: open /?gallery to try the shared components. Removed once real screens use them (P1.5).
export function Gallery() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState(0)
  const [cat, setCat] = useState<string | null>(null)
  const [total, setTotal] = useState(123450)
  const [taps, setTaps] = useState(0)
  const [tx, setTx] = useState<'add' | 'edit' | null>(null)
  const [saved, setSaved] = useState<TransactionDraft | null>(null)
  const [deletes, setDeletes] = useState(0)
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-5 pb-40">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Gallery</h1>
      <Segmented
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        value={kind}
        onChange={setKind}
      />
      <p data-testid="kind">kind: {kind}</p>
      <AmountInput value={amount} onChange={setAmount} />
      <p data-testid="amount">sen: {amount}</p>
      <PillButton onClick={() => setOpen(true)}>Open sheet</PillButton>
      <PillButton variant="secondary">Secondary</PillButton>

      <CategoryPicker categories={cats} value={cat} onChange={setCat} />
      <p data-testid="cat">category: {cat ?? 'none'}</p>

      <div data-testid="icons" className="flex flex-wrap gap-2">
        {categoryIconNames.map((n, i) => (
          <CategoryIcon key={n} name={n} color={`cat-${(i % 8) + 1}`} tile />
        ))}
      </div>

      <ListRow
        icon={<CategoryIcon name="food" color="cat-1" tile />}
        title="Nasi lemak"
        subtitle="Food · a very long note that should be truncated instead of wrapping onto a second line"
        trailing={<Money sen={-850} sign />}
      />
      <ListRow
        icon={<CategoryIcon name="salary" color="cat-4" tile />}
        title="Salary"
        trailing={<Money sen={500000} sign />}
        onClick={() => setTaps((t) => t + 1)}
      />
      <p data-testid="taps">row taps: {taps}</p>

      <p className="font-heading text-5xl font-extrabold" data-testid="total">
        <Money sen={total} countUp />
      </p>
      <PillButton size="pill-sm" onClick={() => setTotal((t) => t + 99900)}>
        Add RM 999
      </PillButton>

      <EmptyState icon={Inbox} text="No transactions yet" action={{ label: 'Add expense', onClick: () => setOpen(true) }} />
      <EmptyState icon={Inbox} text="Nothing here, no action" />

      <PillButton onClick={() => setTx('add')}>New transaction</PillButton>
      <PillButton variant="secondary" onClick={() => setTx('edit')}>
        Edit transaction
      </PillButton>
      <p data-testid="saved">saved: {saved ? JSON.stringify(saved) : 'none'}</p>
      <p data-testid="deletes">deletes: {deletes}</p>
      <TransactionSheet
        open={tx !== null}
        onClose={() => setTx(null)}
        categories={fakeCategories}
        initial={tx === 'edit' ? editing : undefined}
        onSave={setSaved}
        onDelete={() => setDeletes((d) => d + 1)}
      />

      <Fab label="Add" onClick={() => setOpen(true)} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Add expense">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        <PillButton className="mt-4 w-full" onClick={() => setOpen(false)}>
          Done
        </PillButton>
      </Sheet>
    </main>
  )
}
