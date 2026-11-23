import { useRef, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { PillButton } from '@/components/pill-button'
import { error as errorHaptic, success } from '@/lib/haptics'
import type { ScannedReceipt } from '@/lib/receipt-parse'

type Props = {
  /** Called with what was read. The form shows it for the user to check; nothing is saved by the scan itself. */
  onScanned: (receipt: ScannedReceipt) => void
}

/** "Scan receipt": pick or take a photo, read it on the device, hand the result to the form. The photo is never kept. */
export function ScanReceiptButton({ onScanned }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <PillButton variant="secondary" size="pill-sm" disabled={progress !== null} onClick={() => input.current?.click()}>
        <ScanLine aria-hidden />
        {progress === null ? 'Scan receipt' : `Reading… ${Math.round(progress * 100)}%`}
      </PillButton>
      {message && <p className="px-1 text-base text-muted-foreground">{message}</p>}
    </div>
  )
}
