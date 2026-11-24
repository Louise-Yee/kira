import { useEffect, useState, type RefObject } from 'react'
import { Delete } from 'lucide-react'
import { motion } from 'motion/react'
import { SheetFooter } from '@/components/sheet'
import { press as tap } from '@/lib/haptics'
import { press } from '@/lib/motion'
import { type Key } from '@/lib/money'

const KEYS: (Key | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'back']

type Props = {
  onKey: (key: Key) => void
  /** The amount field this pad types into; the pad steps aside while any other field has focus (it has its own keyboard). */
  field: RefObject<HTMLInputElement | null>
}

/** The amount keypad, pinned above a sheet's actions, so the OS keyboard never opens for the amount (touch screens). */
export function Numpad({ onKey, field }: Props) {
  const [away, setAway] = useState(false)
  useEffect(() => {
    const focused = (e: FocusEvent) => setAway(e.target instanceof HTMLInputElement && e.target !== field.current)
    const blurred = () => setAway(false)
    document.addEventListener('focusin', focused)
    document.addEventListener('focusout', blurred)
    return () => {
      document.removeEventListener('focusin', focused)
      document.removeEventListener('focusout', blurred)
    }
  }, [field])
  if (away) return null
  return (
    <SheetFooter>
      {/* order-first: above the Save row, which is the same footer. */}
      <div role="group" aria-label="Keypad" className="order-first grid grid-cols-3 gap-1 pb-1">
        {KEYS.map((k, i) =>
          k === null ? (
            <span key={i} />
          ) : (
            <motion.button
              key={k}
              type="button"
              whileTap={press}
              aria-label={k === 'back' ? 'Delete' : k}
              onPointerDown={tap}
              onClick={() => onKey(k)}
              className="flex h-12 items-center justify-center rounded-2xl font-heading text-2xl font-bold active:bg-secondary"
            >
              {k === 'back' ? <Delete className="size-6" aria-hidden /> : k}
            </motion.button>
          ),
        )}
      </div>
    </SheetFooter>
  )
}
