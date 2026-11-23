import { useEffect, useState } from 'react'
import { postOccurrences, useRecurring } from '@/lib/db'
import { todayISO } from '@/lib/date'
import { fetchRate } from '@/lib/fx'
import { dueIndices } from '@/lib/recurrence'

/**
 * Posts every due occurrence of every rule: once the rules first load, and again when the app
 * becomes visible on a new day. Needs the server (nothing posts while offline); a repeat run is harmless.
 * A foreign rule posts at the latest rate (fetched, else cached on this device, else the one on the rule).
 */
export function usePostRecurring(uid: string | undefined) {
  const rules = useRecurring(uid, true) // server-confirmed only: a stale cached `posted` would re-post deleted transactions
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setToday(todayISO())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!uid || !rules) return
    // Rules that change while a rate is being fetched re-run this; the stale run must not post.
    let live = true
    for (const rule of rules) {
      const due = dueIndices(rule, rule.posted, today)
      if (!due.length) continue
      const o = rule.original
      if (!o) postOccurrences(uid, rule.id, rule, due)
      else void fetchRate(o.currency).then((rate) => live && postOccurrences(uid, rule.id, rule, due, rate ?? undefined))
    }
    return () => {
      live = false
    }
  }, [uid, rules, today])
}
