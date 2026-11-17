import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
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
}

/** Manage categories in a sheet: list (reorder, edit) and an add/edit form that replaces it in place. */
export function CategoriesManager({ open, onClose, ...rest }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Categories">
      {/* Mounted only while open, so it always starts on the list. */}
      <Body {...rest} />
    </Sheet>
  )
}

function Body({ categories, onSave, onSwap }: Omit<Props, 'open' | 'onClose'>) {
  const [kind, setKind] = useState<Kind>('expense')
  // 'new' = add form, a category = edit form, null = the list.
  const [form, setForm] = useState<'new' | WithId<Category> | null>(null)
  const list = categories.filter((c) => c.kind === kind)

  if (form) {
    return (
      <Form
        key={form === 'new' ? 'new' : form.id}
        initial={form === 'new' ? undefined : form}
        onCancel={() => setForm(null)}
        onSubmit={(data) => {
          onSave(
            form === 'new'
              ? { ...data, kind, order: Math.max(-1, ...list.map((c) => c.order)) + 1, archived: false }
              : { ...data, kind: form.kind, order: form.order, archived: form.archived },
            form === 'new' ? undefined : form.id,
          )
          setForm(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-1">
      <Segmented options={kindOptions} value={kind} onChange={setKind} />
      <PillButton size="pill-sm" variant="secondary" onClick={() => setForm('new')}>
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
              <IconButton label={`Edit ${c.name}`} onClick={() => setForm(c)}>
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

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
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
}

function Form({ initial, onCancel, onSubmit }: FormProps) {
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
      <PillButton variant="secondary" onClick={onCancel}>
        Cancel
      </PillButton>
    </div>
  )
}
