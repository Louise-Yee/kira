# kira — Implementation plan

Read `SPEC.md` first (the product spec) and `CLAUDE.md` (the rules). This file splits the remaining work into tasks that each fit one session. Do them in order: later tasks depend on earlier ones.

**For every task:**
1. Read the files listed under *Read first* before you write anything.
2. Stick to the scope. If something seems wrong or missing, stop and ask; don't invent features.
3. Finish with `npm run build` and `npm run lint`. If the task has a check script, also run `node scripts/<name>.ts`.
4. Work on a branch named `feature/…`, `fix/…`, `chores/…` or `refactor/…` (kebab-case), and open a PR into `main`. The PR gets a preview URL, and merging deploys to the live site. If you changed `firestore.rules`, also run `firebase deploy --only firestore:rules`.
5. Never commit or push unless the user asks.

**Status:** P0 and P1 are done and deployed. Next up is P2.

**P0.5 (done):** floating glass nav (active tab shows its label), directional page slide on phones, nav position setting (left/right/bottom at `lg`, kept in localStorage).

**What changed from the plan during P1** (the code is the source of truth; these are the deviations):
- **Theme picker** (System / Light / Dark) added to Settings. The choice lives in localStorage (`kira.theme`) so the inline script in `index.html` can apply it before first paint. The nav position setting also stays in localStorage, so the planned move to `settings/main` is dropped, and `Settings` has no `theme` field.
- **Colour tokens** `--cat-1..8` were added with the P1.3 display components, not P1.4. P1.4 only assigns them to the default categories.
- **`useSyncStatus(uid, ym)`** takes the month being viewed (it lives in the shell) and also watches the categories. A pending write in a month you aren't viewing isn't seen.
- **Seeding** asks the server (`getDocFromServer`) and skips when offline, instead of trusting the cache.
- **Deleting a category** asks the server whether it is in use (never the cache). Offline, delete is blocked and archive is offered. Archived categories can be restored. Move-and-delete runs in chunked batches and only deletes after every batch is acked.
- **Dev gallery** (`/?gallery`, `/?gallery=month`, dev builds only) is kept as a component playground that needs no sign-in. `?dev` skips sign-in but has no Firestore access.
- **Extra pure logic:** `lib/month-summary.ts` and `lib/default-categories.ts`, each with a check script (`check-month.ts`, `check-seed.ts`).
- **Branch rule:** merges into `main` go through a PR; a repository ruleset blocks direct updates.

