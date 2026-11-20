import { useState } from 'react'
import { Inbox } from 'lucide-react'
import { AmountInput } from '@/components/amount-input'
import { CategoryIcon } from '@/components/category-icon'
import { CategoryPicker } from '@/components/category-picker'
import { CoinBurst } from '@/components/coin-burst'
import { GroupAutoLogCard } from '@/components/group-auto-log-card'
import { GroupExpenseSheet } from '@/components/group-expense-sheet'
import { GroupSettleUp } from '@/components/group-settle-up'
import { EmptyState } from '@/components/empty-state'
import { Fab } from '@/components/fab'
import { ListRow } from '@/components/list-row'
import { Money } from '@/components/money'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { SheetActions } from '@/components/sheet-actions'
import { Sheet } from '@/components/sheet'
import { TransactionSheet } from '@/components/transaction-sheet'
import { ReceiptSheet } from '@/components/receipt-sheet'
import { UpdateSheet } from '@/components/update-sheet'
import { coinBurst } from '@/lib/haptics'
import { buildReceipt } from '@/lib/receipt-data'
import { ReceiptCard } from '@/screens/receipt-page'
import { monthlyTotals } from '@/lib/chart-data'
import { computeShares } from '@/lib/split'
import { trendMonths } from '@/lib/date'
import { defaultCategories } from '@/lib/default-categories'
import type { Category, Group, GroupLog, Split, Transaction, TransactionDraft, WithId } from '@/lib/db'
import { categoryIconNames } from '@/lib/category-icons'
import { CategoriesManager } from '@/screens/categories/manager'
import { MonthView } from '@/screens/month-view'

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

const t = (id: string, kind: 'expense' | 'income', amount: number, categoryId: string, date: string, note: string, createdAt: number): WithId<Transaction> => ({
  id, kind, amount, categoryId, date, note, createdAt, updatedAt: createdAt,
})
const demoTx = [
  t('a', 'expense', 850, 'food', '2026-11-17', 'Nasi lemak', 3),
  t('b', 'expense', 1200, 'transport', '2026-11-17', '', 2),
  t('c', 'expense', 4590, 'groceries', '2026-11-16', 'Jaya Grocer', 1),
  t('d', 'expense', 100000, 'rent', '2026-11-10', '', 1),
  t('e', 'income', 500000, 'salary', '2026-11-01', '', 1),
  t('f', 'expense', 1000, 'food', '2026-10-31', 'Old', 1),
  // More categories than the chart shows (top 6 + Others), and older months for the trend.
  t('g', 'expense', 6000, 'shopping', '2026-11-05', '', 1),
  t('h', 'expense', 3000, 'entertainment', '2026-11-06', '', 1),
  t('i', 'expense', 2000, 'health', '2026-11-07', '', 1),
  t('j', 'expense', 1500, 'subscriptions', '2026-11-08', '', 1),
  t('k', 'expense', 500, 'other', '2026-11-09', '', 1),
  t('l', 'income', 500000, 'salary', '2026-10-01', '', 1),
  t('m', 'expense', 150000, 'rent', '2026-10-10', '', 1),
  t('n', 'expense', 80000, 'groceries', '2026-09-12', '', 1),
  t('o', 'income', 520000, 'salary', '2026-09-01', '', 1),
  t('p', 'expense', 30000, 'bills', '2026-08-20', '', 1),
  t('q', 'expense', 100, 'food', '2026-07-02', 'tiny', 1),
]
const demoMonths = trendMonths('2026-11')

// /?gallery=month: the month view with fixed fake data (today = 2026-11-17).
function MonthDemo() {
  const [ym, setYm] = useState('2026-11')
  const [adds, setAdds] = useState(0)
  const [edited, setEdited] = useState('none')
  return (
    <main className="mx-auto max-w-md p-5 pb-32">
      <MonthView
        name="Louise"
        ym={ym}
        today="2026-11-17"
        onMonthChange={setYm}
        transactions={demoTx.filter((x) => x.date.startsWith(ym))}
        categories={defaultCategories}
        trend={monthlyTotals(demoTx, demoMonths)}
        onAdd={() => setAdds((n) => n + 1)}
        onEdit={(x) => setEdited(x.id)}
      />
      <p data-testid="adds">adds: {adds}</p>
      <p data-testid="edited">edited: {edited}</p>
    </main>
  )
}

