import { catColor, categoryIcons } from '@/lib/category-icons'
import { cn } from '@/lib/utils'

type Props = {
  /** Key from the fixed icon list; unknown keys fall back to "other". */
  name: string
  /** Colour token ("cat-1".."cat-8"). Omit to inherit the text colour. */
  color?: string
  /** Wrap in a tinted rounded tile (list rows). Without it, just the coloured icon (chips). */
  tile?: boolean
  className?: string
}

export function CategoryIcon({ name, color, tile, className }: Props) {
  const Icon = name in categoryIcons ? categoryIcons[name as keyof typeof categoryIcons] : categoryIcons.other
  const c = color ? catColor(color) : 'currentColor'
  if (!tile) return <Icon className={cn('size-5 shrink-0', className)} style={{ color: c }} aria-hidden />
  return (
    <span
      className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', className)}
      style={{ color: c, backgroundColor: `color-mix(in oklch, ${c} 16%, transparent)` }}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
