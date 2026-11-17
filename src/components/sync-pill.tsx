import { AnimatePresence, motion } from 'motion/react'
import { CloudOff } from 'lucide-react'
import type { SyncStatus } from '@/lib/db'
import { pop } from '@/lib/motion'

/** Floating status pill: "Offline" (grey) or "Saving…" (cobalt, pulsing dot); hidden when synced. */
export function SyncPill({ status }: { status: SyncStatus }) {
  return (
    <div className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-20" role="status">
      <AnimatePresence>
        {status !== 'synced' && (
          <motion.span
            key={status}
            initial={{ opacity: 0, scale: 0.8, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -8 }}
            transition={pop}
            className={
              status === 'offline'
                ? 'flex h-9 items-center gap-2 rounded-full bg-secondary px-4 text-base font-semibold text-muted-foreground'
                : 'flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-base font-semibold text-primary-foreground'
            }
          >
            {status === 'offline' ? (
              <CloudOff className="size-4" aria-hidden />
            ) : (
              <motion.span
                aria-hidden
                animate={{ scale: 1.5 }}
                transition={{ type: 'spring', bounce: 0.5, duration: 0.9, repeat: Infinity, repeatType: 'reverse' }}
                className="size-2 rounded-full bg-primary-foreground"
              />
            )}
            {status === 'offline' ? 'Offline' : 'Saving…'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
