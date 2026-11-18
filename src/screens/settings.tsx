import { useCallback, useState } from 'react'
import { ChevronRight, DatabaseBackup, QrCode, Smartphone, type LucideIcon } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import {
  categoryInUse,
  deleteCategory,
  moveAndDeleteCategory,
  saveCategory,
  setPaymentQr,
  swapCategoryOrder,
  useCategories,
  useSettings,
} from '@/lib/db'
import { logOut, type AppUser } from '@/lib/firebase'
import { navPositions, type NavPos } from '@/lib/nav'
import { readTheme, setTheme, type Theme } from '@/lib/theme'
import { APP_VERSION, type Update } from '@/lib/update'
import { BackupSheet } from '@/components/backup-sheet'
import { CategoryIcon } from '@/components/category-icon'
import { ListRow } from '@/components/list-row'
import { PaymentQrSheet } from '@/components/payment-qr-sheet'
import { PillButton } from '@/components/pill-button'
import { Segmented } from '@/components/segmented'
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
}

function Tile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

export function SettingsScreen({ user, navPos, onNavPos, update, onUpdate }: Props) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const categories = useCategories(user.uid) ?? []
  const [managing, setManaging] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const settings = useSettings(user.uid)
  const isUsed = useCallback((id: string) => categoryInUse(user.uid, id), [user.uid])
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
      <ListRow
        icon={<CategoryIcon name="other" color="cat-6" tile />}
        title="Categories"
        trailing={<ChevronRight className="size-5 text-muted-foreground" />}
        onClick={() => setManaging(true)}
      />
      <CategoriesManager
        open={managing}
        onClose={() => setManaging(false)}
        categories={categories}
        onSave={(data, id) => saveCategory(user.uid, data, id)}
        onSwap={(a, b) => swapCategoryOrder(user.uid, a, b)}
        isUsed={isUsed}
        onDelete={(id) => deleteCategory(user.uid, id)}
        onMove={(from, to) => moveAndDeleteCategory(user.uid, from, to)}
      />
      <ListRow
        icon={<Tile icon={QrCode} />}
        title="Payment QR"
        subtitle={settings === undefined ? undefined : settings?.tngQr ? 'On your split receipts' : 'Not set'}
        trailing={<ChevronRight className="size-5 text-muted-foreground" />}
        onClick={() => setQrOpen(true)}
      />
      <PaymentQrSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        qr={settings?.tngQr}
        onSave={(url) => setPaymentQr(user.uid, url)}
        onRemove={() => setPaymentQr(user.uid, null)}
      />
      <ListRow
        icon={<Tile icon={DatabaseBackup} />}
        title="Backup"
        subtitle="Export or import your data"
        trailing={<ChevronRight className="size-5 text-muted-foreground" />}
        onClick={() => setBackupOpen(true)}
      />
      <BackupSheet open={backupOpen} onClose={() => setBackupOpen(false)} uid={user.uid} />
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
      <ListRow
        icon={<Tile icon={Smartphone} />}
        title={`kira v${APP_VERSION}`}
        subtitle={update ? `v${update.release.version} is available` : Capacitor.isNativePlatform() ? undefined : 'Updates automatically'}
        trailing={
          update && (
            <PillButton size="pill-sm" onClick={onUpdate}>
              Update
            </PillButton>
          )
        }
      />
      <PillButton variant="secondary" onClick={logOut}>
        Sign out
      </PillButton>
    </div>
  )
}
