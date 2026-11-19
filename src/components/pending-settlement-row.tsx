import type { ReactNode } from 'react'
import { PillButton } from '@/components/pill-button'

type Props = {
  title: string
  subtitle: ReactNode
  /** Shown to the person who was paid. */
  onConfirm?: () => void
  /** Undo (the payer) or "Not received" (the person paid). */
  takeBack?: { label: string; onClick: () => void }
}

/** One settle-up payment waiting to be confirmed, with its actions. The buttons wrap under the text so a name is never cut short. */
export function PendingSettlementRow({ title, subtitle, onConfirm, takeBack }: Props) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-3 rounded-2xl bg-card p-3">
      <span className="min-w-48 flex-1">
        <span className="block truncate text-base font-semibold">{title}</span>
        <span className="block truncate text-base text-muted-foreground">{subtitle}</span>
      </span>
      {onConfirm && (
        <PillButton size="pill-sm" onClick={onConfirm}>
          Got it
        </PillButton>
      )}
      {takeBack && (
        <PillButton variant="secondary" size="pill-sm" onClick={takeBack.onClick}>
          {takeBack.label}
        </PillButton>
      )}
    </div>
  )
}
