import { useRef, useState } from 'react'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import { compressToDataUrl } from '@/lib/compress-image'

type Props = {
  open: boolean
  onClose: () => void
  /** The saved QR as a data URL, if any. */
  qr: string | undefined
  onSave: (dataUrl: string) => void
  onRemove: () => void
}

/** Upload, preview, replace or remove the payment QR shown on split receipts. */
export function PaymentQrSheet({ open, onClose, qr, onSave, onRemove }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Payment QR">
      {/* Mounted only while open, so errors and the remove confirmation start fresh each time. */}
      <Body qr={qr} onSave={onSave} onRemove={onRemove} onClose={onClose} />
    </Sheet>
  )
}

function Body({ qr, onSave, onRemove, onClose }: Omit<Props, 'open'>) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onSave(await compressToDataUrl(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try another image.')
    } finally {
      setBusy(false)
      // Lets the same file be picked again after an error.
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <p className="text-base text-muted-foreground">
        Your receive-money QR (e.g. Touch 'n Go). It goes on the receipts you share, so people can scan to pay you.
      </p>
      {qr && <img src={qr} alt="Your payment QR" className="mx-auto size-64 rounded-2xl bg-white object-contain" />}
      {error && <p className="text-base text-destructive">{error}</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <PillButton disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Processing…' : qr ? 'Replace QR' : 'Upload QR'}
      </PillButton>
      {qr &&
        (confirming ? (
          <div className="flex gap-2">
            <PillButton variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              Keep
            </PillButton>
            <PillButton
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onRemove()
                onClose()
              }}
            >
              Remove
            </PillButton>
          </div>
        ) : (
          <PillButton variant="destructive" onClick={() => setConfirming(true)}>
            Remove QR
          </PillButton>
        ))}
    </div>
  )
}
