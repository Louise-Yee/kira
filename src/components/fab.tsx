import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { PillButton } from '@/components/pill-button'
import { FabSlideContext } from '@/lib/fab-slide'
import { press } from '@/lib/haptics'
import { soft } from '@/lib/motion'

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
  const slide = useContext(FabSlideContext)
  return createPortal(
    <PillButton
      // Tick on press, not click: the sheet it opens ticks on open, so the two read as down-up instead of one smear.
      onPointerDown={() => press()}
      onClick={onClick}
      // Slides in/out from the right only when going to/from Settings (portal keeps the presence context).
      initial={slide ? { x: '150%', opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      exit={slide ? { x: '150%', opacity: 0 } : undefined}
      transition={soft}
      aria-label={label}
      className="fixed transition-colors right-5 bottom-[calc(max(1rem,var(--inset-bottom))+4.75rem)] z-10 size-14 gap-2 px-0 shadow-lg lg:right-[calc(max(0px,(100vw-64rem)/2)+1.5rem)] lg:bottom-6 lg:h-14 lg:w-fit lg:px-7 in-data-[nav=right]:lg:right-[calc(max(0px,(100vw-64rem)/2)+17.5rem)] in-data-[nav=bottom]:lg:right-[calc(max(0px,(100vw-64rem)/2)+2.75rem)]"
    >
      <Plus className="size-6" />
      <span className="hidden lg:inline">{label}</span>
    </PillButton>,
    document.body,
  )
}
