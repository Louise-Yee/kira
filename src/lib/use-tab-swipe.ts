import { useEffect, useRef } from 'react'

const MIN_PX = 60 // a flick shorter than this is a tap or a scroll wobble
const MAX_MS = 500 // a slower drag is reading, not switching
const EDGE_PX = 24 // Android's back gesture starts at the screen edge

/** Whether `el` or something above it scrolls sideways, or handles its own horizontal drag (`data-no-tab-swipe`). */
function ownsSwipe(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (e instanceof HTMLElement && e.dataset.noTabSwipe !== undefined) return true
    const { overflowX } = getComputedStyle(e)
    if ((overflowX === 'auto' || overflowX === 'scroll') && e.scrollWidth > e.clientWidth) return true
  }
  return false
}

/**
 * A quick horizontal flick anywhere on the page calls `onSwipe(1)` (right to left: the next tab) or `onSwipe(-1)`.
 * The page doesn't follow the finger; the tab change animates as a tap does. Ignored while a sheet is open, from the
 * screen edges, and on anything that drags or scrolls sideways itself.
 */
export function useTabSwipe(enabled: boolean, onSwipe: (dir: 1 | -1) => void) {
  const swipe = useRef(onSwipe)
  useEffect(() => {
    swipe.current = onSwipe
  })
  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number; t: number } | null = null
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      start = null
      if (e.touches.length !== 1 || t.clientX < EDGE_PX || t.clientX > innerWidth - EDGE_PX) return
      if (document.querySelector('[role="dialog"]') || ownsSwipe(e.target instanceof Element ? e.target : null)) return
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp }
    }
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      if (!start || !t) return
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const quick = e.timeStamp - start.t < MAX_MS
      start = null
      if (quick && Math.abs(dx) > MIN_PX && Math.abs(dx) > 2 * Math.abs(dy)) swipe.current(dx < 0 ? 1 : -1)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [enabled])
}
