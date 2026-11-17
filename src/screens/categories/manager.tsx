import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { ListRow } from '@/components/list-row'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
import { Sheet } from '@/components/sheet'
import type { Category, Kind, WithId } from '@/lib/db'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { CategoryForm } from './category-form'
import { DeleteFlow } from './delete-flow'

const kindOptions = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const satisfies readonly { value: Kind; label: string }[]

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
      <CategoryForm
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
