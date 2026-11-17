/** Whether this browser can hand an image file to the system share sheet (phones), as opposed to downloading it. */
export function canShareImages(): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'a.png', { type: 'image/png' })] })
}

/**
 * Send a PNG to the share sheet where there is one, otherwise download it.
 * Call it straight from a tap with a blob that is already rendered: browsers drop the "user gesture" if the
 * image is made after the tap, and sharing then fails.
 */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (canShareImages()) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' // the user closed the share sheet
      // anything else (a browser that refuses): fall through to a download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
