import { CurrencyList } from '@/components/currency-select'
import { HOME } from '@/lib/money'

/**
 * Asked once (new accounts after sign-in, existing ones after updating): the currency totals are shown in and new
 * entries start in. RM is first and checked, so keeping it is one tap.
 */
export function CurrencySetup({ onPick }: { onPick: (currency: string) => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-[calc(1.5rem+var(--inset-top))] pb-10">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Which currency do you use?</h1>
      <p className="text-base text-muted-foreground">
        Your totals are shown in it, and new entries start in it. You can still log any currency, and change this
        later in Settings.
      </p>
      <CurrencyList value={HOME} onPick={onPick} />
    </main>
  )
}
