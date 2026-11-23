import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { PillButton } from '@/components/pill-button'
import { SheetActions } from '@/components/sheet-actions'
import { TextField } from '@/components/text-field'
import { catColor, categoryIconNames } from '@/lib/category-icons'
import type { Category, WithId } from '@/lib/db'
import { press } from '@/lib/motion'
import { useTouch } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

const colorTokens = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8']

type FormProps = {
  initial?: WithId<Category>
  onCancel: () => void
  onSubmit: (data: Pick<Category, 'name' | 'icon' | 'color'>) => void
  /** Edit only: open the delete flow. */
  onDelete?: () => void
  /** Edit of an archived category only. */
  onRestore?: () => void
}

export function CategoryForm({ initial, onCancel, onSubmit, onDelete, onRestore }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? 'other')
  const [color, setColor] = useState(initial?.color ?? 'cat-1')
  const touch = useTouch()
  const trimmed = name.trim()

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-base font-semibold text-muted-foreground">{initial ? 'Edit category' : 'New category'}</p>
      <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" maxLength={30} autoFocus={!touch} />
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
      {onRestore && (
        <PillButton variant="secondary" onClick={onRestore}>
          Restore category
        </PillButton>
      )}
      <SheetActions
        disabled={!trimmed}
        hint="Enter a name."
        onSave={() => trimmed && onSubmit({ name: trimmed, icon, color })}
        extras={[{ label: 'Cancel', onClick: onCancel }]}
        onDelete={onDelete}
        deleteLabel="Delete category"
        confirmDelete={false}
      />
    </div>
  )
}
