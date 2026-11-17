import { useState } from 'react'
import { AmountInput } from '@/components/amount-input'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'

// Temporary, dev only: open /?gallery to try the shared components. Removed once real screens use them (P1.5).
export function Gallery() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState(0)
  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-5">
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
      <Sheet open={open} onClose={() => setOpen(false)} title="Add expense">
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        <PillButton className="mt-4 w-full" onClick={() => setOpen(false)}>
          Done
        </PillButton>
      </Sheet>
    </main>
  )
}
