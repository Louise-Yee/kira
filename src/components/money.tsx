import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { formatRM } from '@/lib/money'
import { cn } from '@/lib/utils'

type Props = {
  /** Integer sen. */
  sen: number
  /** Show "+" / "−" in front. */
  sign?: boolean
  /** Animate from the previous value (and from 0 on first show). Off with reduced motion. */
  countUp?: boolean
  className?: string
}

export function Money({ sen, sign, countUp, className }: Props) {
  const reduce = useReducedMotion()
  return (
    <span className={cn('tabular-nums', className)}>
      {countUp && !reduce ? <CountUp sen={sen} sign={sign} /> : formatRM(sen, { sign })}
    </span>
  )
}

function CountUp({ sen, sign }: { sen: number; sign?: boolean }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const anim = animate(from.current, sen, {
      type: 'spring',
      duration: 0.8,
      bounce: 0,
      onUpdate: (v) => {
        from.current = v
        setShown(Math.round(v))
      },
    })
    return () => anim.stop()
  }, [sen])
  return formatRM(shown, { sign })
}
