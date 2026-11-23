import { useLayoutEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { LucideIcon } from "lucide-react";
import { select } from "@/lib/haptics";
import { press, soft } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

export type TabItem<Id extends string> = {
  id: Id;
  label: string;
  icon: LucideIcon;
  /** A count dot on the icon when above 0. */ badge?: number;
};

type Props<Id extends string> = {
  tabs: readonly TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
  /** Sidebar layout at lg (nav position left/right). */
  side: boolean;
  /** How far a tab swipe has dragged, in tabs (from `useTabSwipe`): the highlight follows it. */
  drag?: MotionValue<number>;
  /** The tab was reached by a swipe: the highlight is already there, so it doesn't animate over again. */
  cut?: boolean;
};

export function TabBar<Id extends string>({
  tabs,
  active: current,
  onChange,
  side,
  drag,
  cut,
}: Props<Id>) {
  const vertical = useMediaQuery("(min-width: 1024px)") && side;
  const reduce = useReducedMotion();
  const index = tabs.findIndex((t) => t.id === current);
  // The highlight lives in the active tab and is shifted by whole tabs: `shift` springs from the previous tab to 0 on a
  // tap, and the swipe's drag is added on top, so it moves with the finger and lands without a jump.
  const shift = useMotionValue(0);
  const prev = useRef(index);
  useLayoutEffect(() => {
    const from = prev.current - index;
    prev.current = index;
    if (!from || cut || reduce) return shift.set(0);
    shift.set(from + shift.get());
    void animate(shift, 0, soft);
  }, [index, cut, reduce, shift]);
  const fallback = useMotionValue(0);
  const steps = useTransform(() => shift.get() + (drag ?? fallback).get());
  // One step is a tab plus the gap between tabs (gap-0.5 across, gap-1 down the sidebar).
  const offset = useTransform(
    steps,
    (n) => `calc(${n * 100}% + ${n * (vertical ? 4 : 2)}px)`
  );
  return (
    <>
      {/* Blurs content under the system navigation bar, so it doesn't show through it. Phones and tablets only. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-(--inset-bottom) bg-background/60 backdrop-blur-xl lg:hidden"
      />
      <nav
        className={cn(
          // Floating glass pill, centered above the safe area.
          "fixed inset-x-0 bottom-[max(1rem,var(--inset-bottom))] z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-0.5 rounded-full border border-glass-edge bg-glass p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150",
          // Sidebar at lg when the user picks left/right.
          side &&
            "lg:sticky lg:inset-x-auto lg:top-6 lg:bottom-auto lg:mx-0 lg:h-fit lg:w-56 lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none lg:backdrop-saturate-100"
        )}
      >
        {tabs.map((t) => {
          const active = current === t.id;
          return (
            <motion.button
              key={t.id}
              whileTap={press}
              onClick={() => {
                if (!active) select();
                onChange(t.id);
              }}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-14 w-[4.5rem] min-w-0 items-center justify-center rounded-full text-base font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
                side &&
                  "lg:h-12 lg:w-auto lg:justify-start lg:rounded-2xl lg:px-4"
              )}
            >
              {active && (
                <motion.span
                  style={vertical ? { y: offset } : { x: offset }}
                  // Behind every tab's icon, whichever tab it is passing over.
                  className={cn(
                    "absolute inset-0 -z-10 rounded-full bg-foreground/10",
                    side && "lg:rounded-2xl"
                  )}
                >
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-foreground",
                      side && "lg:hidden"
                    )}
                  />
                </motion.span>
              )}
              <span className="relative">
                <t.icon className="size-6 shrink-0 lg:size-5" />
                {!!t.badge && (
                  <span
                    className="absolute -top-0.5 -right-1 size-3 rounded-full bg-destructive"
                    aria-label={`${t.badge} new`}
                  />
                )}
              </span>
              <span
                className={cn("relative hidden", side && "lg:block lg:pl-3")}
              >
                {t.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