**Assumed decisions** (the user hasn't confirmed these yet; change them here if they do):
- Default categories. Expense: Food, Groceries, Transport, Bills, Rent, Shopping, Entertainment, Health, Subscriptions, Other. Income: Salary, Side income, Other.
- Amount entry is **TNG-style (cash register)**: the phone's own number pad (`inputMode="numeric"`), and digits fill from the right: `0.00 → 0.01 → 0.12 → 1.23 → 12.34`. Backspace removes the last digit. There's no decimal key, so cents always have exactly 2 digits.

---

## Target file layout

```
src/
  main.tsx, App.tsx          App.tsx only does the auth gate and the shell
  index.css                  tokens (don't add raw colors anywhere else)
  lib/
    firebase.ts              auth + Firestore instance
    motion.ts                spring presets
    coin.ts, coin3d.ts       ASCII coin math
    money.ts                 sen <-> text, formatting
    date.ts                  local ISO dates, month ranges, day labels
    db/                      Firestore access, import from '@/lib/db' (index.ts barrel)
      types.ts               Category, Transaction, Settings, WithId, drafts, SyncStatus
      core.ts                typed refs, newId, save/remove (never awaited)
      use-docs.ts            generic live-query hook
      categories.ts          categories hook + save, reorder, in-use check, delete, move
      transactions.ts        month hook + save/delete
      settings.ts, sync.ts   settings hook, offline/saving status
    month-summary.ts         pure totals and day grouping
    category-icons.ts        fixed icon list + colour token helper
    default-categories.ts    seed data (pure)
    seed.ts                  first sign-in seeding
    theme.ts, nav.ts         theme and nav-position (localStorage)
    recurrence.ts            pure recurring-date logic        (P2)
    split.ts                 pure split math                  (P4)
    backup.ts                export/import                    (P5)
  components/
    ui/                      shadcn primitives (generated)
    ascii.tsx, tab-bar.tsx   ASCII texture, bottom/side nav
    ...shared components (see P1.3): sheet, amount-input, segmented, pill-button, text-field,
      category-icon, category-picker, list-row, money, fab, empty-state, transaction-sheet, sync-pill
  screens/
    sign-in.tsx, home.tsx, month-view.tsx, settings.tsx, recurring.tsx (P2), split.tsx (P4)
    categories/              manager.tsx, category-form.tsx, delete-flow.tsx
    gallery.tsx              dev-only component playground (stripped from production)
scripts/
  check-*.ts                 self-checks, run with `node scripts/check-x.ts`
```

---

## P1 — Categories, transactions, month view, offline indicator

**Done when:** you can log spending offline on the phone and see it on desktop after it reconnects.

### P1.0 Split App.tsx into screens (done)
*Read first:* `src/App.tsx`
- Move `SignIn` + `GoogleIcon` → `src/screens/sign-in.tsx`, `Home` → `src/screens/home.tsx`, `SettingsScreen` → `src/screens/settings.tsx`. Move the nav into `src/components/tab-bar.tsx`.
- `App.tsx` keeps `App`, `Shell` and the `tabs` list.
- This is a move only: no behavior or style changes.

### P1.1 Money and dates (done)
*New:* `src/lib/money.ts`, `src/lib/date.ts`, `scripts/check-money.ts`
- `digitsToSen(text): number`: strips every non-digit, drops leading zeros, caps the result at 9 digits (RM 9,999,999.99) and returns integer sen. `"123"` → 123 (RM 1.23); `""` → 0. This is the whole amount-entry model. There's no decimal parsing, so no float math is involved.
- `formatRM(sen, { sign?: boolean }): string` gives `"RM 1,234.50"`. With `sign: true` it returns `"+RM 5.00"` / `"−RM 5.00"` (use the real minus sign U+2212).
- `todayISO()` returns the **local** date as `YYYY-MM-DD`, not UTC. Malaysia is UTC+8, so `toISOString()` is wrong before 8am.
- `monthRange('2026-11')` returns `{ start: '2026-11-01', end: '2026-12-01' }` (end exclusive). Also add `addMonths(ym, n)` and `monthLabel(ym)` → `"November 2026"`.
- The check script asserts `digitsToSen` edge cases (`""`, `"0007"`, pasted `"RM 12.50"` → 1250, the 9-digit cap), `formatRM` (0, 5, 123456789, sign), the year rollover in `addMonths`, and `todayISO` against a fixed `Date`.

### P1.2 Data layer (done)
*Read first:* `src/lib/firebase.ts`, SPEC §4, §5.6
*New:* `src/lib/db/` (a folder behind an `index.ts` barrel; import from `@/lib/db`)
- Types `Category`, `Transaction`, `Settings`, exactly as in SPEC §4 (`kind: 'expense' | 'income'`, `amount` in sen, `date` as a `YYYY-MM-DD` string).
- Typed refs: `col(uid, 'transactions')` etc., using `withConverter` so reads come back typed. Add `newId(uid, name)` = `doc(collection(...)).id`.
- Hooks, all built on `onSnapshot` (served from the cache instantly when offline):
  - `useCategories(uid)`: ordered by `order`.
  - `useMonth(uid, ym)`: transactions with `date >= start && date < end`, ordered by date desc.
  - `useSettings(uid)`.
- Writes go through `save(ref, data)` / `remove(ref)` helpers that call Firestore **without awaiting**: `void setDoc(...).catch(reportError)`. The UI never waits on a write.
- `useSyncStatus()` returns `'offline' | 'saving' | 'synced'`. Base it on `navigator.onLine` plus `hasPendingWrites` from a metadata listener (`includeMetadataChanges: true`) on the current month query.

### P1.3 Shared components (done)
*Read first:* `src/lib/motion.ts`, `src/components/ui/button.tsx`, `src/index.css`, SPEC §6
Build these in `src/components/`. **Every later screen must use them** instead of hand-rolling its own.
- `sheet.tsx`, `<Sheet open onClose title>`: a bottom sheet on phones that slides up with the `pop` spring, has a drag handle, closes on backdrop tap or a downward drag past a threshold, and respects the safe area. At `lg` it becomes a centered dialog. Closes on Esc and traps focus (use the shadcn/radix Dialog underneath for accessibility; restyle it).
- `amount-input.tsx`, `<AmountInput value onChange autoFocus>`: a big Bricolage number with an "RM" prefix, filled TNG-style from the right. Its value is sen (`0` = empty).
  - It's a real `<input inputMode="numeric">` so the phone's number pad opens. It shows `formatRM(value)` without the prefix. `onChange` runs `digitsToSen(e.target.value)`, so typing, backspace and paste all go through the same path.
  - Keep the caret at the end after every change (`setSelectionRange` in an effect). Typing in the middle makes no sense in this model.
  - Each new digit gives a tiny spring "pop" on the number (skipped with reduced motion). An amount of 0 shows the muted `0.00` placeholder colour.
  - Save buttons treat `0` as invalid.
- `segmented.tsx`, `<Segmented options value onChange>`: a pill toggle with a sliding `layoutId` thumb (the same look as the tab pill). Used for Expense/Income now, and for frequency and split mode later.
- `category-picker.tsx`: a wrapping grid of category chips (icon + name, color dot). Used for single select.
- `category-icon.tsx`: maps an icon name string to a lucide icon. Keep a fixed list of about 20 icons, used both for picking and for rendering.
- `list-row.tsx`, `<ListRow icon title subtitle trailing onClick>`: the standard row used by transactions, rules and splits.
- `money.tsx`, `<Money sen sign? countUp? className>`: formatted amount. With `countUp` it animates from the previous value with a spring (`useSpring` from motion); with reduced motion it just shows the value.
- `fab.tsx`: a floating "+" button above the tab bar on phones (thumb reach) and inline at `lg`.
- `empty-state.tsx`: an icon + one line + an optional action button.
- `pill-button.tsx`, or variants added to `ui/button.tsx`: the primary (cobalt) and secondary (grey) 56px pill buttons already used in the sign-in and settings screens. Swap those existing buttons over to it.

### P1.4 Seed categories (done)
*Read first:* `src/lib/db/`
- On sign-in, if `settings/main` doesn't exist, write the defaults (see *Assumed decisions*) plus `settings/main` in one `writeBatch`.
- **Use deterministic IDs for the defaults** (`food`, `groceries`, `salary`, …). If two devices seed at the same time, they write the same documents instead of duplicates.
- Give each default an icon from the `category-icon` list and a color from a fixed palette of about 8 OKLCH-matched hues. Put the palette in `index.css` as `--cat-1` to `--cat-8` and have categories store the token name, not a hex value.

### P1.5 Add/edit transaction (done)
*Read first:* the P1.3 components, `src/lib/db/`
- `src/components/transaction-sheet.tsx`, built from `Sheet` + `Segmented` (Expense/Income) + `AmountInput` + `CategoryPicker` + a date field (native `<input type="date">`, default today) + a note field.
- Save is disabled until the amount is valid and a category is picked. When editing, it also offers Delete, behind a confirm step.
- The FAB opens it empty; tapping a transaction row opens it filled in.
- Transactions created by a recurring rule or a split show a small badge ("Recurring" / "Split") and still save normally.

### P1.6 Month view (Home) (done)
*Read first:* `src/screens/home.tsx`
- A month switcher (‹ November 2026 ›) at the top; no going past the current month.
- The hero card shows "Left in {month}" = income − expense for the month, using `<Money countUp>`. Below it are two small stats: In and Out.
- Under that, transactions grouped by day ("Today", "Yesterday", "Mon, 10 Nov"), each group with its day total. Rows pop in with a stagger.
- If the month has no transactions, show `EmptyState` with an "Add expense" action.

### P1.7 Categories manager (done)
*In:* `src/screens/settings.tsx` → a "Categories" row that opens a sheet
- Expense/Income tabs (`Segmented`), a list of categories, add/rename, and icon + color pickers.
- Reorder with up/down buttons. Skip drag-to-reorder for now.
- Delete: if the category is unused, delete it. If it's in use, offer **Move transactions to…** (pick a category, then batch-update them) or **Archive** (hidden from the picker, still shown on old transactions).
- The usage check needs a `where('categoryId', '==', id)` query with `limit(1)`.

### P1.8 Sync indicator (done)
- A small pill in the header: shows "Offline" (grey) or "Saving…" (cobalt pulse) and hides when synced. It pops in and out with the `pop` spring.

---

## P2 — Recurring engine

**Done when:** rent and salary post automatically every month, with no duplicates across devices.

### P2.1 Recurrence math (pure)
*Read first:* SPEC §5.2
*New:* `src/lib/recurrence.ts`, `scripts/check-recurrence.ts`
- `occurrenceDate(rule, n): string`, the date of occurrence `n` (0-based), **always computed from `startDate`**, never from the previous occurrence.
  - day/week: add `n × interval × (1|7)` days.
  - month/year: add `n × interval` months (×12 for year), then clamp the day to the length of that month. A rule started Jan 31 gives Feb 28 (29 in a leap year), Mar 31, Apr 30.
  - Work in UTC date parts (`Date.UTC`) so DST never shifts a day.
- `dueIndices(rule, fromIndex, today): number[]` returns every `n >= fromIndex` with `occurrenceDate <= today`, respecting `end` (`never`, `date` inclusive, or `count` = total occurrences) and `paused` (paused → none).
- `nextDate(rule, fromIndex)` gives the next upcoming date, or null when the rule has ended.
- The check script covers: month-end clamping across a leap year, every 3 months, yearly from Feb 29, weekly, count end, date end, paused, and a 5-year backlog (60 indices).

### P2.2 Poster
*New:* `src/lib/post-recurring.ts`, called once per app open after sign-in, and again when the app becomes visible on a new day.
- Add `posted: number` to the recurring doc: the count of occurrences already created.
- For each rule: `idx = dueIndices(rule, rule.posted, todayISO())`. In one batch, write each transaction with ID `{ruleId}_{n}` (fields copied from the rule, plus `recurringId` and `occurrence: n`) and set `posted` to the last `n + 1`.
- Why `posted` instead of re-checking existence: a posted transaction the user deleted on purpose must not come back.
- The deterministic IDs mean two offline devices posting the same occurrence write the same document, so there are no duplicates.
- Batch limit: 500 writes. Chunk them if a backlog is larger than that.

### P2.3 Recurring screen
*New:* `src/screens/recurring.tsx`, `src/components/recurring-sheet.tsx`
- List the rules as `ListRow`s: name/category, amount, and "Every month · next 1 Dec". Split them into Active and Ended/paused sections.
- The sheet reuses the transaction fields (`Segmented`, `AmountInput`, `CategoryPicker`, note), plus:
  - frequency: `Segmented` (Weekly / Monthly / Yearly / Custom); Custom shows "every [N] [day|week|month|year]";
  - start date;
  - end: `Segmented` (Never / On date / After N payments);
  - a pause toggle.
- Show a preview line: "Next: 1 Dec, 1 Jan, 1 Feb…" (the next 3 dates from `occurrenceDate`).
- **Editing:** changes to amount, category, note, end or paused apply to future occurrences, because they come from the rule at posting time. Changes to **frequency, interval or start date** end the old rule (`end = { type: 'count', value: posted }`) and create a new rule. Tell the user this in the sheet with one line of help text.
- **Deleting:** a confirm with two choices, "Delete rule, keep past transactions" or "Delete rule and its N transactions" (query `where('recurringId','==',id)`, batch delete).
- Saving a rule runs the poster immediately, so a rule starting today posts right away.

---

## P3 — Dashboard charts

**Done when:** Home shows spending by category and a 6-month trend.

### P3.1 Charts
*Read first:* SPEC §5.4, the shadcn chart docs
- `npx shadcn@latest add chart` (adds Recharts). Colors come from `--chart-*` / `--cat-*` tokens only.
- `useMonths(uid, fromYm, toYm)` in `src/lib/db/transactions.ts`: one listener for the 6-month range. Don't open 6 listeners.
- **Spending by category:** horizontal bars sorted by amount, each with the category color, icon, amount and %. These read better on a phone than a donut. Bars grow in with a spring.
- **6-month trend:** grouped bars for in vs out per month; tapping a month switches the month view to it.
- Both go on Home below the hero card, and on desktop in a two-column grid.
- If the month has no data, hide the charts rather than draw empty axes.

---

## P4 — Split bill and receipt image

**Done when:** a receipt image is sent through WhatsApp from the phone.

### P4.1 Split math (pure)
*Read first:* SPEC §5.5
*New:* `src/lib/split.ts`, `scripts/check-split.ts`
- `computeShares({ people, items, charges }): { person: number, subtotal, charge, total }[]`, all in sen.
- For each item: divide `amount` among `item.people` using **largest remainder**. Floor each share, then give the leftover sen one by one to the people with the biggest fractional parts (ties go to the lower index).
- Charges:
  - `percent`: grandTotal = round(subtotal × (1 + p/100)).
  - `total`: grandTotal = the entered receipt total.
  - Either way, distribute grandTotal proportionally to each person's subtotal, again with largest remainder, so **shares always sum exactly to grandTotal**.
- Simple mode: one item with everyone on it (even split), or exact amounts per person (no charges).
- Check script cases: the user's sheet (16% tax, a 6.80 item shared by 3 → 2.27/2.27/2.26 before tax), shares summing to the total for 100 random bills, a receipt total that isn't a clean multiplier, a person with no items getting 0.

### P4.2 TNG QR upload
*In:* `src/screens/settings.tsx`
- "Payment QR" row → `<input type="file" accept="image/*">` → draw it on a canvas scaled to at most 600px on the long side → `toDataURL('image/webp', 0.85)` (fall back to jpeg if the browser doesn't support WebP).
- Reject the image if the result is over 300 KB (the Firestore doc limit is 1 MB). Store it in `settings/main.tngQr` and show a preview with Replace / Remove.

### P4.3 Split screen and editor
*New:* `src/screens/split.tsx`, `src/components/split-editor.tsx`
- The list shows past splits (`ListRow`: title, date, my share), with the FAB for a new one.
- The editor is a full-screen sheet with these steps on one scrolling page:
  1. Title + date.
  2. People: chips. "Me" is always first. Suggestions come from names used in past splits.
  3. Mode: `Segmented` (Itemized / Even).
  4. Items (itemized): name (optional), `AmountInput`, and a tap-to-toggle chip per person.
  5. Charges: `Segmented` (Percent / Receipt total); percent defaults to 16.
  6. Live preview of each person's total, recomputed on every change with `computeShares`.
  7. Category for my share (`CategoryPicker`, default Food).
- On Save, one batch writes the split doc (with the computed `shares` stored as fixed values) and my expense transaction (`splitId`, ID = `{splitId}_me`).
- Editing re-saves both. Deleting asks, then removes both.

### P4.4 Receipt image and share
*New:* `src/components/receipt-card.tsx`, `src/lib/share-image.ts`
- `npm i modern-screenshot`.
- The receipt card has a fixed 1080px-wide layout, rendered off-screen. It shows the title and date, a per-person block (items with their share of each, subtotal, tax, **total** in big Bricolage type), the grand total, and the TNG QR with "Scan to pay (TNG)". The `Ascii` texture goes faintly in the header. Always use the dark theme so the texture works.
- `shareImage(node, filename)`: `domToBlob(node, { scale: 1 })`. Then `navigator.canShare({ files })` → `navigator.share`; otherwise download through an `<a download>`.
- **Before rendering, wait for fonts** (`document.fonts.ready`) and check that the canvas texture actually shows in the PNG. If modern-screenshot drops the canvas, copy it into an `<img src={canvas.toDataURL()}>` first.
- Buttons on a saved split: "Share receipt" (all people) and a per-person share.

---

## P5 — Backup and polish

**Done when:** export → wipe a test account → import gives back identical data.

### P5.1 Export
*New:* `src/lib/backup.ts`
- JSON: `{ version: 1, exportedAt, settings, categories, transactions, recurring, splits }`, every document with its ID. Use `getDocs` here (a one-off read, and it's fine to await).
- CSV of transactions: `date,kind,amount,category,note,source`. Amounts are decimal RM (`12.50`), and fields are RFC 4180 quoted (escape `"`, wrap fields containing commas or newlines). Add a UTF-8 BOM so Excel opens it correctly.
- Filenames: `kira-backup-YYYY-MM-DD.json` / `.csv`. Delivered through the same `share-image`-style save helper (share sheet on phone, download on desktop).

### P5.2 Import
- JSON only. Validate it by hand: check `version === 1` and the shape of each document. **Reject the whole file if any document is invalid**, and say which one.
- Merge with `setDoc(ref, data)` by the original IDs, so importing twice doesn't duplicate. Write in batches of 500.
- Before writing, show a summary ("142 transactions, 12 categories, 3 rules, 4 splits. Existing items with the same ID will be overwritten") and require a confirm.
- Add `scripts/check-backup.ts` to cover the CSV escaping and the validator.

### P5.3 Polish pass
- Check reduced motion on every screen (springs → fades; the coin doesn't spin).
- Check keyboard and screen-reader basics: labels on icon buttons, focus visible, sheets trap focus.
- Check there's no text under 16px, nothing scrolls horizontally at 360px wide, and touch targets are at least 44px.
- Run Lighthouse PWA + performance on the deployed site, and fix anything red.
- Fix the leftover oxlint warnings.

---

## P6 — Android app (Capacitor) and home-screen widget

**Done when:** pushing a `v*` tag publishes a signed APK to GitHub Releases. The installed app signs in with Google and works offline, and a home-screen widget shows this month's numbers with a quick-add button.

The web app and PWA stay as they are. The APK wraps the same `dist/` build. Android only.

**Decisions** (confirmed by the user):
- App ID `app.kira`, app name "kira".
- The widget is 4×1 or 4×2. It shows "Left in {month}" (the same number as the hero card) plus In and Out, and has a "+" button that opens the app straight into the add-transaction sheet.
- Releases are sideloaded from GitHub only (no Play Store). There's no auto-update: each release means a manual reinstall.

### P6.1 Capacitor setup
- `npm i @capacitor/core @capacitor/android @capacitor/app @capacitor/preferences` and `npm i -D @capacitor/cli`. Then `npx cap init kira app.kira --web-dir dist` and `npx cap add android`. Commit `android/`.
- `vite-plugin-pwa`: **don't register the service worker inside the native app** (check `Capacitor.isNativePlatform()`). The assets are already bundled, and a service worker in the WebView only causes stale-cache bugs.
- Add npm scripts: `"android": "npm run build && npx cap sync android && npx cap open android"`.
- App icon and splash screen come from `public/icon.svg`, generated with `@capacitor/assets`. Use the dark splash background.
- Safe areas: the WebView runs edge-to-edge, and the existing `env(safe-area-inset-*)` CSS must still apply. Test on a device with gesture navigation.

### P6.2 Native Google sign-in
*Read first:* `src/lib/firebase.ts`
- Google blocks OAuth inside WebViews, so the popup and redirect flows won't work. Use `@capacitor-firebase/authentication` with `skipNativeAuth: true`: native Google sign-in returns an ID token, and then the JS SDK signs in with `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`. That way Firestore, `useUser()` and the rest of the app don't change.
- `signIn()` picks the native path when `Capacitor.isNativePlatform()`, and keeps the current popup/redirect path otherwise. `logOut()` also signs out of the native layer.
- `authDomain` on native: `${PROJECT}.firebaseapp.com`.
- **Firebase console (a change to the project, so confirm with the user first):** add an Android app with package `app.kira` and the SHA-1 fingerprints of both the debug and the release keystore. Download `google-services.json` into `android/app/`. **Gitignore it.** CI writes it from the `GOOGLE_SERVICES_JSON` secret, the same way the keys go in `.env`.
- The Android app registration is free on Spark; no Blaze needed.

### P6.3 Widget
*New:* `android/app/src/main/java/app/kira/KiraWidget.kt`, `res/layout/widget_kira.xml`, `res/xml/widget_kira_info.xml`, and a small Capacitor plugin `WidgetBridge`.
- **Data flow:** the widget does **not** talk to Firestore. Whenever the current month's totals change (in `home.tsx`, through a `useEffect` on the totals), the app writes a summary to `@capacitor/preferences`: `{ ym, label, left, income, expense, updatedAt }`, with amounts in sen. It then calls `WidgetBridge.refresh()`, which broadcasts `ACTION_APPWIDGET_UPDATE`. This runs on native only and does nothing on the web.
- `KiraWidget` is an `AppWidgetProvider` using `RemoteViews` (Glance would pull in Compose; that isn't worth it for one widget). It reads the JSON from the `CapacitorStorage` SharedPreferences and formats it as `RM 1,234.50` in Kotlin.
  - If the stored `ym` isn't the current month, it shows "Open kira to update" instead of last month's numbers.
- The "+" button is a `PendingIntent` that opens `kira://add`. In the app, listen with `App.addListener('appUrlOpen')` and open the transaction sheet. Tapping the rest of the widget opens Home.
- Motion: widgets can't run custom animations (no springs or count-up; RemoteViews only renders static layouts). Use what Android gives for free: set the root view's id to `@android:id/background` so Android 12+ animates the widget expanding into the app on tap. Pressed-state ripples come from a `?android:attr/selectableItemBackground` foreground on the + button.
- Style: a cobalt `#3563FF` rounded card, white text, Bricolage as a bundled font resource for the big number, and no ASCII texture (RemoteViews can't draw it cheaply).
- Known limit: the widget only updates while the app is running. Recurring items post when the app opens, so the widget can lag until the next launch. That's acceptable for a personal app. A scheduled `WorkManager` refresh would need the native Firestore SDK; skip it.

### P6.4 Signed release builds on GitHub
*New:* `.github/workflows/release.yml`
- Generate the release keystore once, locally: `keytool -genkeypair -v -keystore kira-release.jks -alias kira -keyalg RSA -keysize 2048 -validity 10000`. **Never commit it.** Store it as the base64 secret `ANDROID_KEYSTORE_BASE64`, plus `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Back up the `.jks` somewhere safe: if it's lost, future APKs can't install over existing ones.
- Trigger: push a tag `v*` (e.g. `v1.0.0`).
- Steps: checkout, setup-node 24, `npm ci`, `npm run build` (VITE env from secrets), `npx cap sync android`, setup-java 21 (temurin), write `google-services.json` and the keystore from secrets, `./gradlew assembleRelease`.
  - `versionName` = the tag without the `v`; `versionCode` = `github.run_number`.
  - Signing config reads env vars in `android/app/build.gradle`.
- Publish with `gh release create $TAG android/app/build/outputs/apk/release/app-release.apk#kira-$TAG.apk --generate-notes`.
- Cost: free (public repo, standard runner). A build takes about 5–8 minutes.
- Update the README with how to install: download the APK from Releases and allow "install unknown apps" for the browser.
