import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react'
import { House, ReceiptText, Repeat, Settings, type LucideIcon } from 'lucide-react'
import type { User } from 'firebase/auth'
import { logOut, signIn, useUser } from '@/lib/firebase'
import { glide, pop, press, soft } from '@/lib/motion'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { Ascii, AsciiCoin } from '@/components/ascii'
import { coinField, type Field } from '@/lib/coin'

type AppUser = Pick<User, 'displayName' | 'photoURL' | 'email'>

// Dev only: open http://localhost:5173/?dev to skip sign-in. Vite strips this from prod builds.
const devUser: AppUser | null =
  import.meta.env.DEV && new URLSearchParams(location.search).has('dev')
    ? { displayName: 'Dev User', photoURL: null, email: 'dev@localhost' }
    : null

export default function App() {
  const authUser = useUser()
  const user = devUser ?? authUser
  return (
    <MotionConfig reducedMotion="user">
      {user === undefined ? null : user ? <Shell user={user} /> : <SignIn />}
    </MotionConfig>
  )
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 16, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { ...pop, delay: 0.08 * i },
})

function SignIn() {
  const [error, setError] = useState('')
  return (
    // Always dark: the texture needs a dark ground.
    <main className="dark flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground">
      <motion.div {...rise(0)}>
        <AsciiCoin className="size-[min(78vw,320px)]" />
      </motion.div>
      <motion.h1
        {...rise(1)}
        className="font-heading text-8xl leading-[0.9] font-light tracking-tight [font-stretch:75%]"
      >
        kira
      </motion.h1>
      <motion.p {...rise(2)} className="mt-3 text-base text-muted-foreground">
        Every ringgit, accounted for.
      </motion.p>
      <motion.button
        {...rise(3)}
        whileTap={press}
        onClick={() =>
          signIn().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Sign-in failed'))
        }
        className="mt-10 flex h-14 items-center gap-3 rounded-full bg-foreground px-7 text-base font-semibold text-background"
      >
        <GoogleIcon />
        Continue with Google
      </motion.button>
      {error && <p className="mt-4 max-w-xs text-center text-base text-destructive">{error}</p>}
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

// Coin peeking in from the right edge of the balance card; x scaled for the ~2.5:1 card.
const heroField: Field = (nx, ny) => coinField((nx - 0.8) * 1.5, ny * 0.6, 0)

const tabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'split', label: 'Split', icon: ReceiptText },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[]

type Tab = (typeof tabs)[number]['id']

const navPositions = ['left', 'right', 'bottom'] as const
type NavPos = (typeof navPositions)[number]
const NAV_KEY = 'kira.navPos'

function readNavPos(): NavPos {
  try {
    const v = localStorage.getItem(NAV_KEY)
    return navPositions.find((p) => p === v) ?? 'left'
  } catch {
    return 'left'
  }
}

type Slide = { dir: number; lg: boolean }

// Phones: pages slide horizontally by tab order. lg (vertical nav): the old fade-up.
const page: Variants = {
  enter: ({ dir, lg }: Slide) => (lg ? { opacity: 0, y: 12 } : { x: `${dir * 100}%`, opacity: 0 }),
  center: { x: 0, y: 0, opacity: 1 },
  exit: ({ dir, lg }: Slide) => (lg ? { opacity: 0, y: -8 } : { x: `${-dir * 100}%`, opacity: 0 }),
}

function Shell({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>('home')
  const [dir, setDir] = useState(1)
  const [navPos, setNavPos] = useState<NavPos>(readNavPos)
  const lg = useMediaQuery('(min-width: 1024px)')
  const side = navPos !== 'bottom'
  const slide: Slide = { dir, lg }

  const go = (id: Tab) => {
    setDir(Math.sign(tabs.findIndex((t) => t.id === id) - tabs.findIndex((t) => t.id === tab)) || 1)
    setTab(id)
  }
  const changeNavPos = (p: NavPos) => {
    setNavPos(p)
    try {
      localStorage.setItem(NAV_KEY, p)
    } catch {
      // storage blocked: the choice just won't persist
    }
  }

  return (
    <div className={cn('mx-auto min-h-dvh max-w-5xl lg:flex lg:gap-8 lg:p-6', navPos === 'right' && 'lg:flex-row-reverse')}>
      <nav
        className={cn(
          // Floating glass pill, centered above the safe area.
          'fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-0.5 rounded-full border border-glass-edge bg-glass p-1 shadow-lg backdrop-blur-xl backdrop-saturate-150',
          // Sidebar at lg when the user picks left/right.
          side &&
            'lg:sticky lg:inset-x-auto lg:top-6 lg:bottom-auto lg:mx-0 lg:h-fit lg:w-56 lg:max-w-none lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none lg:backdrop-saturate-100',
        )}
      >
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <motion.button
              key={t.id}
              whileTap={press}
              onClick={() => go(t.id)}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center justify-center rounded-full px-2.5 text-base font-semibold',
                active ? 'text-foreground' : 'text-muted-foreground',
                side && 'lg:h-12 lg:justify-start lg:rounded-2xl lg:px-4',
              )}
            >
              <motion.span
                initial={false}
                animate={{ opacity: active ? 1 : 0 }}
                transition={glide}
                className={cn('absolute inset-0 rounded-full bg-foreground/10', side && 'lg:rounded-2xl')}
              />
              <t.icon className="relative size-6 shrink-0 lg:size-5" />
              <AnimatePresence initial={false}>
                {(active || (side && lg)) && (
                  <motion.span
                    initial={{ width: 0, opacity: 0, x: -10 }}
                    animate={{ width: 'auto', opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: -10 }}
                    transition={glide}
                    className="relative overflow-hidden whitespace-nowrap"
                  >
                    <span className={cn('block pl-2', side && 'lg:pl-3')}>{t.label}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </nav>

      <main className={cn('relative flex-1 overflow-x-clip px-5 pt-6 pb-32', side && 'lg:p-0')}>
        <AnimatePresence mode="popLayout" initial={false} custom={slide}>
          <motion.div
            key={tab}
            custom={slide}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            transition={soft}
          >
            {tab === 'home' && <Home user={user} />}
            {tab === 'settings' && <SettingsScreen user={user} navPos={navPos} onNavPos={changeNavPos} />}
            {(tab === 'recurring' || tab === 'split') && (
              <p className="pt-10 text-center text-lg text-muted-foreground">Coming soon</p>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function Home({ user }: { user: AppUser }) {
  const month = new Date().toLocaleString('en-MY', { month: 'long' })
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        Hi, {user.displayName?.split(' ')[0] ?? 'there'}
      </h1>
      <motion.section
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={pop}
        className="relative overflow-hidden rounded-3xl bg-hero p-6 text-hero-foreground"
      >
        {/* screen blend: dark glyphs vanish into the blue, bright ones glow */}
        <Ascii field={heroField} cell={6} floor={0.2} className="absolute inset-0 size-full opacity-50 mix-blend-screen" />
        <p className="relative text-base font-semibold opacity-85">Left in {month}</p>
        <p className="relative mt-1 font-heading text-5xl font-extrabold tracking-tight">RM 0.00</p>
      </motion.section>
    </div>
  )
}

function SettingsScreen({ user, navPos, onNavPos }: { user: AppUser; navPos: NavPos; onNavPos: (p: NavPos) => void }) {
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
