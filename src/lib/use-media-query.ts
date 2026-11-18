import { useSyncExternalStore } from 'react'

/** Phones and tablets: a keyboard that pops up when a field is focused, so forms must not focus on their own. */
export const useTouch = () => useMediaQuery('(pointer: coarse)')

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
  )
}
