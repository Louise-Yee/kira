import { useEffect } from 'react'
import { AsciiCoin } from '@/components/ascii'
import { Money } from '@/components/money'
import { longDate } from '@/lib/date'
import { usePublicReceipt } from '@/lib/db'
import type { Receipt } from '@/lib/receipt-data'

/** One person's receipt on white paper with a blue ASCII coin on top. Always light, whatever the app theme. */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const person = receipt.people[0]
  return (
    <div className="light min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-5">
        <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
          <AsciiCoin ink cell={4} className="mx-auto size-40 text-primary" />
          <h1 className="mt-2 text-center font-heading text-3xl font-extrabold leading-tight tracking-tight">{receipt.title}</h1>
          <p className="mt-2 text-center text-base text-muted-foreground">{`${longDate(receipt.date)} · ${person.name}`}</p>

          <ul className="mt-5 flex flex-col gap-3 border-t border-dashed border-muted-foreground/50 pt-5 text-base">
            {person.rows.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{r.label}</span>
                <Money sen={r.amount} className="font-semibold" />
              </li>
            ))}
            {receipt.chargeLabel && person.charge !== 0 && (
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">{receipt.chargeLabel}</span>
                <Money sen={person.charge} className="font-semibold" />
              </li>
            )}
          </ul>
          <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-dashed border-muted-foreground/50 pt-5">
            <span className="text-base font-bold">Total</span>
            <Money sen={person.total} className="font-heading text-4xl font-extrabold text-primary" />
          </div>
        </article>
        <p className="text-center text-base text-muted-foreground">Split with kira</p>
      </div>
    </div>
  )
}

/** The page a friend opens from a receipt link (/r/{id}): no sign-in, shows only their own share. */
export function ReceiptPage({ id }: { id: string }) {
  const found = usePublicReceipt(id)
  useEffect(() => {
    if (found) document.title = `${found.receipt.title} · Kira`
  }, [found])

  if (found === undefined) return <div className="light min-h-dvh bg-background" />
  if (!found || !found.receipt.people[0])
    return (
      <main className="light min-h-dvh bg-background px-5 pt-24 text-center text-base text-muted-foreground">
        This receipt isn't available. Ask for a new link.
      </main>
    )
  return <ReceiptCard receipt={found.receipt} />
}
