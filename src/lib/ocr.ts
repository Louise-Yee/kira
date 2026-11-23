import { fitWithin } from '@/lib/image-size'
import { parseReceipt, type ScannedReceipt } from '@/lib/receipt-parse'
import workerPath from 'tesseract.js/dist/worker.min.js?url'
// The core with its wasm inside one file (SIMD, text-line engine only), so nothing is fetched from a CDN.
import corePath from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'

const MAX_SIDE = 2000

/** Photo -> canvas, shrunk to 2000px on the long side. (Enlarging small images or stretching contrast made the reading worse in tests.) */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("That file couldn't be read as an image.")
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("This browser can't process images.")
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas
}

/**
 * Read a receipt photo on the device. The OCR engine and English data are loaded only now (a dynamic import),
 * so the app doesn't carry them until someone scans. `onProgress` gets 0..1 while reading.
 */
export async function scanReceipt(file: File, onProgress: (p: number) => void): Promise<ScannedReceipt> {
  const canvas = await prepare(file)
  const { createWorker } = await import('tesseract.js')
  let stage = 'starting'
  // workerBlobURL off: the Android WebView doesn't serve a blob worker's importScripts, so load the worker file directly.
  // cacheMethod none: the worker's IndexedDB cache stalled at "loading language traineddata" in the Android WebView,
  // and the data is bundled with the app anyway, so a cache buys nothing.
  const langPath = `${import.meta.env.BASE_URL}tessdata`
  stage = 'checking language data'
  const check = await fetch(`${langPath}/eng.traineddata`, { method: 'HEAD' })
  if (!check.ok) throw new Error(`Couldn't find the reader's language data (${check.status}).`)
  const starting = createWorker('eng', 1, {
    workerBlobURL: false,
    cacheMethod: 'none',
    // Stored uncompressed: the Android build strips ".gz" from bundled files, so a .gz name 404s in the app.
    gzip: false,
    langPath,
    workerPath,
    corePath,
    logger: (m) => {
      stage = m.status
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  // A load that hangs (no network error, nothing) would leave the button spinning forever.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`The reader didn't start (stuck at "${stage}").`)), 60_000),
  )
  const worker = await Promise.race([starting, timeout])
  try {
    const { data } = await worker.recognize(canvas)
    return parseReceipt(data.text)
  } finally {
    await worker.terminate()
  }
}
