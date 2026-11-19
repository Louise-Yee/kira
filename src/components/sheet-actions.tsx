import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PillButton } from '@/components/pill-button'
import { SheetFooter } from '@/components/sheet'

type Extra = { label: string; onClick: () => void; disabled?: boolean }

type Props = {
  /** The main action. */
  label?: string
  onSave: () => void
  disabled?: boolean
  /** Other actions (Cancel, Later, Share link), shown before the main one. */
  extras?: readonly Extra[]
  /** Shows a trash button. Pass `deleteLabel` for screen readers. */
  onDelete?: () => void
  deleteLabel?: string
  /** Ask "Keep / Delete" before calling `onDelete` (default). Off when the caller runs its own confirmation. */
  confirmDelete?: boolean
}

/** The pinned action row of a sheet: [extras] [main action] [trash]. Lives in the sheet footer, so it never scrolls away. */
export function SheetActions({ label = 'Save', onSave, disabled, extras, onDelete, deleteLabel = 'Delete', confirmDelete = true }: Props) {
  const [confirming, setConfirming] = useState(false)
  return (
    <SheetFooter>
      {confirming ? (
        <div className="flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
            Keep
          </PillButton>
          <PillButton variant="destructive" className="flex-1" onClick={onDelete}>
            {deleteLabel}
          </PillButton>
        </div>
      ) : (
        <div className="flex gap-2">
          {extras?.map((x) => (
            <PillButton key={x.label} variant="secondary" className="flex-1" disabled={x.disabled} onClick={x.onClick}>
              {x.label}
            </PillButton>
          ))}
          <PillButton className="flex-1" disabled={disabled} onClick={onSave}>
            {label}
          </PillButton>
          {onDelete && (
            <PillButton
              variant="destructive"
              className="size-14 shrink-0 px-0"
              aria-label={deleteLabel}
              onClick={confirmDelete ? () => setConfirming(true) : onDelete}
            >
              <Trash2 className="size-5" />
            </PillButton>
          )}
        </div>
      )}
    </SheetFooter>
  )
}
