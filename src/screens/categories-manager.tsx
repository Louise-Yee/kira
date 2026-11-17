import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { CategoryPicker } from '@/components/category-picker'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import { TextField } from '@/components/text-field'
import { catColor, categoryIconNames } from '@/lib/category-icons'
import type { Category, Kind, WithId } from '@/lib/db'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const satisfies readonly { value: Kind; label: string }[]

const colorTokens = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8']

type Props = {
  open: boolean
  onClose: () => void
  /** All categories (archived too), sorted by `order`. */
  categories: readonly WithId<Category>[]
  onSave: (data: Category, id?: string) => void
  onSwap: (a: WithId<Category>, b: WithId<Category>) => void
  /** Whether any transaction uses the category. Must reject when it can't be known (offline). */
  isUsed: (id: string) => Promise<boolean>
  onDelete: (id: string) => void
  /** Move all of `fromId`'s transactions to `toId`, then delete `fromId`. Rejects if the server can't be reached. */
  onMove: (fromId: string, toId: string) => Promise<void>
}

type View = { t: 'list' } | { t: 'form'; cat?: WithId<Category> } | { t: 'delete'; cat: WithId<Category> }

/** Manage categories in a sheet: the list (reorder, edit) and the add/edit/delete screens replace it in place. */
export function CategoriesManager({ open, onClose, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Categories">
      {/* Mounted only while open, so it always starts on the list. */}
      <Body {...rest} />
    </Sheet>
  )
}

const asData = (c: WithId<Category>, patch: Partial<Category> = {}): Category => ({
  name: c.name,
  kind: c.kind,
  color: c.color,
  icon: c.icon,
  order: c.order,
  archived: c.archived,
  ...patch,
})

