import { App as CapApp } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { useEffect } from 'react'
import { monthName } from '@/lib/date'
import { formatMoney } from '@/lib/money'

const WidgetBridge = registerPlugin<{ refresh: () => Promise<void> }>('WidgetBridge')

type Totals = { income: number; expense: number }

/**
 * Writes this month's numbers where the Android widget reads them, then asks it to redraw. Native only.
 * `rm` stays in RM sen for widget builds that format it themselves; `shown` (in `currency`) is what newer ones show.
 */
export function usePushWidget(ym: string, rm: Totals | undefined, shown: Totals | undefined, currency: string) {
  const income = rm?.income
  const expense = rm?.expense
  const shownIncome = shown?.income
  const shownExpense = shown?.expense
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || income === undefined || expense === undefined || shownIncome === undefined || shownExpense === undefined) return
    const summary = {
      ym,
      label: `Left in ${monthName(ym)}`,
      left: income - expense,
      income,
      expense,
      leftText: formatMoney(shownIncome - shownExpense, currency),
      incomeText: formatMoney(shownIncome, currency),
      expenseText: formatMoney(shownExpense, currency),
      updatedAt: Date.now(),
    }
    Preferences.set({ key: 'widget', value: JSON.stringify(summary) })
      .then(() => WidgetBridge.refresh())
      .catch(() => {}) // the widget is best-effort; the app works without it
  }, [ym, income, expense, shownIncome, shownExpense, currency])
}

const ADD_URL = 'kira://add'

/** Calls `onAdd` when the app is opened from the widget's "+" button (cold start or already running). */
export function useAddLink(onAdd: () => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    CapApp.getLaunchUrl().then((r) => r?.url === ADD_URL && onAdd())
    const handle = CapApp.addListener('appUrlOpen', (e) => e.url === ADD_URL && onAdd())
    return () => {
      handle.then((h) => h.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once; onAdd only bumps a counter
  }, [])
}
