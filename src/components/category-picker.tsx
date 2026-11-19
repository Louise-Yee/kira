import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { CategoryIcon } from '@/components/category-icon'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Item = { id: string; name: string; icon: string; color: string }

type Props = { categories: readonly Item[]; value: string | null; onChange: (id: string) => void }

/** Searchable single-select dropdown. Callers filter out archived categories. */
export function CategoryPicker({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = categories.find((c) => c.id === value)
  const q = query.trim().toLowerCase()
  const shown = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setQuery('')
      }}
    >
      <PopoverTrigger
        type="button"
        aria-label="Category"
        className="flex h-12 w-full items-center gap-3 rounded-2xl bg-secondary px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selected ? (
          <>
            <CategoryIcon name={selected.icon} color={selected.color} />
            <span className="min-w-0 flex-1 truncate text-left font-semibold">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">Category</span>
        )}
        <ChevronDown className="size-5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-2 rounded-3xl p-2">
        <div className="flex h-11 items-center gap-2 rounded-full bg-secondary px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search categories"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto overscroll-contain">
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                }}
                className={cn('flex h-11 w-full items-center gap-3 rounded-full px-3 text-base hover:bg-muted', c.id === value && 'font-semibold')}
              >
                <CategoryIcon name={c.icon} color={c.color} />
                <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
                {c.id === value && <Check className="size-5 text-primary" aria-hidden />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-3 text-base text-muted-foreground">No match</li>}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
