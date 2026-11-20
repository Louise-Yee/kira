import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Check } from 'lucide-react'
import { pop } from '@/lib/motion'
import { currentToast, subscribeToast, type Toast } from '@/lib/toast'

/**
 * The toast from `toast()`, at the top centre, over sheets. Mount once.
 * Both live regions stay in the page so screen readers announce what is put into them, and they carry `aria-live`
 * so an open sheet (a Radix modal, which hides everything else from screen readers) leaves them visible.
 */
export function Toaster() {
  const t = useSyncExternalStore(subscribeToast, currentToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--inset-top))] z-40 flex justify-center px-4">
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
  const Icon = toast.tone === 'error' ? CircleAlert : Check
  return (
    <motion.p
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -8 }}
      transition={pop}
      className="flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-base font-semibold text-background shadow-lg"
    >
      <Icon className={toast.tone === 'error' ? 'size-5 shrink-0 text-destructive' : 'size-5 shrink-0'} aria-hidden />
      {toast.text}
    </motion.p>
  )
}