// Simulated usage check: Food is used, Health can't be checked (offline), everything else is unused.
const fakeIsUsed = (id: string) =>
  id === 'food' ? Promise.resolve(true) : id === 'health' ? Promise.reject(new Error('offline')) : Promise.resolve(false)

// Temporary, dev only: open /?gallery to try the shared components. Removed once real screens use them (P1.5).
export function Gallery() {
  const which = new URLSearchParams(location.search).get('gallery')
  return which === 'month' ? <MonthDemo /> : which === 'receipt' ? <ReceiptDemo /> : which === 'receiptpage' ? <ReceiptPageDemo /> : which?.startsWith('update') ? <UpdateDemo forced={which === 'update-forced'} /> : <ComponentGallery />
}

// /?gallery=receipt: the receipt sheet with a fake split and a random-squares "QR".
function fakeQr(): string {
  const c = document.createElement('canvas')
  c.width = c.height = 300
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 300, 300)
  g.fillStyle = '#000'
  for (let i = 0; i < 25; i++) for (let j = 0; j < 25; j++) if ((i * 7 + j * 13 + ((i * j) % 5)) % 3 === 0) g.fillRect(i * 12, j * 12, 12, 12)
  return c.toDataURL('image/webp', 0.85)
}

function demoSplit(): WithId<Split> {
  const items = [
    { name: 'Nasi lemak', amount: 680, people: [0, 1, 2] },
    { name: 'Sushi platter', amount: 4500, people: [0, 1] },
    { amount: 1200, people: [0] },
    { name: 'Teh tarik', amount: 350, people: [2] },
  ]
  const charges = { type: 'percent', value: 1600 } as const
  return {
    id: 'demo',
    title: 'Dinner at Sushi King with the whole gang',
    date: '2026-11-17',
    mode: 'itemized',
    people: ['Me', 'Aiman', 'Bee'],
    items,
    charges,
    shares: computeShares({ people: 3, items, charges }).shares,
    categoryId: 'food',
    expenseTxId: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

function ReceiptDemo() {
  const [qr] = useState(fakeQr)
  return <ReceiptSheet open onClose={() => {}} split={demoSplit()} qr={qr} onCreateLink={() => 'demo'} />
}

// /?gallery=update or update-forced: the Android update sheet with a fake release.
function UpdateDemo({ forced }: { forced: boolean }) {
  const [open, setOpen] = useState(true)
  return <UpdateSheet open={open} update={{ release: { version: '9.9.9', apkUrl: '#', minVersion: null }, forced }} onLater={() => setOpen(false)} />
}

// /?gallery=receiptpage: what a friend sees at /r/{id}, for person 1.
function ReceiptPageDemo() {
  return <ReceiptCard receipt={buildReceipt(demoSplit(), 1)} />
}

const fakeGroup: WithId<Group> = {
  id: 'g',
  name: 'Dorm',
  ownerUid: 'a',
  memberUids: ['a', 'b', 'c'],
  members: {
    a: { displayName: 'Louise', photoURL: null, joinedAt: 1 },
    b: { displayName: 'Aiman', photoURL: null, joinedAt: 2 },
    c: { displayName: 'Mei Ling', photoURL: null, joinedAt: 3 },
  },
  inviteId: null,
  inviteExpiresAt: null,
  createdAt: 1,
  updatedAt: 1,
}

function ComponentGallery() {
  const [autoLog, setAutoLog] = useState<GroupLog | undefined>()
  const [settleLog, setSettleLog] = useState('none')
  const [groupExpense, setGroupExpense] = useState('none')
  const [groupOpen, setGroupOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState(0)
  const [cat, setCat] = useState<string | null>(null)
  const [total, setTotal] = useState(123450)
  const [taps, setTaps] = useState(0)
  const [burst, setBurst] = useState<DOMRect | null>(null)
  const [tx, setTx] = useState<'add' | 'edit' | null>(null)
  const [saved, setSaved] = useState<TransactionDraft | null>(null)
  const [deletes, setDeletes] = useState(0)
  const [managing, setManaging] = useState(false)
  const [moved, setMoved] = useState('none')
  const [managed, setManaged] = useState<WithId<Category>[]>(defaultCategories)
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
      <PillButton
        onClick={(e) => {
          coinBurst()
          setBurst(e.currentTarget.getBoundingClientRect())
        }}
      >
        Coin burst
      </PillButton>
      {burst && <CoinBurst from={burst} onDone={() => setBurst(null)} />}
      <GroupSettleUp
        group={fakeGroup}
        meUid="a"
        transfers={[
          { from: 'a', to: 'b', amount: 2340 },
          { from: 'c', to: 'b', amount: 1000 },
        ]}
        pending={[
          { id: 'p1', from: 'c', to: 'a', amount: 5000, date: '2026-11-18', status: 'pending', createdBy: 'c', createdAt: 1 },
          { id: 'p2', from: 'a', to: 'c', amount: 700, date: '2026-11-19', status: 'pending', createdBy: 'a', createdAt: 2 },
        ]}
        rejected={[{ id: 'r1', from: 'a', to: 'b', amount: 1500, date: '2026-11-17', status: 'rejected', createdBy: 'a', createdAt: 0 }]}
        allSettled
        onSettle={(t) => setSettleLog(`settle ${t.from}->${t.to} ${t.amount}`)}
        onConfirm={(s) => setSettleLog(`confirm ${s.id}`)}
        onTakeBack={(s) => setSettleLog(`take back ${s.id}`)}
        onDismiss={(s) => setSettleLog(`dismiss ${s.id}`)}
      />
      <p data-testid="settle-log">settle: {settleLog}</p>
      <GroupAutoLogCard log={autoLog} categories={defaultCategories} onChange={setAutoLog} />
      <p data-testid="auto-log">auto-log: {autoLog ? `${autoLog.enabled} ${autoLog.categoryId}` : 'none'}</p>
      <PillButton onClick={() => setGroupOpen(true)}>Group expense</PillButton>
      <p data-testid="group-expense">group expense: {groupExpense}</p>
      <GroupExpenseSheet
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        group={fakeGroup}
        meUid="a"
        onSave={(d) => setGroupExpense(`${d.title} ${d.amount} paid by ${d.paidBy} ${JSON.stringify(d.shares)}`)}
      />

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

      <PillButton variant="secondary" onClick={() => setManaging(true)}>
        Manage categories
      </PillButton>
      <p data-testid="moved">moved: {moved}</p>
      <p data-testid="cats">
        cats: {[...managed].sort((a, b) => a.order - b.order).filter((c) => c.kind === 'expense').map((c) => c.name).join(', ')} |{' '}
        {managed.length}
      </p>
      <CategoriesManager
        open={managing}
        onClose={() => setManaging(false)}
        categories={[...managed].sort((a, b) => a.order - b.order)}
        onSave={(data, id) =>
          setManaged((cs) => (id ? cs.map((c) => (c.id === id ? { ...data, id } : c)) : [...cs, { ...data, id: `new-${cs.length}` }]))
        }
        onSwap={(a, b) => setManaged((cs) => cs.map((c) => (c.id === a.id ? { ...c, order: b.order } : c.id === b.id ? { ...c, order: a.order } : c)))}
        isUsed={fakeIsUsed}
        onDelete={(id) => setManaged((cs) => cs.filter((c) => c.id !== id))}
        onMove={(from, to) => {
          if (to === 'other') return Promise.reject(new Error('server'))
          setMoved(`${from}->${to}`)
          setManaged((cs) => cs.filter((c) => c.id !== from))
          return Promise.resolve()
        }}
      />

      <Fab label="Add" onClick={() => setOpen(true)} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Add expense">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        <SheetActions label="Done" onSave={() => setOpen(false)} />
      </Sheet>
    </main>
  )
}
