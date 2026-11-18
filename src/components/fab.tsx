import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { PillButton } from '@/components/pill-button'

type Props = { label: string; onClick: () => void }

/**
 * Floating "+" at the bottom right: above the tab bar on phones (thumb reach), with its label at lg.
 * Always rendered in a portal: the page wrapper slides with a transform while tabs change, and a transformed
 * ancestor makes `fixed` relative to it, so the button would ride along and then jump.
 * At lg it lines up with the right edge of the content column (the shell is max-w-5xl with p-6), not the
 * window edge. The offsets depend on the nav position (`data-nav` on <html>, set by the shell): with a right
 * sidebar the content ends 14rem + gap earlier, and with the bottom nav the page keeps its own px-5.
 */
export function Fab({ label, onClick }: Props) {
  return createPortal(
    <PillButton
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(max(1rem,var(--inset-bottom))+4.75rem)] z-10 size-14 gap-2 px-0 shadow-lg lg:right-[calc(max(0px,(100vw-64rem)/2)+1.5rem)] lg:bottom-6 lg:h-14 lg:w-fit lg:px-7 in-data-[nav=right]:lg:right-[calc(max(0px,(100vw-64rem)/2)+17.5rem)] in-data-[nav=bottom]:lg:right-[calc(max(0px,(100vw-64rem)/2)+2.75rem)]"
    >
      <Plus className="size-6" />
      <span className="hidden lg:inline">{label}</span>
    </PillButton>,
    document.body,
  )
}
