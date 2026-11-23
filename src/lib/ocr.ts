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
  const worker = await createWorker('eng', 1, {
    workerPath,
    corePath,
    langPath: `${import.meta.env.BASE_URL}tessdata`,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(canvas)
    return parseReceipt(data.text)
  } finally {
    await worker.terminate()
  }
}
