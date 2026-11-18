/** Whether this browser can hand an image file to the system share sheet (phones), as opposed to downloading it. */
export function canShareImages(): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'a.png', { type: 'image/png' })] })
}

/**
 * Send a file to the share sheet where there is one, otherwise download it.
 * Call it straight from a tap with a file that is already made: browsers drop the "user gesture" if the
 * file is made after the tap, and sharing then fails (it falls back to a download).
 */
export async function shareFile(file: File, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' // the user closed the share sheet
      // anything else (a browser that refuses): fall through to a download
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** A rendered PNG, shared or downloaded. */
export const shareImage = (blob: Blob, filename: string, title: string) =>
  shareFile(new File([blob], filename, { type: 'image/png' }), title)
