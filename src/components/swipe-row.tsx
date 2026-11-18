import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { Share2 } from 'lucide-react'
import { detent } from '@/lib/haptics'

const THRESHOLD = 80 // px: swipe left past this and let go to trigger

/**
 * A row you swipe left (right to left): an action appears behind it, and letting go past the threshold
 * runs `onSwipe` while the row springs back. The row itself still taps as normal.
 */
export function SwipeRow({ onSwipe, label, children }: { onSwipe: () => void; label: string; children: ReactNode }) {
  const x = useMotionValue(0)
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
    <div className="relative overflow-hidden rounded-2xl">
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
