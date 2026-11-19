import { useEffect, useState } from 'react'
import { CategoryPicker } from '@/components/category-picker'
import { PillButton } from '@/components/pill-button'
import { SheetFooter } from '@/components/sheet'
import { error, warning } from '@/lib/haptics'
import type { Category, WithId } from '@/lib/db'

type DeleteProps = {
  cat: WithId<Category>
  /** Same-kind, non-archived categories that transactions can move to. */
  targets: readonly WithId<Category>[]
  /** Whether any transaction uses the category; rejects when that can't be known (offline). Must be a stable reference. */
  isUsed: (id: string) => Promise<boolean>
  onDelete: () => void
  onArchive: () => void
  onMove: (toId: string) => Promise<void>
  onCancel: () => void
}

type Usage = 'checking' | 'unknown' | 'unused' | 'used'

export function DeleteFlow({ cat, targets, isUsed, onDelete, onArchive, onMove, onCancel }: DeleteProps) {
  const [usage, setUsage] = useState<Usage>('checking')
  const [target, setTarget] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveFailed, setMoveFailed] = useState(false)

  useEffect(() => {
    let live = true
    isUsed(cat.id).then(
      (used) => live && setUsage(used ? 'used' : 'unused'),
      () => live && setUsage('unknown'),
    )
    return () => {
      live = false
    }
  }, [cat.id, isUsed])

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-base font-semibold text-muted-foreground">Delete “{cat.name}”</p>

      {usage === 'checking' && <p className="text-base">Checking whether it's in use…</p>}

      {usage === 'unknown' && (
        <p className="text-base">
          Can't tell whether it's in use right now (you may be offline). Deleting could orphan transactions, so
          it's blocked. You can archive it instead.
        </p>
      )}

      {usage === 'unused' && <p className="text-base">No transactions use it. This can't be undone.</p>}

      {usage === 'used' && (
        <>
          <p className="text-base">Transactions use it. Move them to another category, or archive it (hidden from pickers, kept on old transactions).</p>
          {targets.length > 0 ? (
            <CategoryPicker categories={targets} value={target} onChange={setTarget} />
          ) : (
            <p className="text-base text-muted-foreground">There's no other category to move them to.</p>
          )}
          {moveFailed && <p className="text-base text-destructive">Couldn't reach the server. Nothing was changed.</p>}
        </>
      )}

      <SheetFooter>
        {usage === 'unused' && (
          <PillButton
            variant="destructive"
            onClick={() => {
              warning()
              onDelete()
            }}
          >
            Delete
          </PillButton>
        )}
        {usage === 'used' && targets.length > 0 && (
          <PillButton
            disabled={!target || moving}
            onClick={() => {
              if (!target) return
              setMoving(true)
              setMoveFailed(false)
              onMove(target).catch(() => {
                error()
                setMoving(false)
                setMoveFailed(true)
              })
            }}
          >
            {moving ? 'Moving…' : 'Move transactions and delete'}
          </PillButton>
        )}
        {(usage === 'unknown' || usage === 'used') && (
          <PillButton variant="secondary" onClick={onArchive}>
            Archive instead
          </PillButton>
        )}
        <PillButton variant="secondary" onClick={onCancel} disabled={moving}>
          Cancel
        </PillButton>
      </SheetFooter>
    </div>
  )
}
