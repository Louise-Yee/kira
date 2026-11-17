import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { PillButton } from '@/components/pill-button'

type Props = { label: string; onClick: () => void }

/**
 * Floating "+" at the bottom right: above the tab bar on phones (thumb reach), with its label at lg.
 * Always rendered in a portal: the page wrapper slides with a transform while tabs change, and a transformed
 * ancestor makes `fixed` relative to it, so the button would ride along and then jump.
 * When the sidebar is on the right (`data-nav` on <html>, set by the shell) it moves left of the sidebar.
 */
export function Fab({ label, onClick }: Props) {
  return createPortal(
    <PillButton
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.75rem)] z-10 size-14 gap-2 px-0 shadow-lg lg:right-6 lg:bottom-6 lg:h-14 lg:w-fit lg:px-7 in-data-[nav=right]:lg:right-[calc(max(0px,(100vw-64rem)/2)+17.5rem)]"
    >
      <Plus className="size-6" />
      <span className="hidden lg:inline">{label}</span>
    </PillButton>,
    document.body,
  )
}
