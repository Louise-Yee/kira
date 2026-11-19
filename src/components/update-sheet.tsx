import { useState } from 'react'
import { Sheet } from '@/components/sheet'
import { SheetActions } from '@/components/sheet-actions'
import { APP_VERSION, installUpdate, type Update } from '@/lib/update'

type Props = { open: boolean; update: Update | null; onLater: () => void }
type Phase = { kind: 'idle' } | { kind: 'downloading'; percent: number } | { kind: 'permission' } | { kind: 'error' }

/** A newer release on GitHub. Forced: no "Later", and the sheet can't be dismissed. */
export function UpdateSheet({ open, update, onLater }: Props) {
  const forced = update?.forced ?? false
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const busy = phase.kind === 'downloading'

  const start = async () => {
    if (!update) return
    setPhase({ kind: 'downloading', percent: 0 })
    try {
      const result = await installUpdate(update.release, (percent) => setPhase({ kind: 'downloading', percent }))
      setPhase(result === 'permission' ? { kind: 'permission' } : { kind: 'idle' })
    } catch {
      setPhase({ kind: 'error' })
    }
  }

  return (
    <Sheet open={open && !!update} onClose={forced || busy ? () => {} : onLater} title={forced ? 'Update required' : 'Update available'}>
      {update && (
        <div className="flex flex-col gap-3 pb-1">
          <SheetActions
            label={busy ? (phase.kind === 'downloading' && phase.percent >= 0 ? `Downloading ${phase.percent}%` : 'Downloading…') : 'Update'}
            disabled={busy}
            onSave={start}
            extras={!forced && !busy ? [{ label: 'Later', onClick: onLater }] : undefined}
          />
          <p className="text-base">
            {forced
              ? `This version of kira (v${APP_VERSION}) is no longer supported. Install v${update.release.version} to keep using the app.`
              : `kira v${update.release.version} is out. You're on v${APP_VERSION}.`}
          </p>
          {phase.kind === 'permission' ? (
            <p className="text-base text-muted-foreground">Allow kira to install apps in the screen that just opened, come back, and tap Update again.</p>
          ) : phase.kind === 'error' ? (
            <p className="text-base text-destructive">The download failed. Check your connection and try again.</p>
          ) : (
            <p className="text-base text-muted-foreground">Downloads here, then Android asks you to confirm the install. Your data stays as it is.</p>
          )}
          {busy && (
            <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.max(phase.percent, 0)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(phase.percent, 0)}%` }} />
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
