# Expense Tracker — Spec (v1)

Status: DRAFT v1. **[OPEN-#]** marks decisions that are still open.

## 1. Goals
- Single-user expense and income tracker, used mainly on a phone and occasionally on desktop.
- Data synced across devices, works offline, **$0 running cost**.
- Polished, playful UI inspired by the *qualities* of Wise (not its branding).
- Recurring income and expenses that post automatically.
- Split-bill receipts that people without an account can view as an image.

## 2. Non-goals (v1)
- Multi-currency (MYR only; the data model keeps a `currency` field for later)
- Budgets, subcategories, receipt photo storage
- Multi-user features, shared ledgers, public links
- Bank sync

## 3. Stack
| Concern | Choice |
|---|---|
| Framework | Vite + React + TypeScript |
| Installable app | `vite-plugin-pwa` (installable, app shell available offline) |
| UI | Tailwind + shadcn/ui, heavily restyled |
| Charts | shadcn charts (Recharts underneath) |
| Animation | Motion: springs only, no linear or sine easing |
| Auth | Firebase Auth, Google provider |
| Data | Firestore, with the offline cache kept on the device |
| Hosting | Firebase Hosting (free plan) |
| Share image | `modern-screenshot` (renders a page element to PNG) + Web Share API (falls back to a download) |

### 3.1 Billing safety (hard requirement)
- Firebase project on the **free Spark plan with no billing account linked**. Without one, Google has no way to charge you; if a quota is hit, requests fail until it resets.
- Nothing in the app needs the paid Blaze plan: no Cloud Functions, no Storage, no extensions.
- Free quotas: 50k reads, 20k writes and 20k deletes per day; 1 GiB stored. Personal use stays well under 1% of that.
- Reads are kept low by listening to one month at a time, not the full history.
- If you have an existing project that was charged, start a **new** project rather than reuse it.

## 4. Data model
Money is stored as **integer sen** (`amount: 1250` = RM 12.50), never floats.

```
users/{uid}
  settings/main:      { currency: 'MYR', theme, createdAt }
  categories/{id}:    { name, kind: 'expense'|'income', color, icon, order, archived }
  transactions/{id}:  { kind, amount, categoryId, date: 'YYYY-MM-DD', note,
                        recurringId?, occurrence?, splitId?, createdAt, updatedAt }
  recurring/{id}:     { kind, amount, categoryId, note,
                        freq: 'day'|'week'|'month'|'year', interval: N,
                        startDate, end: { type: 'never'|'date'|'count', value? },
                        paused, createdAt }
  settings/main also: { tngQr?: dataURL (compressed) }
  splits/{id}:        { title, date, mode: 'itemized'|'simple',
                        people: [name],                 // includes "me"
                        items: [{ name?, amount, people: [idx] }],
                        charges: { type: 'percent', value } | { type: 'total', value },
                        shares: [{ person, amount }],   // computed, saved as fixed values
                        expenseTxId, createdAt }
```

## 5. Features

### 5.1 Transactions
- Add, edit and delete; quick-add button within thumb reach (bottom of screen).
- Month view: grouped by day, with income / expense / net totals at the top.
- Transactions created by a recurring rule show a small "recurring" badge.

### 5.2 Recurring engine
- Frequency = `interval × freq`: monthly = 1×month, every 3 months = 3×month, yearly = 1×year, weekly = 1×week.
- End condition: never / on a date / after N occurrences (installments).
- **Posted automatically.** When the app opens, it creates every occurrence that is due up to today, including any it missed.
- Each generated transaction has ID `{recurringId}_{occurrenceIndex}`, so two devices (or an offline device that reconnects later) produce the same document and can't create duplicates.
- Month-end clamping: a rule anchored on the 31st posts on Feb 28/29 and Apr 30, then returns to the 31st where the month has one. The date is always calculated from the start date, never from the previous occurrence, so it doesn't drift.
- Editing a rule affects future occurrences only. Transactions already posted can be edited one by one.
- Deleting a rule asks whether to keep or delete the transactions it already posted.
- This is pure date logic, so it ships with a self-check test.

### 5.3 Categories
- Flat list, separate expense and income lists, each with a name, color and icon; can be reordered.
- Seeded with defaults on first login.
- Deleting a category that is in use → reassign its transactions, or archive it.

### 5.4 Dashboard
- This month: income, expense, net.
- Spending by category (donut or bar), trend over the last 6 months (bars).

### 5.5 Split bill → receipt image
- Single user; participants are free-text names (no accounts). Recently used names are suggested.
- **Itemized mode (default):** each item has a price and one or more people. A shared item is split equally among its people (e.g. 6.80 / 3).
- **Simple mode (shortcut):** a total split equally, or exact amounts per person.
- **Tax & charges:** either a percentage (default 16% = 10% service + 6% SST, as a single multiplier like your sheet) **or** the actual receipt total, which scales everyone's share proportionally. The receipt-total option matches the bill exactly, whatever method the restaurant used.
- **Rounding:** each person's share is rounded to the sen, and the leftover sen are distributed so the shares add up exactly to the total.
- Your own share is logged automatically as an expense (category chosen at creation; editable later).
- Receipt card shows: title, date, per-person items, subtotal, tax, total, plus your TNG receive QR (no fixed amount; payers type it in).
- TNG QR image is uploaded once in settings, compressed and stored as a small image inside your settings record (well under Firestore's 1 MB document limit). No paid file storage needed.
- Creates a styled receipt card → share sheet (phone) or PNG download (desktop). The image is created on the device.

### 5.6 Offline & sync
- Firestore's offline cache, with multiple tabs open at once supported.
- Reads come from the cache instantly; writes queue while offline and sync on reconnect.
- **The UI never waits for a write to finish** (offline it never would). Changes show immediately in the UI.
- A small "Saving…/Offline" indicator, based on Firestore's pending-write status.
- Conflicts: last write wins per document. That's acceptable for a single user.
- The very first sign-in on a device needs a connection.

### 5.7 Backup
- **Export:** a JSON file with everything (lossless) and a CSV of transactions (readable in a spreadsheet).
- **Import:** the JSON backup only, merged into your existing data so re-importing doesn't create duplicates.
- Note: switching phones **doesn't need** import/export; signing in brings everything back. These files are a backup and a way to take your data elsewhere.

## 6. Design direction
Inspired by Wise's *qualities*. We don't copy its green, its font or its layouts.
- Large bold numbers as the main visual element; amounts are the hero.
- Flat surfaces, almost no shadows; depth comes from color blocks and fully rounded pill buttons.
- Palette A1: cobalt `#3563FF` (hero/primary; `#6C8CFF` for buttons in dark mode) on neutral greys. Light: `#F4F4F4` background / `#FFFFFF` cards. Dark: `#121212` background / `#1E1E1E` cards / `#2B2B2B` raised elements. Tokens live in `src/index.css`.
- Type scale: body text 16px minimum, no tiny captions; big numbers set in Bricolage Grotesque.
- One expressive display font for numbers and headings, plus a plain text font. Bricolage Grotesque (display) + Inter (text).
- 8px spacing scale, touch targets of 44px or more, bottom tab bar on phone, sidebar on desktop (≥1024px).
- Light and dark mode. The sign-in screen is always dark.
- Signature texture (inspired by Hermes Agent, drawn by our own code, none of their art): an ASCII-character coin in cobalt drawn on a canvas (`src/components/ascii.tsx`, `src/lib/coin.ts`). Animated on the sign-in screen (still when reduced motion is on), faint behind the balance card, and used on the split-bill receipt (P4).
- App icon: Bayer-dithered coin, generated by `scripts/make-icon.ts`.

### 6.1 Motion
- Spring physics everywhere; small overshoot (bounce ≈ 0.25–0.35).
- Pop in/out: items scale in from 0.9 with a spring; sheets slide up with a bounce; amounts count up.
- Press feedback: buttons shrink to 0.96 when pressed.
- Respects `prefers-reduced-motion` (falls back to opacity-only fades).

## 7. Phases
| # | Scope | Done when |
|---|---|---|
| P0 | Scaffold, Firebase (free plan), Google sign-in, PWA, hosting, theme and fonts | Signed-in empty shell deployed and installable on your phone |
| P1 | Categories + transactions + month view + offline indicator | Can log daily spending offline and see it on desktop |
| P2 | Recurring engine + management UI + self-check test | Rent and salary post automatically every month |
| P3 | Dashboard charts | Category + 6-month trend |
| P4 | Split bill + receipt image + share | Receipt sent through WhatsApp from the phone |
| P5 | JSON/CSV export, JSON import, polish pass | Full backup round-trips |
