import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import { useBlink } from '@/lib/use-blink'
import { cn } from '@/lib/utils'

const COPIED = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'letterSpacing', 'fontVariantNumeric', 'fontFeatureSettings', 'fontVariationSettings'] as const

/**
 * The standard single-line input (note, date, names).
 * Draws its own caret (the bar from `.text-caret`) so it matches the amount's; types the browser
 * can't report a caret for (email) keep the native one.
 */
export function TextField({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  const ref = useRef<HTMLInputElement>(null)
  const { restart, stop } = useBlink(ref, '--caret-a')
  const sync = useRef(() => {})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Hidden twin of the field's text; its width is where the caret goes.
    const ruler = document.createElement('span')
    ruler.setAttribute('aria-hidden', 'true')
    ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none'
    document.body.append(ruler)
    let lastX = NaN
    const hide = () => {
      el.style.setProperty('--caret-x', '-9999px')
      lastX = NaN
      stop()
    }
    sync.current = () => {
      const start = el.selectionStart
      if (start === null) {
        delete el.dataset.caret
        return hide()
      }
      el.dataset.caret = ''
      if (document.activeElement !== el || start !== el.selectionEnd) return hide()
      const cs = getComputedStyle(el)
      for (const k of COPIED) ruler.style[k] = cs[k]
      const width = (text: string) => {
        ruler.textContent = text
        return ruler.getBoundingClientRect().width
      }
      const padLeft = parseFloat(cs.paddingLeft)
      const inner = el.clientWidth - padLeft - parseFloat(cs.paddingRight)
      const free = Math.max(0, inner - width(el.value))
      const offset = cs.textAlign === 'center' ? free / 2 : cs.textAlign === 'right' || cs.textAlign === 'end' ? free : 0
      const x = padLeft + offset + width(el.value.slice(0, start)) - el.scrollLeft
      if (x < padLeft - 1 || x > padLeft + inner + 1) return hide()
      el.style.setProperty('--caret-x', `${x}px`)
      if (x !== lastX) restart()
      lastX = x
    }
    const run = () => sync.current()
    const events = ['focus', 'blur', 'input', 'keyup', 'pointerup', 'select', 'scroll'] as const
    for (const e of events) el.addEventListener(e, run)
    document.addEventListener('selectionchange', run)
    run()
    return () => {
      for (const e of events) el.removeEventListener(e, run)
      document.removeEventListener('selectionchange', run)
      ruler.remove()
    }
  }, [restart, stop])

  // A value changed from outside (a reset, a paste handler) moves the caret without an input event.
  useEffect(() => sync.current(), [props.value])

  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        'text-caret h-12 w-full rounded-2xl bg-secondary px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring data-caret:caret-transparent',
        className,
      )}
    />
  )
}
