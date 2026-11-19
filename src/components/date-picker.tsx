import { useState } from 'react'
import { addYears, format, setMonth as withMonth, setYear as withYear } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dateToISO, isoToDate, longDate, todayISO } from '@/lib/date'
import { cn } from '@/lib/utils'

type Props = {
  /** YYYY-MM-DD */
  value: string
  onChange: (iso: string) => void
  /** Earliest pickable day, YYYY-MM-DD. */
  min?: string
  'aria-label'?: string
  className?: string
}

type View = 'day' | 'month' | 'year'
const YEARS_PER_PAGE = 12
const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM'))
const NAV = 'flex size-11 items-center justify-center rounded-full hover:bg-muted'

type GridItem = { key: number; label: string; active: boolean; today?: boolean; disabled?: boolean; onPick: () => void }

/** Header (title + prev/next) over a 3-column grid; used for both the year and the month view. */
function PickGrid({ title, onTitle, onPrev, onNext, items }: { title: string; onTitle?: () => void; onPrev: () => void; onNext: () => void; items: GridItem[] }) {
  return (
    <div className="w-81">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous" onClick={onPrev} className={NAV}><ChevronLeft className="size-5" /></button>
        <button type="button" onClick={onTitle} disabled={!onTitle} className="h-11 rounded-full px-3 text-base font-medium hover:bg-muted disabled:hover:bg-transparent">{title}</button>
        <button type="button" aria-label="Next" onClick={onNext} className={NAV}><ChevronRight className="size-5" /></button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            disabled={it.disabled}
            onClick={it.onPick}
            className={cn('relative h-11 rounded-full text-base disabled:opacity-40', it.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
          >
            {it.label}
            {it.today && <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Date field that opens a year -> month -> day calendar popover. Same look as TextField. */
export function DatePicker({ value, onChange, min, className, 'aria-label': ariaLabel }: Props) {
  const selected = isoToDate(value)
  const now = isoToDate(todayISO())
  const minDate = min ? isoToDate(min) : undefined
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('day')
  const [month, setMonth] = useState(selected)
  const [yearStart, setYearStart] = useState(selected.getFullYear())

  const toYears = () => {
    setYearStart(month.getFullYear() - (month.getFullYear() % YEARS_PER_PAGE))
    setView('year')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setMonth(selected)
          setView('day')
        }
      }}
    >
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-2xl bg-secondary px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {longDate(value)}
        <CalendarDays className="size-5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-3xl p-3">
        {view === 'day' && (
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(d) => {
              if (!d) return
              onChange(dateToISO(d))
              setOpen(false)
            }}
            components={{
              CaptionLabel: ({ children }) => (
                <button type="button" onClick={toYears} className="h-11 rounded-full px-3 text-base font-medium hover:bg-muted">
                  {children}
                </button>
              ),
            }}
          />
        )}
        {view === 'year' && (
          <PickGrid
            title={`${yearStart} – ${yearStart + YEARS_PER_PAGE - 1}`}
            onPrev={() => setYearStart(yearStart - YEARS_PER_PAGE)}
            onNext={() => setYearStart(yearStart + YEARS_PER_PAGE)}
            items={Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
              const y = yearStart + i
              return {
                key: y,
                label: String(y),
                active: y === month.getFullYear(),
                today: y === now.getFullYear(),
                disabled: minDate !== undefined && y < minDate.getFullYear(),
                onPick: () => {
                  setMonth(withYear(month, y))
                  setView('month')
                },
              }
            })}
          />
        )}
        {view === 'month' && (
          <PickGrid
            title={String(month.getFullYear())}
            onTitle={toYears}
            onPrev={() => setMonth(addYears(month, -1))}
            onNext={() => setMonth(addYears(month, 1))}
            items={MONTHS.map((label, i) => ({
              key: i,
              label,
              active: i === month.getMonth(),
              today: i === now.getMonth() && month.getFullYear() === now.getFullYear(),
              disabled: minDate !== undefined && month.getFullYear() * 12 + i < minDate.getFullYear() * 12 + minDate.getMonth(),
              onPick: () => {
                setMonth(withMonth(month, i))
                setView('day')
              },
            }))}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
