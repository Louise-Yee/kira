import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { soft } from '@/lib/motion'

/**
 * Blinks a caret with springs: `opacity` on the element, or the `--caret-a` CSS variable (what `.text-caret` reads).
 * `restart` makes it solid and starts the cycle again (call it when the caret moves); `stop` ends the cycle.
 * Under reduced motion it stays solid.
 */
export function useBlink(ref: RefObject<HTMLElement | null>, prop: 'opacity' | '--caret-a') {
  const reduce = useReducedMotion()
  const timer = useRef(0)
  const stop = useCallback(() => window.clearInterval(timer.current), [])
  const restart = useCallback(() => {
    window.clearInterval(timer.current)
    const el = ref.current
    if (!el) return
    const to = (v: number) => (prop === 'opacity' ? { opacity: v } : { '--caret-a': v })
    animate(el, to(1), soft)
    if (reduce) return
    let on = true
    timer.current = window.setInterval(() => {
      on = !on
      animate(el, to(on ? 1 : 0), soft)
    }, 530)
  }, [ref, prop, reduce])
  useEffect(() => stop, [stop])
  return { restart, stop }
}
