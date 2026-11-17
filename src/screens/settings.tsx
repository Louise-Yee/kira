import { motion } from 'motion/react'
import { logOut, type AppUser } from '@/lib/firebase'
import { press } from '@/lib/motion'
import { navPositions, type NavPos } from '@/lib/nav'
import { cn } from '@/lib/utils'

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
            <motion.button
              key={p}
              whileTap={press}
              onClick={() => onNavPos(p)}
              className={cn(
                'h-11 flex-1 rounded-full text-base font-semibold capitalize',
                navPos === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>
      <motion.button
        whileTap={press}
        onClick={logOut}
        className="h-14 rounded-full bg-secondary text-base font-semibold"
      >
        Sign out
      </motion.button>
    </div>
  )
}
