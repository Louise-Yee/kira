import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react'
import { House, ReceiptText, Repeat, Settings } from 'lucide-react'
import { useUser, type AppUser } from '@/lib/firebase'
import { useSyncStatus } from '@/lib/db'
import { todayISO } from '@/lib/date'
import { soft } from '@/lib/motion'
import { usePostRecurring } from '@/lib/post-recurring'
import { useSeedDefaults } from '@/lib/seed'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { SyncPill } from '@/components/sync-pill'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { Gallery } from '@/screens/gallery'
import { Home } from '@/screens/home'
import { navPositions, type NavPos } from '@/lib/nav'
import { SettingsScreen } from '@/screens/settings'
import { SignIn } from '@/screens/sign-in'

// Dev only: open http://localhost:5173/?dev to skip sign-in. Vite strips this from prod builds.
const devUser: AppUser | null =
  import.meta.env.DEV && new URLSearchParams(location.search).has('dev')
    ? { displayName: 'Dev User', photoURL: null, email: 'dev@localhost', uid: 'dev' }
    : null

// Dev only: /?gallery shows the shared components without signing in.
const devGallery = import.meta.env.DEV && new URLSearchParams(location.search).has('gallery')

export default function App() {
  const authUser = useUser()
  const user = devUser ?? authUser
  useSeedDefaults(authUser?.uid) // real accounts only: ?dev has no Firebase uid
  usePostRecurring(authUser?.uid)
  if (devGallery) return <MotionConfig reducedMotion="user"><Gallery /></MotionConfig>
  return (
    <MotionConfig reducedMotion="user">
      {user === undefined ? null : user ? <Shell user={user} /> : <SignIn />}
    </MotionConfig>
  )
}

const tabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'split', label: 'Split', icon: ReceiptText },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const satisfies readonly TabItem<string>[]

type Tab = (typeof tabs)[number]['id']

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
  const [ym, setYm] = useState(() => todayISO().slice(0, 7))
  const sync = useSyncStatus(user.uid, ym)
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
      <SyncPill status={sync} />
      <TabBar tabs={tabs} active={tab} onChange={go} side={side} lg={lg} />

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
            {tab === 'home' && <Home user={user} ym={ym} onYm={setYm} />}
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
