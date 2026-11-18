import { useEffect } from 'react'
import { AsciiCoin } from '@/components/ascii'
import { Money } from '@/components/money'
import { longDate } from '@/lib/date'
import { usePublicReceipt } from '@/lib/db'

/** The page a friend opens from a receipt link (/r/{id}): no sign-in, always dark, shows only their own share. */
export function ReceiptPage({ id }: { id: string }) {
  const found = usePublicReceipt(id)
  const person = found?.receipt.people[0]
  useEffect(() => {
    if (found) document.title = `${found.receipt.title} · Kira`
  }, [found])

  return (
    <main className="dark min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-4 p-5">
        {found === undefined ? null : !found || !person ? (
          <p className="pt-24 text-center text-base text-muted-foreground">This receipt isn't available. Ask for a new link.</p>
        ) : (
          <>
            <header className="flex items-center justify-between gap-2 overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground">
              <div className="min-w-0">
                <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight">{found.receipt.title}</h1>
                <p className="mt-2 text-base font-medium">{`${longDate(found.receipt.date)} · ${person.name}`}</p>
              </div>
              {/* The coin texture needs a dark ground, so it sits on its own dark tile. */}
              <div className="size-32 shrink-0 overflow-hidden rounded-3xl bg-background">
                <AsciiCoin className="size-full" />
              </div>
            </header>

            <section className="rounded-3xl bg-card p-6">
              <h2 className="font-heading text-2xl font-extrabold">{person.name}</h2>
              <ul className="mt-3 flex flex-col gap-3 text-base">
                {person.rows.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{r.label}</span>
                    <Money sen={r.amount} className="font-semibold" />
                  </li>
                ))}
                {found.receipt.chargeLabel && person.charge !== 0 && (
                  <li className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{found.receipt.chargeLabel}</span>
                    <Money sen={person.charge} className="font-semibold" />
                  </li>
                )}
              </ul>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                <span className="text-base font-bold">Total</span>
                <Money sen={person.total} className="font-heading text-4xl font-extrabold text-primary" />
              </div>
            </section>

            <p className="text-center text-base text-muted-foreground">Split with kira</p>
          </>
        )}
      </div>
    </main>
  )
}
