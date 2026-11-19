import { useState } from 'react'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { TextField } from '@/components/text-field'
import { MAX_NAME, cleanGroupName } from '@/lib/groups'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  /** The current name when renaming. */
  initial?: string
  label: string
  onSave: (name: string) => void
}

/** Name a new group or rename one. */
export function GroupNameSheet({ open, onClose, title, initial = '', label, onSave }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Mounted only while open, so the field starts from the current name each time. */}
      <Body onClose={onClose} initial={initial} label={label} onSave={onSave} />
    </Sheet>
  )
}

function Body({ onClose, initial = '', label, onSave }: Omit<Props, 'open' | 'title'>) {
  const [name, setName] = useState(initial)
  const clean = cleanGroupName(name)
  const save = () => {
    if (!clean) return
    onSave(clean)
    onClose()
  }
  return (
    <form
      className="flex flex-col gap-4 pb-1"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <TextField
        autoFocus
        value={name}
        maxLength={MAX_NAME}
        placeholder="Dorm, Dungeon, Trip…"
        aria-label="Group name"
        onChange={(e) => setName(e.target.value)}
      />
      <SheetActions label={label} disabled={!clean} onSave={save} />
    </form>
  )
}
