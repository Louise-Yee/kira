# kira — project rules

Personal expense tracker PWA. Product spec: `SPEC.md`. Task list: `PLAN.md`. Do the tasks in order and stay within the scope of the one you're on.

## Reusable components (most important)
- **Before writing any UI, check `src/components/` for something that already does it.** Use it, or extend it with a prop, instead of building a near-copy.
- Anything used in **two or more places**, or that is a general UI piece (sheet, input, row, button, toggle, picker, money display), goes in `src/components/` as its own component.
- Keep markup that's used in only one place inline in its screen file. Don't make a component for a single use.
- When you notice the same markup written twice, extract it into a component in the same task.
- shadcn primitives live in `src/components/ui/`. Restyle them through tokens and variants; don't fork them into a second copy.
- Logic follows the same rule: shared helpers go in `src/lib/` (money and date formatting, Firestore access). Never format money or dates inline.

## Code
- Stack: Vite + React 19 + TS, Tailwind v4, shadcn, motion, lucide-react, Firebase v13 (Auth + Firestore only).
- TypeScript: never use `any`, `unknown` (except a `catch` variable you narrow before use), `object`, `{}` or `Function`. Let types be inferred, or write precise ones.
- Imports use the `@/` alias for `src/`.
- Pure logic (math, dates, parsing) goes in a plain `.ts` file with no React or Firebase imports. Each one comes with an assert-based check script at `scripts/check-*.ts`, run as `node scripts/check-x.ts`.
- API keys and config IDs live in `.env` (gitignored) and are read through `import.meta.env.VITE_*`, typed in `src/vite-env.d.ts`. Never hardcode them in source. Add every new variable to `.env.example` with an empty value.
- No new dependency without saying why. The ones already planned are in `PLAN.md`.

## Data
- Money is **integer sen** everywhere. Amounts are entered only through `<AmountInput>` (TNG-style, digits fill from the right). Use `digitsToSen` / `formatRM` from `src/lib/money.ts`, and never use float math for money.
- Dates are local `YYYY-MM-DD` strings from `src/lib/date.ts`. Never use `toISOString()` to get a date.
- All Firestore access goes through `src/lib/db.ts`. **Never `await` a write in the UI**: the app is offline-first, and a pending write resolves only once it reaches the server.
- Data lives under `users/{uid}/...` only, and `firestore.rules` stays locked to the owner.
- **Billing:** the Firebase project stays on the free Spark plan. Never add Cloud Functions, Storage, extensions or anything that needs Blaze. Keep reads low (listen to bounded date ranges, never the whole history).
- Never write to the live Firestore database from a script or the CLI without the user's explicit approval.

## Design
- Use only the color tokens in `src/index.css`. No raw hex or Tailwind palette colors (`blue-500`) in components.
- Text is 16px (`text-base`) or larger. Headings and big numbers use `font-heading` (Bricolage Grotesque).
- Surfaces are flat with rounded pills; touch targets are 44px or more. Phones get a bottom tab bar; `lg` gets a sidebar.
- Motion uses springs only, through the presets in `src/lib/motion.ts` (`pop`, `soft`, `press`); no linear or ease curves. `MotionConfig reducedMotion="user"` wraps the app, so canvas or JS animation must check `useReducedMotion()` itself.
- The sign-in screen is always dark.

## Workflow
- Never commit to `main` directly. Each task gets its own branch off `main`, named `<type>/<kebab-name>`. The type is `feature`, `fix`, `chores` or `refactor`, for example `feature/amount-input` or `fix/month-end-clamp`. The PR check rejects any other name.
- Open a PR into `main`. Every PR gets a preview deploy, and merging into `main` deploys the live site. Don't run `firebase deploy` by hand unless `firestore.rules` changed: CI deploys hosting only.
- After each task, run `npm run build` and `npm run lint`, plus any check scripts the task touches. Report failures exactly as they appear.
- Rules deploy (only when `firestore.rules` changed): `firebase deploy --only firestore:rules`.
- Commit only when the user asks. Never add a `Co-Authored-By` line to commits or PR descriptions.
- If the plan looks wrong once you're in the code, stop and ask; don't improvise around it.
