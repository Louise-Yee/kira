import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { APP_VERSION, downloadUpdate, type Update } from '@/lib/update'

type Props = { open: boolean; update: Update | null; onLater: () => void }

/** A newer release on GitHub. Forced: no "Later", and the sheet can't be dismissed. */
export function UpdateSheet({ open, update, onLater }: Props) {
  const forced = update?.forced ?? false
  return (
    <Sheet open={open && !!update} onClose={forced ? () => {} : onLater} title={forced ? 'Update required' : 'Update available'}>
      {update && (
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-base">
            {forced
              ? `This version of kira (v${APP_VERSION}) is no longer supported. Install v${update.release.version} to keep using the app.`
              : `kira v${update.release.version} is out. You're on v${APP_VERSION}.`}
          </p>
          <p className="text-base text-muted-foreground">
            The download opens in your browser. Tap it to install; your data stays as it is.
          </p>
          <PillButton className="mt-2" onClick={() => downloadUpdate(update.release)}>
            Download update
          </PillButton>
          {!forced && (
            <PillButton variant="secondary" onClick={onLater}>
              Later
            </PillButton>
          )}
        </div>
      )}
    </Sheet>
  )
}
