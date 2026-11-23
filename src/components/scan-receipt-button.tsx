import { useRef, useState } from 'react'
import { Camera, ImageIcon, ScanLine } from 'lucide-react'
import { motion } from 'motion/react'
import { error as errorHaptic, success } from '@/lib/haptics'
import { press } from '@/lib/motion'
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

  const tile =
    'flex min-h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-background text-base font-semibold transition-colors active:bg-muted'
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-secondary p-3">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex items-center gap-2 px-1">
        <ScanLine className="size-5 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-base font-semibold">Scan a receipt</p>
          <p className="text-base text-muted-foreground">Fills in the items. The photo stays on your phone.</p>
        </div>
      </div>
      {progress === null ? (
        <div className="flex gap-2">
          <motion.button type="button" whileTap={press} className={tile} onClick={() => camera.current?.click()}>
            <Camera className="size-6 text-primary" aria-hidden />
            Take photo
          </motion.button>
          <motion.button type="button" whileTap={press} className={tile} onClick={() => gallery.current?.click()}>
            <ImageIcon className="size-6 text-primary" aria-hidden />
            Choose photo
          </motion.button>
        </div>
      ) : (
        <div className="flex min-h-20 flex-col justify-center gap-2 rounded-2xl bg-background px-4" role="status">
          <p className="text-base font-semibold">Reading… {Math.round(progress * 100)}%</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(progress * 100, 4)}%` }} />
          </div>
        </div>
      )}
      {message && <p className="px-1 text-base text-muted-foreground">{message}</p>}
    </div>
  )
}
