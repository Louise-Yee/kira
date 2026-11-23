import { useEffect, useRef } from 'react'

// Popstates we trigger ourselves (closing a sheet by X/drag pops its history entry); handlers ignore them.
let skip = 0
// Set while a back() we triggered hasn't landed yet. A sheet opening in that window waits for it, or the late
// popstate would pop the new sheet's entry and close it (editor -> receipt).
let backing: Promise<void> | null = null
let landed: (() => void) | null = null
// The skip count is only lowered in a later task, so every handler of this popstate still sees it. (Relying on this
// listener running last doesn't hold: at the target, browsers can run listeners in the order they were added.)
window.addEventListener('popstate', () => {
  if (skip > 0) setTimeout(() => skip--, 0)
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
    // Our history entry's own id (random, so it can't match an entry left from before a reload): a sheet only ever
    // pops its own entry.
    const id = Math.random()
    const onPop = () => {
      // Our entry is still the current one: the pop closed a sheet stacked on top of this one, not this one.
      if (skip > 0 || history.state?.sheet === id) return
      close.current()
    }
    const start = () => {
      if (!active) return
      history.pushState({ sheet: id }, '')
      window.addEventListener('popstate', onPop, true)
    }
    if (backing) backing.then(start)
    else start()
    return () => {
      active = false
      window.removeEventListener('popstate', onPop, true)
      // Pop our entry only if it's the current one: after a route change or a back press it isn't, and popping then
      // would undo something else. Sheets closing at once (a confirm, the sheet under it, the screen under that) each
      // wait for the pop before them to land, or a pop would go past the page into an older one (#125).
      const undo = () => {
        if (backing) void backing.then(undo)
        else if (history.state?.sheet === id) backSilently()
      }
      undo()
    }
  }, [open])
}
