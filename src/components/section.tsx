import type { ReactNode } from 'react'

/** A titled group of rows or fields inside a sheet. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="px-1 text-base font-semibold text-muted-foreground">{title}</h3>}
      {children}
    </section>
  )
}
