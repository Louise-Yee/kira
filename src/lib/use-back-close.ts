import { useEffect, useRef } from 'react'

// Popstates we trigger ourselves (closing a sheet by X/drag pops its history entry); handlers ignore them.
let skip = 0
// Set while a back() we triggered hasn't landed yet. A sheet opening in that window waits for it, or the late
// popstate would pop the new sheet's entry and close it (editor -> receipt).
let backing: Promise<void> | null = null
let landed: (() => void) | null = null
// Registered non-capture so it runs after every capture-phase handler below.
window.addEventListener('popstate', () => {
  if (skip > 0) skip--
  landed?.()
})

function backSilently() {
  skip++
  backing = new Promise((resolve) => {
    const done = () => {
      landed = null
      backing = null
      resolve()
    }
    landed = done
    setTimeout(done, 500)
  })
  history.back()
}

/** While `open`, the system/browser back button calls `onClose` instead of leaving the page. */
export function useBackClose(open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return
    let active = true
    let pushed = false
    let popped = false
    const onPop = () => {
      if (skip > 0) return
      popped = true
      close.current()
    }
    const start = () => {
      if (!active) return
      history.pushState({ sheet: true }, '')
      pushed = true
      window.addEventListener('popstate', onPop, true)
    }
    if (backing) backing.then(start)
    else start()
    return () => {
      active = false
      window.removeEventListener('popstate', onPop, true)
      // A route change replaces history.state, leaving our entry behind; popping then would undo the navigation.
      if (pushed && !popped && history.state?.sheet) backSilently()
    }
  }, [open])
}
