import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { PillButton } from '@/components/pill-button'
import { useMediaQuery } from '@/lib/use-media-query'

type Props = { label: string; onClick: () => void }

/**
 * Floating "+" above the tab bar on phones (thumb reach); inline with a label at lg.
 * On phones it renders in a portal: the page wrapper slides with a transform while tabs change, and a
 * transformed ancestor makes `fixed` relative to it, so the button would ride along and then jump.
 */
export function Fab({ label, onClick }: Props) {
  const lg = useMediaQuery('(min-width: 1024px)')
  const button = (
    <PillButton
      onClick={onClick}
      aria-label={label}
      className="fixed right-5 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.75rem)] z-10 size-14 gap-2 px-0 shadow-lg lg:static lg:h-14 lg:w-fit lg:px-7 lg:shadow-none"
    >
      <Plus className="size-6" />
      <span className="hidden lg:inline">{label}</span>
    </PillButton>
  )
  return lg ? button : createPortal(button, document.body)
}
