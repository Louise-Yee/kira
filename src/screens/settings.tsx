import { logOut, type AppUser } from '@/lib/firebase'
import { navPositions, type NavPos } from '@/lib/nav'
import { PillButton } from '@/components/pill-button'

export function SettingsScreen({ user, navPos, onNavPos }: { user: AppUser; navPos: NavPos; onNavPos: (p: NavPos) => void }) {
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
        <p className="text-base font-semibold">Navigation position</p>
        <p className="text-base text-muted-foreground">On large screens. Phones always use the bottom bar.</p>
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
