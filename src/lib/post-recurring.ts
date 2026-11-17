import { useEffect, useState } from 'react'
import { postOccurrences, useRecurring } from '@/lib/db'
import { todayISO } from '@/lib/date'
import { dueIndices } from '@/lib/recurrence'

/**
 * Posts every due occurrence of every rule: once the rules first load, and again when the app
 * becomes visible on a new day. Idempotent, so a repeat run (or another device) is harmless.
 */
export function usePostRecurring(uid: string | undefined) {
  const rules = useRecurring(uid)
  const [today, setToday] = useState(todayISO)

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setToday(todayISO())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!uid || !rules) return
    for (const rule of rules) {
      const due = dueIndices(rule, rule.posted, today)
      if (due.length) postOccurrences(uid, rule.id, rule, due)
    }
  }, [uid, rules, today])
}
