import { useRef, useState } from 'react'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { error as errorHaptic, success } from '@/lib/haptics'
import { backupSummary, transactionsCsv, validateBackup, type Backup } from '@/lib/backup'
import { todayISO } from '@/lib/date'
import { exportBackup, importBackup } from '@/lib/db'
import { shareFile } from '@/lib/share-image'

type Props = { open: boolean; onClose: () => void; uid: string }

/** Export the account as JSON (restorable) or CSV (for Excel), and import a JSON backup. */
export function BackupSheet({ open, onClose, uid }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Backup">
      {/* Mounted only while open, so a half-finished import never lingers. */}
      <Body uid={uid} onClose={onClose} />
    </Sheet>
  )
}

function Body({ uid, onClose }: { uid: string; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Backup | null>(null)

  const run = async (task: () => Promise<void>) => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      await task()
    } catch (e) {
      errorHaptic()
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const exportAs = (format: 'json' | 'csv') =>
    run(async () => {
      let backup: Backup
      try {
        backup = await exportBackup(uid)
      } catch {
        throw new Error("Couldn't reach the server. Connect to the internet to export.")
      }
      const name = `kira-backup-${todayISO()}.${format}`
      const file =
        format === 'json'
          ? new File([JSON.stringify(backup)], name, { type: 'application/json' })
          : new File([transactionsCsv(backup.transactions, backup.categories)], name, { type: 'text/csv' })
      if ((await shareFile(file, name)) !== 'cancelled') {
        success()
        setMessage('Exported.')
      }
    })

  const pick = (file: File | undefined) =>
    run(async () => {
      if (!file) return
      try {
        const result = validateBackup(JSON.parse(await file.text()))
        if (!result.ok) throw new Error(`Not imported. ${result.error}`)
        setPending(result.backup)
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error('Not imported. This is not a valid JSON file.')
        throw e
      } finally {
        // Lets the same file be picked again after an error.
        if (input.current) input.current.value = ''
      }
    })

  if (pending) {
    return (
      <div className="flex flex-col gap-4 pb-1">
        <p className="text-base font-semibold">{backupSummary(pending)}</p>
        <p className="text-base text-muted-foreground">Existing items with the same ID will be overwritten. Nothing is deleted.</p>
        <div className="flex gap-2">
          <PillButton variant="secondary" className="flex-1" onClick={() => setPending(null)}>
            Cancel
          </PillButton>
          <PillButton
            className="flex-1"
            onClick={() => {
              success()
              importBackup(uid, pending)
              onClose()
            }}
          >
            Import
          </PillButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-base text-muted-foreground">
        The JSON file has everything and can be imported back. The CSV is transactions only, for Excel. Receipt links for splits are not
        included and are created again when you share.
      </p>
      {error && <p className="text-base text-destructive">{error}</p>}
      {message && <p className="text-base text-muted-foreground">{message}</p>}
      <PillButton disabled={busy} onClick={() => exportAs('json')}>
        {busy ? 'Working…' : 'Export JSON'}
      </PillButton>
      <PillButton variant="secondary" disabled={busy} onClick={() => exportAs('csv')}>
        Export CSV
      </PillButton>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <PillButton variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        Import JSON
      </PillButton>
    </div>
  )
}
