import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { House, ReceiptText, Repeat, Settings, type LucideIcon } from 'lucide-react'
import type { User } from 'firebase/auth'
import { logOut, signIn, useUser } from '@/lib/firebase'
import { pop, press, soft } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Ascii, AsciiCoin } from '@/components/ascii'
import { coinField, type Field } from '@/lib/coin'

export default function App() {
  const user = useUser()
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

function Shell({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>('home')
  return (
    <div className="mx-auto min-h-dvh max-w-5xl lg:flex lg:gap-8 lg:p-6">
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-background/90 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur',
          'lg:sticky lg:top-6 lg:h-fit lg:w-56 lg:flex-col lg:justify-start lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0',
        )}
      >
        {tabs.map((t) => (
          <motion.button
            key={t.id}
            whileTap={press}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-semibold lg:flex-none lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-base',
              tab === t.id ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {tab === t.id && (
              <motion.span layoutId="tab-pill" transition={pop} className="absolute inset-0 rounded-2xl bg-secondary" />
            )}
            <t.icon className="relative size-6 lg:size-5" />
            <span className="relative">{t.label}</span>
          </motion.button>
        ))}
      </nav>

      <main className="flex-1 px-5 pt-6 pb-32 lg:p-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={soft}
          >
            {tab === 'home' && <Home user={user} />}
            {tab === 'settings' && <SettingsScreen user={user} />}
            {(tab === 'recurring' || tab === 'split') && (
              <p className="pt-10 text-center text-lg text-muted-foreground">Coming soon</p>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function Home({ user }: { user: User }) {
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

function SettingsScreen({ user }: { user: User }) {
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
