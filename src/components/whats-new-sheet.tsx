import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import type { ChangelogEntry } from '@/lib/changelog'

type Props = { open: boolean; onClose: () => void; entries: readonly ChangelogEntry[] }

/** What changed in each version, newest first: after an update (only what's new) and from Settings (everything). */
export function WhatsNewSheet({ open, onClose, entries }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="What's new">
      <div className="flex flex-col gap-6 pb-1">
        {entries.map((e) => (
          <section key={e.version} className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-muted-foreground">Version {e.version}</h3>
            {e.items.map((item) => (
              <div key={item.title} className="flex flex-col gap-1">
                <p className="font-heading text-lg font-semibold">{item.title}</p>
                <p className="text-base text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </section>
        ))}
        <SheetActions label="Got it" onSave={onClose} />
      </div>
    </Sheet>
  )
}
