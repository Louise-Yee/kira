import { PillButton } from '@/components/pill-button'
import { Sheet, SheetFooter } from '@/components/sheet'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  text: string
  /** The destructive action, e.g. "Remove friend". */
  confirmLabel: string
  onConfirm: () => void
}

/** "Are you sure?" for removing or leaving something: the consequence in words, then Keep or the action. */
export function ConfirmSheet({ open, onClose, title, text, confirmLabel, onConfirm }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="pb-1 text-base text-muted-foreground">{text}</p>
      <SheetFooter>
        <div className="flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={onClose}>
            Keep
          </PillButton>
          <PillButton variant="destructive" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </PillButton>
        </div>
      </SheetFooter>
    </Sheet>
  )
}
