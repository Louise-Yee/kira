import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Dialog } from 'radix-ui'
import { sheet } from '@/lib/haptics'
import { glide, pop, soft } from '@/lib/motion'
import { useBackClose } from '@/lib/use-back-close'
import { useMediaQuery, useTouch } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Fill most of the screen height on phones (long forms) instead of shrinking to the content. */
  tall?: boolean
  /** A control at the right of the title row (e.g. a share button), reachable without scrolling. */
  action?: ReactNode
}

const FooterSlot = createContext<HTMLElement | null>(null)

/**
 * Pins its children (the sheet's actions) under the scrolling content, so they never need a scroll.
 * Render it anywhere inside a `<Sheet>`; it portals into the sheet's footer slot.
 */
export function SheetFooter({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlot)
  return slot && createPortal(children, slot)
}

const CLOSE_DISTANCE = 120
const CLOSE_VELOCITY = 500

/** Bottom sheet on phones (drag the handle down to close); centered dialog at lg. */
export function Sheet({ open, onClose, title, children, tall, action }: Props) {
  const lg = useMediaQuery('(min-width: 1024px)')
  const touch = useTouch()
  const controls = useDragControls()
  const [footer, setFooter] = useState<HTMLElement | null>(null)
  useBackClose(open, onClose)
  useEffect(() => {
    if (open) sheet()
  }, [open])
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
              // Tapping Undo on a toast is not a tap outside: the sheet stays open.
              onInteractOutside={(e) => {
                if (e.target instanceof Element && e.target.closest('[data-toaster]')) e.preventDefault()
              }}
              // Radix focuses the first tabbable element; let a [data-autofocus] element (AmountInput) win.
              // On touch screens nothing is focused, so the keyboard doesn't push the sheet around.
              onOpenAutoFocus={(e) => {
                if (touch) return e.preventDefault()
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
                // Phones: no overshoot, or the bottom-anchored sheet lifts off the screen edge.
                transition={lg ? pop : glide}
                drag={lg ? false : 'y'}
                dragControls={controls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_VELOCITY) {
                    sheet()
                    onClose()
                  }
                }}
                className={cn('fixed inset-x-0 bottom-0 z-30 flex max-h-[90dvh] flex-col rounded-t-3xl bg-card pb-[max(1rem,var(--inset-bottom))] outline-none lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:pb-6', tall && 'h-[92dvh] lg:h-auto lg:max-h-[90dvh] lg:w-xl')}
              >
                <div
                  onPointerDown={(e) => controls.start(e)}
                  className="flex h-8 shrink-0 touch-none items-center justify-center lg:hidden"
                >
                  <div className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
                </div>
                <div className="flex items-center justify-between gap-3 px-5 pb-3 lg:pt-6">
                  <Dialog.Title className="font-heading text-2xl font-extrabold tracking-tight">{title}</Dialog.Title>
                  {action}
                </div>
                <div
                  className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-1"
                  // Keep a focused field clear of the on-screen keyboard once the viewport has resized.
                  onFocusCapture={(e) => {
                    const el = e.target
                    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
                    setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
                  }}
                >
                  <FooterSlot value={footer}>{children}</FooterSlot>
                </div>
                <div ref={setFooter} className="flex shrink-0 flex-col gap-2 px-5 pt-3 empty:hidden" />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
