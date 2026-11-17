import type { ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Dialog } from 'radix-ui'
import { pop, soft } from '@/lib/motion'
import { useMediaQuery } from '@/lib/use-media-query'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

const CLOSE_DISTANCE = 120
const CLOSE_VELOCITY = 500

/** Bottom sheet on phones (drag the handle down to close); centered dialog at lg. */
export function Sheet({ open, onClose, title, children }: Props) {
  const lg = useMediaQuery('(min-width: 1024px)')
  const controls = useDragControls()
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={soft}
                className="fixed inset-0 z-20 bg-foreground/40"
              />
            </Dialog.Overlay>
            <Dialog.Content
              forceMount
              asChild
              aria-describedby={undefined}
              // Radix focuses the first tabbable element; let a [data-autofocus] element (AmountInput) win.
              onOpenAutoFocus={(e) => {
                const el = document.querySelector<HTMLElement>('[data-autofocus]')
                if (el) {
                  e.preventDefault()
                  el.focus()
                }
              }}
            >
              <motion.div
                initial={lg ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
                animate={lg ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={lg ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
                transition={pop}
                drag={lg ? false : 'y'}
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_VELOCITY) onClose()
                }}
                className="fixed inset-x-0 bottom-0 z-30 flex max-h-[90dvh] flex-col rounded-t-3xl bg-card pb-[max(1rem,env(safe-area-inset-bottom))] outline-none lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:pb-6"
              >
                <div
                  onPointerDown={(e) => controls.start(e)}
                  className="flex h-8 shrink-0 touch-none items-center justify-center lg:hidden"
                >
                  <div className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
                </div>
                <Dialog.Title className="px-5 pb-3 font-heading text-2xl font-extrabold tracking-tight lg:pt-6">
                  {title}
                </Dialog.Title>
                <div className="overflow-y-auto px-5">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
