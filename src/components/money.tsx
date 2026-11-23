import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

type Props = {
  /** Integer sen (minor units of `currency`). */
  sen: number
  /** ISO code; RM when absent. */
  currency?: string
  /** Show "+" / "−" in front. */
  sign?: boolean
  /** Animate from the previous value (and from 0 on first show). Off with reduced motion. */
  countUp?: boolean
  className?: string
}

export function Money({ sen, currency, sign, countUp, className }: Props) {
  const reduce = useReducedMotion()
  return (
    <span className={cn('tabular-nums', className)}>
      {countUp && !reduce ? <CountUp sen={sen} currency={currency} sign={sign} /> : formatMoney(sen, currency, { sign })}
    </span>
  )
}

function CountUp({ sen, currency, sign }: Pick<Props, 'sen' | 'currency' | 'sign'>) {
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
  return formatMoney(shown, currency, { sign })
}
