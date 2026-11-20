import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { detent } from '@/lib/haptics'
import { soft } from '@/lib/motion'

const MIN_PX = 60 // a flick shorter than this is a tap or a scroll wobble
const MAX_MS = 500 // a slower drag is reading, unless it went past COMMIT
const COMMIT = 0.3 // dragged past this share of the width and let go: switch, however slowly
const LOCK_PX = 10 // movement before deciding whether this is a sideways swipe or a scroll
const EDGE_PX = 24 // Android's back gesture starts at the screen edge
const RESIST = 0.25 // past the first or last tab the page only gives a little

/** Whether `el` or something above it scrolls sideways, or handles its own horizontal drag (`data-no-tab-swipe`). */
function ownsSwipe(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (e instanceof HTMLElement && e.dataset.noTabSwipe !== undefined) return true
    const { overflowX } = getComputedStyle(e)
    if ((overflowX === 'auto' || overflowX === 'scroll') && e.scrollWidth > e.clientWidth) return true
  }
  return false
}

/** Where the tab beside the current page goes: its top and left in the page column, its width, and how far it is. */
export type PeekBox = { top: number; left: number; width: number; shift: number }

/**
 * Swipe sideways anywhere on the page to change tab. The page follows the finger and the next tab slides in beside it
 * (`peek`: -1 the previous tab, 1 the next, 0 none); let go past 30% of the width, or flick, to switch, otherwise it
 * springs back. `x` is the offset to apply to the pages, and `box` places the peeking tab: lined up with the
 * current page (`page`), one column width over, and at the top of the screen however far the page is scrolled. `canGo(dir)` says whether there is a tab that way; `onSwipe`
 * switches to it once the pages have slid over, and `x` resets when `current` changes.
 * With reduced motion the page doesn't follow the finger; a flick still switches.
 * `progress` is the same drag in tabs (0.5 = halfway to the next one), so the nav highlight can follow it.
 * Ignored while a sheet is open, from the screen edges, and on anything that drags or scrolls sideways itself.
 */
export function useTabSwipe(
  enabled: boolean,
  page: RefObject<HTMLElement | null>,
  current: string,
  canGo: (dir: 1 | -1) => boolean,
  onSwipe: (dir: 1 | -1) => void,
) {
  const x = useMotionValue(0)
  // Tied to the tab it peeks from, so a tab change drops it without an effect.
  const [peekState, setPeekState] = useState<{ from: string; dir: 1 | -1 | 0 }>({ from: current, dir: 0 })
  const peek = peekState.from === current ? peekState.dir : 0
  const fromRef = useRef(current)
  const [box, setBox] = useState<PeekBox>({ top: 0, left: 0, width: 0, shift: 0 })
  const reduce = useReducedMotion()
  const span = useRef(1) // the width a swipe moves the page by, from the last gesture
  const progress = useTransform(x, (v) => -v / span.current)
  const latest = useRef({ canGo, onSwipe })
  useEffect(() => {
    latest.current = { canGo, onSwipe }
    fromRef.current = current
  })

  // The new tab is in place before it paints: the pages snap back to 0 together.
  useLayoutEffect(() => {
    x.set(0)
  }, [current, x])

  useEffect(() => {
    if (!enabled) return
    type Gesture = { x: number; y: number; t: number; axis: 'x' | 'y' | null; dx: number; armed: boolean }
    let g: Gesture | null = null
    const setPeek = (dir: 1 | -1 | 0) => setPeekState({ from: fromRef.current, dir })
    // The page column's width, gutters included: the distance between one tab and the next.
    const width = () => page.current?.closest('main')?.clientWidth ?? innerWidth

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      g = null
      if (e.touches.length !== 1 || t.clientX < EDGE_PX || t.clientX > innerWidth - EDGE_PX) return
      if (document.querySelector('[role="dialog"]') || ownsSwipe(e.target instanceof Element ? e.target : null)) return
      x.stop()
      g = { x: t.clientX, y: t.clientY, t: e.timeStamp, axis: null, dx: 0, armed: false }
    }

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!g || !t) return
      const dx = t.clientX - g.x
      const dy = t.clientY - g.y
      g.dx = dx
      if (!g.axis) {
        if (Math.hypot(dx, dy) < LOCK_PX) return
        g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        const el = page.current
        if (g.axis === 'x') span.current = width()
        if (g.axis === 'x' && el) setBox({ top: el.offsetTop + scrollY, left: el.offsetLeft, width: el.offsetWidth, shift: width() })
      }
      if (g.axis !== 'x' || reduce) return
      e.preventDefault() // a sideways swipe doesn't also scroll the page
      const dir = dx < 0 ? 1 : -1
      const open = latest.current.canGo(dir)
      setPeek(open ? dir : 0)
      x.set(open ? dx : dx * RESIST)
      // A tick as it crosses the point where letting go switches, so you feel it first.
      const past = open && Math.abs(dx) > width() * COMMIT
      if (past && !g.armed) detent()
      g.armed = past
    }

    const onEnd = (e: TouchEvent) => {
      if (!g) return
      const { dx, axis } = g
      const quick = e.timeStamp - g.t < MAX_MS
      g = null
      if (axis !== 'x') return
      const dir = dx < 0 ? 1 : -1
      const commit = latest.current.canGo(dir) && (Math.abs(dx) > width() * COMMIT || (quick && Math.abs(dx) > MIN_PX))
      if (!commit) {
        void animate(x, 0, soft).then(() => setPeek(0))
        return
      }
      if (reduce) return latest.current.onSwipe(dir)
      void animate(x, -dir * width(), soft).then(() => latest.current.onSwipe(dir))
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    // Not passive: once a swipe is sideways, it stops the page scrolling.
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, reduce, x, page])

  return { x, peek, box, progress }
}
