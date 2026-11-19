import { useEffect, useState } from 'react'
import { Navigate, useLocation, useMatch, useNavigate } from 'react-router'
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react'
import { House, ReceiptText, Repeat, Settings } from 'lucide-react'
import { useUser, type AppUser } from '@/lib/firebase'
import { useAppLock, type AppLock } from '@/lib/app-lock'
import { useClientInfo, useDirectoryPublisher, useSyncStatus } from '@/lib/db'
import { todayISO } from '@/lib/date'
import { soft } from '@/lib/motion'
import { usePostRecurring } from '@/lib/post-recurring'
import { useSeedDefaults } from '@/lib/seed'
import { useAddLink } from '@/lib/widget'
import { useReceiptLink } from '@/lib/receipt-link'
import { useUpdate } from '@/lib/update'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { FabSlideContext } from '@/lib/fab-slide'
import { SyncPill } from '@/components/sync-pill'
import { TabBar, type TabItem } from '@/components/tab-bar'
import { UpdateSheet } from '@/components/update-sheet'
import { LockScreen } from '@/screens/lock'
import { Gallery } from '@/screens/gallery'
import { Home } from '@/screens/home'
import { navPositions, type NavPos } from '@/lib/nav'
import { RecurringScreen } from '@/screens/recurring'
import { SettingsScreen } from '@/screens/settings'
import { ReceiptPage } from '@/screens/receipt-page'
import { SplitScreen } from '@/screens/split'
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
  const lock = useAppLock()
  useSeedDefaults(authUser?.uid) // real accounts only: ?dev has no Firebase uid
  usePostRecurring(authUser?.uid)
  useClientInfo(authUser?.uid)
  useDirectoryPublisher(authUser)
  useReceiptLink()
  const shareId = useMatch('/r/:id')?.params.id
  if (shareId) return <MotionConfig reducedMotion="user"><ReceiptPage id={shareId} /></MotionConfig>
  if (devGallery) return <MotionConfig reducedMotion="user"><Gallery /></MotionConfig>
  return (
    <MotionConfig reducedMotion="user">
      {user === undefined || lock.enabled === undefined ? null : user ? (
        lock.enabled && !lock.unlocked ? <LockScreen onUnlock={lock.unlock} onReset={lock.reset} /> : <Shell user={user} lock={lock} />
      ) : <SignIn />}
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

const paths: Record<Tab, string> = { home: '/', recurring: '/recurring', split: '/split', settings: '/settings' }

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

function Shell({ user, lock }: { user: AppUser; lock: AppLock }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const current = tabs.find((t) => paths[t.id] === pathname)
  const tab: Tab = current?.id ?? 'home'
  // Slide direction and previous tab follow the URL, so back/forward and refresh animate like a tap.
  const [nav, setNav] = useState<{ tab: Tab; from: Tab; dir: number }>({ tab, from: tab, dir: 1 })
  if (nav.tab !== tab) {
    const delta = tabs.findIndex((t) => t.id === tab) - tabs.findIndex((t) => t.id === nav.tab)
    setNav({ tab, from: nav.tab, dir: Math.sign(delta) || 1 })
  }
  const { dir, from } = nav
  const [navPos, setNavPos] = useState<NavPos>(readNavPos)
  const lg = useMediaQuery('(min-width: 1024px)')
  // ponytail: read once per mount, so "Today" and the trend window go stale if the app stays open past midnight.
  const [today] = useState(todayISO)
  const [ym, setYm] = useState(today.slice(0, 7))
  const sync = useSyncStatus(user.uid, ym, today.slice(0, 7))
  // The floating Add button reads this to stay clear of a right-hand sidebar.
  useEffect(() => {
    document.documentElement.dataset.nav = navPos
  }, [navPos])
  const side = navPos !== 'bottom'
  const update = useUpdate()
  const slide: Slide = { dir, lg }

  // The widget's "+" opens kira://add: jump to Home, then Home opens the add sheet.
  const [addRequest, setAddRequest] = useState(0)
  useAddLink(() => {
    if (pathname !== '/') navigate({ pathname: '/', search })
    setYm(today.slice(0, 7))
    setAddRequest((n) => n + 1)
  })

  // `search` is kept so the dev-only ?dev / ?gallery flags survive navigation.
  const go = (id: Tab) => {
    if (id !== tab) navigate({ pathname: paths[id], search })
  }
  const changeNavPos = (p: NavPos) => {
    setNavPos(p)
    try {
      localStorage.setItem(NAV_KEY, p)
    } catch {
      // storage blocked: the choice just won't persist
    }
  }

  if (!current) return <Navigate to={{ pathname: '/', search }} replace />

  return (
    <div className={cn('mx-auto min-h-dvh max-w-5xl lg:flex lg:gap-8 lg:p-6', navPos === 'right' && 'lg:flex-row-reverse')}>
      <SyncPill status={sync} />
      <TabBar tabs={tabs} active={tab} onChange={go} side={side} />

      <FabSlideContext value={tab === 'settings' || from === 'settings'}>
      <main className={cn('relative flex-1 overflow-x-clip px-5 pt-[calc(1.5rem+var(--inset-top))] pb-32', side && 'lg:p-0 lg:pb-24')}>
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
            {tab === 'home' && <Home user={user} today={today} ym={ym} onYm={setYm} addRequest={addRequest} />}
            {tab === 'settings' && <SettingsScreen user={user} navPos={navPos} onNavPos={changeNavPos} update={update.update} onUpdate={update.show} lock={lock} />}
            {tab === 'recurring' && <RecurringScreen user={user} />}
            {tab === 'split' && <SplitScreen user={user} today={today} />}
          </motion.div>
        </AnimatePresence>
      </main>
      </FabSlideContext>
      <UpdateSheet open={update.open} update={update.update} onLater={update.later} />
    </div>
  )
}
