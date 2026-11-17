import { useState } from 'react'
import { logOut, type AppUser } from '@/lib/firebase'
import { navPositions, type NavPos } from '@/lib/nav'
import { readTheme, setTheme, type Theme } from '@/lib/theme'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: Theme; label: string }[]

export function SettingsScreen({ user, navPos, onNavPos }: { user: AppUser; navPos: NavPos; onNavPos: (p: NavPos) => void }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Settings</h1>
      <div className="flex items-center gap-4 rounded-3xl bg-card p-5">
        {user.photoURL && <img src={user.photoURL} alt="" className="size-12 rounded-full" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{user.displayName}</p>
          <p className="truncate text-base text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="rounded-3xl bg-card p-5">
        <p className="mb-3 text-base font-semibold">Theme</p>
        <Segmented
          options={themeOptions}
          value={theme}
          onChange={(t) => {
            setThemeState(t)
            setTheme(t)
          }}
        />
      </div>
      {/* Only matters at lg: phones always use the floating bottom bar. */}
      <div className="hidden rounded-3xl bg-card p-5 lg:block">
        <p className="text-base font-semibold">Navigation position</p>
        <p className="text-base text-muted-foreground">Where the menu sits on large screens.</p>
        <div className="mt-3 flex gap-2">
          {navPositions.map((p) => (
            <PillButton
              key={p}
              size="pill-sm"
              variant={navPos === p ? 'default' : 'secondary'}
              onClick={() => onNavPos(p)}
              className="flex-1 capitalize"
            >
              {p}
            </PillButton>
          ))}
        </div>
      </div>
      <PillButton variant="secondary" onClick={logOut}>
        Sign out
      </PillButton>
    </div>
  )
}
