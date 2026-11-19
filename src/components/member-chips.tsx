import { motion } from 'motion/react'
import { Avatar } from '@/components/avatar'
import { press } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type Person = { uid: string; name: string; photoURL: string | null }

type Props = {
  people: readonly Person[]
  /** The picked uids. */
  selected: readonly string[]
  onToggle: (uid: string) => void
  /** Names the group of chips for screen readers ("Paid by", "Split between"). */
  label: string
}

/** A wrapping row of people to pick from. Single pick or many is up to `onToggle`; each chip shows its state. */
export function MemberChips({ people, selected, onToggle, label }: Props) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {people.map((p) => {
        const on = selected.includes(p.uid)
        return (
          <motion.button
            key={p.uid}
            type="button"
            whileTap={press}
            aria-pressed={on}
            onClick={() => onToggle(p.uid)}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full pr-4 pl-2 text-base font-semibold',
              on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
            )}
          >
            <Avatar photoURL={p.photoURL} name={p.name} className="size-7 text-base" />
            <span className="max-w-32 truncate">{p.name}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
