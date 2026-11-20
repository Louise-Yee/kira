// One toast at a time: a new one replaces the current one. Read by <Toaster /> in App, which also times it.

export type Toast = {
  id: number
  text: string
  tone: 'info' | 'error'
  /** How long it shows, counting down while the toast isn't hovered or focused. */
  seconds: number
  action?: { label: string; onClick: () => void }
}

let current: Toast | null = null
let nextId = 1
const listeners = new Set<() => void>()

function set(next: Toast | null) {
  current = next
  listeners.forEach((l) => l())
}

/** Show a short message at the top of the screen: the result of something that shows nowhere else (copied, exported). */
export function toast(text: string, tone: Toast['tone'] = 'info') {
  set({ id: nextId++, text, tone, seconds: 4 })
}

/** "… deleted" with Undo, counting down 3‑2‑1. The delete is already written; Undo writes it back. */
export function toastUndo(text: string, undo: () => void) {
  set({ id: nextId++, text, tone: 'info', seconds: 3, action: { label: 'Undo', onClick: undo } })
}

/** Close the toast `id`, if it's still the one showing. */
export function dismissToast(id: number) {
  if (current?.id === id) set(null)
}

export const subscribeToast = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const currentToast = () => current
