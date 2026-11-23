import { useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { select } from '@/lib/haptics'
import { press, soft } from '@/lib/motion'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

export type TabItem<Id extends string> = { id: Id; label: string; icon: LucideIcon; /** A count dot on the icon when above 0. */ badge?: number }

type Props<Id extends string> = {
  tabs: readonly TabItem<Id>[]
  active: Id
  onChange: (id: Id) => void
  /** Sidebar layout at lg (nav position left/right). */
  side: boolean
  /** How far a tab swipe has dragged, in tabs (from `useTabSwipe`): the highlight follows it. */
  drag?: MotionValue<number>
  /** The tab was reached by a swipe: the highlight is already there, so it doesn't animate over again. */
  cut?: boolean
}

/** An icon-only tab in the phone pill, in px: as wide as fits between these (44px is the touch target). The active tab grows by its label. */
const MIN_BASE = 44
const MAX_BASE = 56
/** What the pill spends besides tabs: 1rem screen margin each side, p-1, the 1px border. */
const PILL_CHROME = 32 + 8 + 2
/** Gap between tabs (gap-0.5), in px. */
const GAP = 2

/** How much of tab `i`'s label shows at highlight position `pos`: 1 on it, 0 a tab away, in between mid-swipe. */
const reveal = (i: number, pos: number) => Math.max(0, 1 - Math.abs(pos - i))

export function TabBar<Id extends string>({ tabs, active: current, onChange, side, drag, cut }: Props<Id>) {
  const vertical = useMediaQuery('(min-width: 1024px)') && side
  const reduce = useReducedMotion()
  const index = tabs.findIndex((t) => t.id === current)
  // The highlight lives in the active tab and is shifted by whole tabs: `shift` springs from the previous tab to 0 on a
  // tap, and the swipe's drag is added on top, so it moves with the finger and lands without a jump.
  const shift = useMotionValue(0)
  const prev = useRef(index)
  useLayoutEffect(() => {
    const from = prev.current - index
    prev.current = index
    if (!from || cut || reduce) return shift.set(0)
    shift.set(from + shift.get())
    void animate(shift, 0, soft)
  }, [index, cut, reduce, shift])
  const fallback = useMotionValue(0)
  const steps = useTransform(() => shift.get() + (drag ?? fallback).get())
  // One step is a tab plus the gap between tabs (gap-0.5 across, gap-1 down the sidebar).
  const offset = useTransform(steps, (n) => `calc(${n * 100}% + ${n * 4}px)`)
  // Phone pill: the active tab shows its label beside the icon. Tab widths, labels and the highlight all follow one
  // position (a whole tab when still, fractional mid-swipe), so the pill keeps its width and the label morphs across.
  const pos = useTransform(() => Math.min(tabs.length - 1, Math.max(0, index + steps.get())))
  const labels = useRef<(HTMLSpanElement | null)[]>([])
  const [grow, setGrow] = useState<number[]>([])
  const [base, setBase] = useState(MAX_BASE)
  const names = tabs.map((t) => t.label).join()
  useLayoutEffect(() => {
    const measure = () => {
      const widths = labels.current.map((el) => el?.offsetWidth ?? 0)
      setGrow(widths)
      // The icon-only tabs share what's left once the longest label fits, so the pill never outgrows the screen.
      const room = window.innerWidth - PILL_CHROME - GAP * (tabs.length - 1) - Math.max(0, ...widths)
      setBase(Math.min(MAX_BASE, Math.max(MIN_BASE, Math.floor(room / tabs.length))))
    }
    measure()
    // Measured again once the web font is in (the fallback font has different widths) and when the screen turns.
    void document.fonts.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // vertical: the labels only exist (to measure) in the pill.
  }, [names, tabs.length, vertical])
  const widthAt = (i: number, p: number) => base + (grow[i] ?? 0) * reveal(i, p)
  const highlightX = useTransform(pos, (p) => {
    const k = Math.floor(p)
    let x = 0
    for (let j = 0; j < k; j++) x += widthAt(j, p) + GAP
    return x + (p - k) * (widthAt(k, p) + GAP)
  })
  const highlightW = useTransform(pos, (p) => {
    const k = Math.floor(p)
    const t = p - k
    return k + 1 < tabs.length ? widthAt(k, p) * (1 - t) + widthAt(k + 1, p) * t : widthAt(k, p)
  })
  return (
    <>
      {/* Blurs content under the system navigation bar, so it doesn't show through it. Phones and tablets only. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-(--inset-bottom) bg-background/60 backdrop-blur-xl lg:hidden" />
      <nav
      className={cn(
        // Floating glass pill, centered above the safe area.
        'fixed inset-x-0 bottom-[max(1rem,var(--inset-bottom))] z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-0.5 rounded-full border border-glass-edge bg-glass p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150',
        // Sidebar at lg when the user picks left/right.
        side &&
          'lg:sticky lg:inset-x-auto lg:top-6 lg:bottom-auto lg:mx-0 lg:h-fit lg:w-56 lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none lg:backdrop-saturate-100',
      )}
    >
      {!vertical && (
        <motion.span
          aria-hidden
          style={{ x: highlightX, width: highlightW }}
          className="absolute top-1 bottom-1 left-1 rounded-full bg-foreground/10"
        >
          <span className="absolute bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-foreground" />
        </motion.span>
      )}
      {tabs.map((t, i) => (
        <Tab
          key={t.id}
          tab={t}
          i={i}
          active={current === t.id}
          vertical={vertical}
          side={side}
          pos={pos}
          base={base}
          grow={grow[i] ?? 0}
          offset={offset}
          labelRef={(el) => {
            labels.current[i] = el
          }}
          onClick={() => {
            if (current !== t.id) select()
            onChange(t.id)
          }}
        />
      ))}
      </nav>
    </>
  )
}

type TabProps = {
  tab: TabItem<string>
  i: number
  active: boolean
  vertical: boolean
  side: boolean
  /** The highlight's position, in tabs. */
  pos: MotionValue<number>
  /** The icon-only width, in px. */
  base: number
  /** The label's width (with its gap): how much this tab grows when active. */
  grow: number
  /** The sidebar highlight's shift from the active tab. */
  offset: MotionValue<string>
  labelRef: (el: HTMLSpanElement | null) => void
  onClick: () => void
}

function Tab({ tab: t, i, active, vertical, side, pos, base, grow, offset, labelRef, onClick }: TabProps) {
  const width = useTransform(pos, (p) => base + grow * reveal(i, p))
  const labelWidth = useTransform(pos, (p) => grow * reveal(i, p))
  const labelOpacity = useTransform(pos, (p) => reveal(i, p))
  return (
    <motion.button
      whileTap={press}
      onClick={onClick}
      aria-label={t.label}
      aria-current={active ? 'page' : undefined}
      // 'auto' rather than no style: motion keeps an inline width it set until told otherwise (phone -> sidebar on resize).
      style={{ width: vertical ? 'auto' : width }}
      className={cn(
        'relative flex h-14 min-w-0 shrink-0 items-center justify-center rounded-full text-base font-semibold',
        active ? 'text-foreground' : 'text-muted-foreground',
        side && 'lg:h-12 lg:w-auto lg:justify-start lg:rounded-2xl lg:px-4',
      )}
    >
      {vertical && active && (
        // Behind every tab's icon, whichever tab it is passing over.
        <motion.span style={{ y: offset }} className="absolute inset-0 -z-10 rounded-2xl bg-foreground/10" />
      )}
      <span className="relative">
        <t.icon className="size-6 shrink-0 lg:size-5" />
        {!!t.badge && <span className="absolute -top-0.5 -right-1 size-3 rounded-full bg-destructive" aria-label={`${t.badge} new`} />}
      </span>
      {vertical ? (
        <span className="relative pl-3">{t.label}</span>
      ) : (
        <motion.span aria-hidden style={{ width: labelWidth, opacity: labelOpacity }} className="overflow-hidden">
          <span ref={labelRef} className="block w-max pl-2 whitespace-nowrap">
            {t.label}
          </span>
        </motion.span>
      )}
    </motion.button>
  )
}
