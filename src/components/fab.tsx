import { Plus } from 'lucide-react'
import { PillButton } from '@/components/pill-button'

type Props = { label: string; onClick: () => void }

/** Floating "+" above the tab bar on phones (thumb reach); inline with a label at lg. */
export function Fab({ label, onClick }: Props) {
  return (
    <PillButton
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.75rem)] z-10 size-14 gap-2 px-0 shadow-lg lg:static lg:size-auto lg:px-7 lg:shadow-none"
    >
      <Plus className="size-6" />
      <span className="hidden lg:inline">{label}</span>
    </PillButton>
  )
}
