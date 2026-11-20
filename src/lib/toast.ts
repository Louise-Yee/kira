// One toast at a time: a new one replaces the current one. Read by <Toaster /> in App.

export type Toast = { id: number; text: string; tone: 'info' | 'error' }

const SHOW_MS = 4000

let current: Toast | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function set(next: Toast | null) {
  current = next
  listeners.forEach((l) => l())
}

/** Show a short message at the top of the screen: the result of something that shows nowhere else (copied, exported). */
export function toast(text: string, tone: Toast['tone'] = 'info') {
  clearTimeout(timer)
  set({ id: (current?.id ?? 0) + 1, text, tone })
  timer = setTimeout(() => set(null), SHOW_MS)
}

export const subscribeToast = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const currentToast = () => current
