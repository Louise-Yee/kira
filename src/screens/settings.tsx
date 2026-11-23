import { CurrencySheet } from '@/components/currency-select'
import { useDisplayCurrency } from '@/lib/display-currency'
import { currencySymbol } from '@/lib/money'
import { useCallback, useState } from 'react'
import { Banknote, ChevronRight, DatabaseBackup, Lock, Palette, PanelLeft, QrCode, Smartphone, Sparkles, Tags, UserSearch, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  categoryInUse,
  deleteCategory,
  moveAndDeleteCategory,
  saveCategory,
  setDiscoverable,
  setDisplayCurrency,
  setPaymentQr,
  swapCategoryOrder,
  useCategories,
  useSettings,
} from '@/lib/db'
import { toastUndo } from '@/lib/toast'
import { lockSupported, type AppLock } from '@/lib/app-lock'
import { logOut, type AppUser } from '@/lib/firebase'
import { navPositions, type NavPos } from '@/lib/nav'
import { readTheme, setTheme, type Theme } from '@/lib/theme'
import { APP_VERSION, IS_DEV_BUILD, type Update } from '@/lib/update'
import { releasedEntries } from '@/lib/changelog'
import { Avatar } from '@/components/avatar'
import { BackupSheet } from '@/components/backup-sheet'
import { ListRow } from '@/components/list-row'
import { PaymentQrSheet } from '@/components/payment-qr-sheet'
import { PillButton } from '@/components/pill-button'
import { Section } from '@/components/section'
import { Segmented } from '@/components/segmented'
import { Toggle } from '@/components/toggle'
import { WhatsNewSheet } from '@/components/whats-new-sheet'
import { CategoriesManager } from '@/screens/categories/manager'

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: Theme; label: string }[]

type Props = {
  user: AppUser
  navPos: NavPos
  onNavPos: (p: NavPos) => void
  /** A newer Android release, if the launch check found one. */
  update: Update | null
  onUpdate: () => void
  lock: AppLock
}

/** A titled card of rows, split by hairlines (Wise-style settings groups). */
function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  return (
    <Section title={title}>
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-3xl bg-card *:rounded-none">{children}</div>
      {footer && <p className="px-1 text-base text-muted-foreground">{footer}</p>}
    </Section>
  )
}

const chevron = <ChevronRight className="size-5 text-muted-foreground" />

function Tile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

export function SettingsScreen({ user, navPos, onNavPos, update, onUpdate, lock }: Props) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const categories = useCategories(user.uid) ?? []
  const [managing, setManaging] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const display = useDisplayCurrency()
  const changes = releasedEntries(APP_VERSION)
  const settings = useSettings(user.uid)
  const isUsed = useCallback((id: string) => categoryInUse(user.uid, id), [user.uid])
  return (
    <div className="flex flex-col gap-5 pt-[calc(1.5rem+var(--inset-top))] lg:pt-0">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Settings</h1>
      <div className="flex items-center gap-4 rounded-3xl bg-card p-5">
        <Avatar photoURL={user.photoURL} name={user.displayName ?? user.email ?? '?'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{user.displayName}</p>
          <p className="truncate text-base text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <Group title="Preferences">
        <ListRow icon={<Tile icon={Banknote} />} title="Currency" subtitle={`${currencySymbol(display)} · totals and new entries`} trailing={chevron} onClick={() => setCurrencyOpen(true)} />
        <ListRow icon={<Tile icon={Tags} />} title="Categories" trailing={chevron} onClick={() => setManaging(true)} />
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center gap-3">
            <Tile icon={Palette} />
            <span className="text-base font-semibold">Theme</span>
          </div>
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
        <div className="hidden flex-col gap-3 p-3 lg:flex">
          <div className="flex items-center gap-3">
            <Tile icon={PanelLeft} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">Navigation position</span>
              <span className="block text-base text-muted-foreground">Where the menu sits on large screens.</span>
            </span>
          </div>
          <div className="flex gap-2">
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
      </Group>
      <CurrencySheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} value={display} onPick={(c) => setDisplayCurrency(user.uid, c)} />
      <CategoriesManager
        open={managing}
        onClose={() => setManaging(false)}
        categories={categories}
        onSave={(data, id) => saveCategory(user.uid, data, id)}
        onSwap={(a, b) => swapCategoryOrder(user.uid, a, b)}
        isUsed={isUsed}
        onDelete={(id) => toastUndo('Category deleted', deleteCategory(user.uid, id))}
        onMove={(from, to) => moveAndDeleteCategory(user.uid, from, to)}
      />

      <Group title="Privacy and security">
        <div className="px-2 py-3">
          <Toggle
            icon={<Tile icon={UserSearch} />}
            label="Findable by email"
            description="Friends with your email can find you. Only your name and photo are shown."
            checked={settings?.discoverable !== false}
            onChange={(on) => setDiscoverable(user.uid, on)}
            disabled={settings === undefined}
          />
        </div>
        {lockSupported && (
          <div className="px-2 py-3">
            <Toggle
              icon={<Tile icon={Lock} />}
              label="App lock"
              description="Fingerprint, face or phone PIN each time kira opens."
              checked={!!lock.enabled}
              onChange={lock.set}
            />
          </div>
        )}
        <ListRow
          icon={<Tile icon={QrCode} />}
          title="Payment QR"
          subtitle={settings === undefined ? undefined : settings?.tngQr ? 'On your split receipts' : 'Not set'}
          trailing={chevron}
          onClick={() => setQrOpen(true)}
        />
      </Group>
      <PaymentQrSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        qr={settings?.tngQr}
        onSave={(url) => setPaymentQr(user.uid, url)}
        onRemove={() => setPaymentQr(user.uid, null)}
      />

      <Group title="Data">
        <ListRow icon={<Tile icon={DatabaseBackup} />} title="Backup" subtitle="Export or import your data" trailing={chevron} onClick={() => setBackupOpen(true)} />
      </Group>
      <BackupSheet open={backupOpen} onClose={() => setBackupOpen(false)} uid={user.uid} />

      <Group title="About" footer="kira records your app version and device type to help with updates.">
        <ListRow
          icon={<Tile icon={Smartphone} />}
          title={`${IS_DEV_BUILD ? 'kira dev' : 'kira'} v${APP_VERSION}`}
          subtitle={update ? `v${update.release.version} is available` : Capacitor.isNativePlatform() ? undefined : 'Updates automatically'}
          trailing={
            update && (
              <PillButton size="pill-sm" onClick={onUpdate}>
                Update
              </PillButton>
            )
          }
        />
        {changes.length > 0 && (
          <ListRow icon={<Tile icon={Sparkles} />} title="What's new" subtitle="What changed in each update" trailing={chevron} onClick={() => setWhatsNewOpen(true)} />
        )}
      </Group>
      <WhatsNewSheet open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} entries={changes} />

      <PillButton variant="secondary" onClick={logOut} className="text-destructive">
        Sign out
      </PillButton>
    </div>
  )
}
