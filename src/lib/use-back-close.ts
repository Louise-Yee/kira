import { useEffect, useRef } from 'react'

// Popstates we trigger ourselves (closing a sheet by X/drag pops its history entry); handlers ignore them.
let skip = 0
// Registered non-capture so it runs after every capture-phase handler below.
window.addEventListener('popstate', () => {
  if (skip > 0) skip--
})

/** While `open`, the system/browser back button calls `onClose` instead of leaving the page. */
export function useBackClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return
    history.pushState({ sheet: true }, '')
    let popped = false
    const onPop = () => {
      if (skip > 0) return
      popped = true
      close.current()
    }
    window.addEventListener('popstate', onPop, true)
    return () => {
      window.removeEventListener('popstate', onPop, true)
      // A route change replaces history.state, leaving our entry behind; popping then would undo the navigation.
      if (!popped && history.state?.sheet) {
        skip++
        history.back()
      }
    }
  }, [open])
}