function Body({ categories, onSave, onSwap, isUsed, onDelete, onMove }: Omit<Props, 'open' | 'onClose'>) {
  const [kind, setKind] = useState<Kind>('expense')
  const [view, setView] = useState<View>({ t: 'list' })
  const list = categories.filter((c) => c.kind === kind)
  const toList = () => setView({ t: 'list' })

  if (view.t === 'form') {
    const { cat } = view
    return (
      <Form
        key={cat?.id ?? 'new'}
        initial={cat}
        onCancel={toList}
        onDelete={cat && (() => setView({ t: 'delete', cat }))}
        onRestore={
          cat?.archived
            ? () => {
                onSave(asData(cat, { archived: false }), cat.id)
                toList()
              }
            : undefined
        }
        onSubmit={(data) => {
          onSave(
            cat
              ? asData(cat, data)
              : { ...data, kind, order: Math.max(-1, ...list.map((c) => c.order)) + 1, archived: false },
            cat?.id,
          )
          toList()
        }}
      />
    )
  }

  if (view.t === 'delete') {
    const { cat } = view
    return (
      <DeleteFlow
        cat={cat}
        targets={categories.filter((c) => c.kind === cat.kind && c.id !== cat.id && !c.archived)}
        isUsed={isUsed}
        onDelete={() => {
          onDelete(cat.id)
          toList()
        }}
        onArchive={() => {
          onSave(asData(cat, { archived: true }), cat.id)
          toList()
        }}
        onMove={(toId) => onMove(cat.id, toId).then(toList)}
        onCancel={() => setView({ t: 'form', cat })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-1">
      <Segmented options={kindOptions} value={kind} onChange={setKind} />
      <PillButton size="pill-sm" variant="secondary" onClick={() => setView({ t: 'form' })}>
        <Plus className="size-5" />
        Add category
      </PillButton>
      {list.map((c, i) => (
        <ListRow
          key={c.id}
          icon={<CategoryIcon name={c.icon} color={c.color} tile className={cn(c.archived && 'opacity-50')} />}
          title={c.name}
          subtitle={c.archived ? 'Archived' : undefined}
          trailing={
            <span className="flex shrink-0">
              <IconButton label={`Edit ${c.name}`} onClick={() => setView({ t: 'form', cat: c })}>
                <Pencil className="size-5" />
              </IconButton>
              <IconButton label={`Move ${c.name} up`} disabled={i === 0} onClick={() => onSwap(c, list[i - 1])}>
                <ChevronUp className="size-5" />
              </IconButton>
              <IconButton label={`Move ${c.name} down`} disabled={i === list.length - 1} onClick={() => onSwap(c, list[i + 1])}>
                <ChevronDown className="size-5" />
              </IconButton>
            </span>
          }
        />
      ))}
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={press}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full text-muted-foreground disabled:opacity-30"
    >
      {children}
    </motion.button>
  )
}

type FormProps = {
  initial?: WithId<Category>
  onCancel: () => void
  onSubmit: (data: Pick<Category, 'name' | 'icon' | 'color'>) => void
  /** Edit only: open the delete flow. */
  onDelete?: () => void
  /** Edit of an archived category only. */
  onRestore?: () => void
}

function Form({ initial, onCancel, onSubmit, onDelete, onRestore }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'other')
  const [color, setColor] = useState(initial?.color ?? 'cat-1')
  const trimmed = name.trim()

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-base font-semibold text-muted-foreground">{initial ? 'Edit category' : 'New category'}</p>
      <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={30} autoFocus />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Icon">
        {categoryIconNames.map((n) => (
          <motion.button
            key={n}
            type="button"
            whileTap={press}
            aria-label={n}
            aria-pressed={icon === n}
            onClick={() => setIcon(n)}
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl',
              icon === n ? 'bg-primary text-primary-foreground' : 'bg-secondary',
            )}
          >
            <CategoryIcon name={n} />
          </motion.button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Colour">
        {colorTokens.map((t) => (
          <motion.button
            key={t}
            type="button"
            whileTap={press}
            aria-label={t}
            aria-pressed={color === t}
            onClick={() => setColor(t)}
            style={{ backgroundColor: catColor(t) }}
            className="flex size-11 items-center justify-center rounded-full text-background"
          >
            {color === t && <Check className="size-5" />}
          </motion.button>
        ))}
      </div>
      <PillButton disabled={!trimmed} onClick={() => trimmed && onSubmit({ name: trimmed, icon, color })}>
        Save
      </PillButton>
      {onRestore && (
        <PillButton variant="secondary" onClick={onRestore}>
          Restore category
        </PillButton>
      )}
      <PillButton variant="secondary" onClick={onCancel}>
        Cancel
      </PillButton>
      {onDelete && (
        <PillButton variant="destructive" onClick={onDelete}>
          Delete category
        </PillButton>
      )}
    </div>
  )
}

type DeleteProps = {
  cat: WithId<Category>
  /** Same-kind, non-archived categories that transactions can move to. */
  targets: readonly WithId<Category>[]
  isUsed: Props['isUsed']
  onDelete: () => void
  onArchive: () => void
  onMove: (toId: string) => Promise<void>
  onCancel: () => void
}

type Usage = 'checking' | 'unknown' | 'unused' | 'used'

function DeleteFlow({ cat, targets, isUsed, onDelete, onArchive, onMove, onCancel }: DeleteProps) {
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
        <>
          <p className="text-base">
            Can't tell whether it's in use right now (you may be offline). Deleting could orphan transactions, so
            it's blocked. You can archive it instead.
          </p>
          <ArchiveButton onClick={onArchive} />
        </>
      )}

      {usage === 'unused' && (
        <>
          <p className="text-base">No transactions use it. This can't be undone.</p>
          <PillButton variant="destructive" onClick={onDelete}>
            Delete
          </PillButton>
        </>
      )}

      {usage === 'used' && (
        <>
          <p className="text-base">Transactions use it. Move them to another category, or archive it.</p>
          {targets.length > 0 ? (
            <>
              <CategoryPicker categories={targets} value={target} onChange={setTarget} />
              <PillButton
                disabled={!target || moving}
                onClick={() => {
                  if (!target) return
                  setMoving(true)
                  setMoveFailed(false)
                  onMove(target).catch(() => {
                    setMoving(false)
                    setMoveFailed(true)
                  })
                }}
              >
                {moving ? 'Moving…' : 'Move transactions and delete'}
              </PillButton>
              {moveFailed && <p className="text-base text-destructive">Couldn't reach the server. Nothing was changed.</p>}
            </>
          ) : (
            <p className="text-base text-muted-foreground">There's no other category to move them to.</p>
          )}
          <ArchiveButton onClick={onArchive} />
        </>
      )}

      <PillButton variant="secondary" onClick={onCancel} disabled={moving}>
        Cancel
      </PillButton>
    </div>
  )
}

function ArchiveButton({ onClick }: { onClick: () => void }) {
  return (
    <PillButton variant="secondary" onClick={onClick}>
      Archive (hide from pickers, keep old transactions)
    </PillButton>
  )
}
