export const themes = ['system', 'light', 'dark'] as const
export type Theme = (typeof themes)[number]

// Same key and logic as the inline script in index.html, which applies it before first paint.
const KEY = 'kira.theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return themes.find((t) => t === v) ?? 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage blocked: the choice just won't persist
  }
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
