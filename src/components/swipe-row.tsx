import { useContext, useEffect, useRef, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { Share2 } from 'lucide-react'
import { PeekContext } from '@/lib/fab-slide'
import { detent } from '@/lib/haptics'
import { soft } from '@/lib/motion'

const THRESHOLD = 80 // px: swipe left past this and let go to trigger
const HINT = 64 // px the row slides on its own, once, to show the action behind it
const HINT_DELAY = 700 // ms: after the page has slid in

/** Whether someone on this device has done this swipe; storage that throws counts as done, so it never nags. */
function swipedBefore(key: string): boolean {
  try {
    return !!localStorage.getItem(key)
  } catch {
    return true
  }
}

function rememberSwipe(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // storage blocked: the hint just shows again next time
  }
}

/**
 * A row you swipe left (right to left): an action appears behind it, and letting go past the threshold
 * runs `onSwipe` while the row springs back. The row itself still taps as normal.
 * With `hintKey`, the row slides open a little and back each time it appears, until someone on this device has
 * done the swipe, so people learn it exists.
 */
export function SwipeRow({ onSwipe, label, hintKey, children }: { onSwipe: () => void; label: string; hintKey?: string; children: ReactNode }) {
  const x = useMotionValue(0)
  const reduce = useReducedMotion()
  // Not on the copy of the page peeking in during a tab swipe: only the real one, once it's on screen.
  const peek = useContext(PeekContext)
  useEffect(() => {
    if (!hintKey || reduce || peek) return
    const timer = setTimeout(() => {
      if (swipedBefore(hintKey)) return
      void animate(x, -HINT, soft).then(() => animate(x, 0, soft))
    }, HINT_DELAY)
    return () => clearTimeout(timer)
  }, [hintKey, reduce, peek, x])
  const reveal = useTransform(x, [0, -THRESHOLD], [0.4, 1], { clamp: true })
  const fade = useTransform(x, [0, -THRESHOLD], [0, 1], { clamp: true }) // invisible at rest so it never shows through the row
  const bg = useTransform(x, [0, -6], [0, 1], { clamp: true }) // hidden at rest so no blue fringe at the corners
  const dragged = useRef(false)
  const armed = useRef(false)
  // A detent when the drag crosses the commit point, so you feel it before letting go.
  useMotionValueEvent(x, 'change', (v) => {
    const past = v < -THRESHOLD
    if (past && !armed.current) detent()
    armed.current = past
  })
  return (
    // Its own swipe, so a flick on it doesn't also switch tab.
    <div className="relative overflow-hidden rounded-2xl" data-no-tab-swipe>
      <motion.div className="pointer-events-none absolute inset-0 bg-primary" style={{ opacity: bg }} aria-hidden />
      <motion.div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-5 text-base font-semibold text-primary-foreground" style={{ opacity: fade, scale: reveal }}>
        <Share2 className="size-5" aria-hidden />
        {label}
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 1, right: 0 }}
        dragSnapToOrigin
        dragTransition={{ bounceStiffness: 500, bounceDamping: 35 }}
        style={{ x, touchAction: 'pan-y' }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -THRESHOLD) {
            if (hintKey) rememberSwipe(hintKey)
            onSwipe()
          }
          setTimeout(() => (dragged.current = false), 0)
        }}
        // A drag that ends on the row's button must not count as a tap.
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
