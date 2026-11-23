import { useRef, useState } from 'react'
import { Camera, ImageIcon } from 'lucide-react'
import { PillButton } from '@/components/pill-button'
import { error as errorHaptic, success } from '@/lib/haptics'
import type { ScannedReceipt } from '@/lib/receipt-parse'

type Props = {
  /** Called with what was read. The form shows it for the user to check; nothing is saved by the scan itself. */
  onScanned: (receipt: ScannedReceipt) => void
}

/** "Take photo" / "Choose photo": the camera or the gallery, read it on the device, hand the result to the form. The photo is never kept. */
export function ScanReceiptButton({ onScanned }: Props) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const busy = progress !== null

  const pick = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    setProgress(0)
    try {
      // Loaded on first use, so the OCR engine isn't part of the app's startup.
      const { scanReceipt } = await import('@/lib/ocr')
      const receipt = await scanReceipt(file, setProgress)
      if (receipt.items.length === 0 && receipt.total === null) {
        errorHaptic()
        setMessage("Couldn't read any prices. Try a flatter, brighter photo, or add the items by hand.")
      } else {
        success()
        onScanned(receipt)
        setMessage('Read from the photo. Check every item and price below.')
      }
    } catch (e) {
      errorHaptic()
      setMessage(e instanceof Error ? e.message : 'Scanning failed. Try another photo.')
    } finally {
      setProgress(null)
      // Lets the same photo be picked again.
      for (const input of [camera.current, gallery.current]) if (input) input.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex gap-2">
        <PillButton variant="secondary" size="pill-sm" className="flex-1" disabled={busy} onClick={() => camera.current?.click()}>
          <Camera aria-hidden />
          {progress === null ? 'Take photo' : `Reading… ${Math.round(progress * 100)}%`}
        </PillButton>
        <PillButton variant="secondary" size="pill-sm" className="flex-1" disabled={busy} onClick={() => gallery.current?.click()}>
          <ImageIcon aria-hidden />
          Choose photo
        </PillButton>
      </div>
      {message && <p className="px-1 text-base text-muted-foreground">{message}</p>}
    </div>
  )
}
