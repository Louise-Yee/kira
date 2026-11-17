import { useEffect } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
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
  const value = useSpring(0, { duration: 0.8, bounce: 0 })
  useEffect(() => value.set(sen), [value, sen])
  const text = useTransform(value, (v) => formatRM(Math.round(v), { sign }))
  return <motion.span>{text}</motion.span>
}
