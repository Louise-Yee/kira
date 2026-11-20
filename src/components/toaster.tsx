import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Check, Trash2 } from 'lucide-react'
import { pop, press } from '@/lib/motion'
import { currentToast, dismissToast, subscribeToast, type Toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * The toast from `toast()` / `toastUndo()`, at the top centre, over sheets. Mount once.
 * Both live regions stay in the page so screen readers announce what is put into them, and they carry `aria-live`
 * so an open sheet (a Radix modal, which hides everything else from screen readers) leaves them visible.
 */
export function Toaster() {
  const t = useSyncExternalStore(subscribeToast, currentToast)
  return (
    <div data-toaster className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--inset-top))] z-40 flex justify-center px-4">
      <div role="status" aria-live="polite" aria-atomic>
        <AnimatePresence>{t?.tone === 'info' && <Pill key={t.id} toast={t} />}</AnimatePresence>
      </div>
      <div role="alert" aria-live="assertive" aria-atomic>
        <AnimatePresence>{t?.tone === 'error' && <Pill key={t.id} toast={t} />}</AnimatePresence>
      </div>
    </div>
  )
}

function Pill({ toast }: { toast: Toast }) {
  const [left, setLeft] = useState(toast.seconds)
  // Hovered or focused: the countdown waits, so there's time to read it and reach Undo.
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (held) return
    if (left <= 0) return dismissToast(toast.id)
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [left, held, toast.id])

  const { action } = toast
  const Icon = toast.tone === 'error' ? CircleAlert : action ? Trash2 : Check
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -8 }}
      transition={pop}
      // Only a toast with a button takes the pointer: a plain one must never block a tap on what's under it.
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-full bg-foreground py-1 pl-4 text-base font-semibold text-background shadow-lg',
        action ? 'pointer-events-auto pr-1' : 'pr-4',
      )}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <Icon className={cn('size-5 shrink-0', toast.tone === 'error' && 'text-destructive')} aria-hidden />
      {toast.text}
      {action && (
        <motion.button
          type="button"
          whileTap={press}
          className="ml-1 flex h-11 items-center gap-2 rounded-full bg-background/15 px-4"
          onClick={() => {
            action.onClick()
            dismissToast(toast.id)
          }}
        >
          {action.label}
          {/* The countdown is for the eye only; reading it out every second would drown the message. */}
          <span aria-hidden className="w-3 text-center tabular-nums opacity-70">
            {left}
          </span>
        </motion.button>
      )}
    </motion.div>
  )
}
