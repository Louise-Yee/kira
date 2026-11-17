import { dataUrlBytes, fitWithin } from '@/lib/image-size'

export const MAX_SIDE = 600
export const MAX_BYTES = 300 * 1024

/**
 * Scale a picked image down to at most 600px on the long side and encode it as a small data URL (WebP, or
 * JPEG where the browser can't encode WebP). Rejects with a readable message if it can't be read or is still
 * over 300 KB (Firestore documents are capped at 1 MB).
 */
export async function compressToDataUrl(file: File): Promise<string> {
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
  // A white backdrop: a transparent PNG would turn black when encoded, and a QR needs a light background.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  let url = canvas.toDataURL('image/webp', 0.85)
  // Browsers without a WebP encoder silently return PNG.
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.85)
  if (dataUrlBytes(url) > MAX_BYTES) throw new Error('That image is too big even after shrinking. Try a simpler one.')
  return url
}
