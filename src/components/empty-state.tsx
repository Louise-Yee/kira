import type { LucideIcon } from 'lucide-react'
import { PillButton } from '@/components/pill-button'

type Props = { icon: LucideIcon; text: string; action?: { label: string; onClick: () => void } }

export function EmptyState({ icon: Icon, text, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="max-w-64 text-base text-muted-foreground">{text}</p>
      {action && (
        <PillButton size="pill-sm" onClick={action.onClick}>
          {action.label}
        </PillButton>
      )}
    </div>
  )
}
