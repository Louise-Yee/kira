// Pure data (type-only imports) so scripts/check-seed.ts can load it under plain node.
import type { Category, WithId } from '@/lib/db'

type Seed = Omit<Category, 'order' | 'archived'>

const expense: Seed[] = [
  { name: 'Food', kind: 'expense', icon: 'food', color: 'cat-1' },
  { name: 'Groceries', kind: 'expense', icon: 'groceries', color: 'cat-4' },
  { name: 'Transport', kind: 'expense', icon: 'transport', color: 'cat-6' },
  { name: 'Bills', kind: 'expense', icon: 'bills', color: 'cat-2' },
  { name: 'Rent', kind: 'expense', icon: 'rent', color: 'cat-7' },
  { name: 'Shopping', kind: 'expense', icon: 'shopping', color: 'cat-8' },
  { name: 'Entertainment', kind: 'expense', icon: 'entertainment', color: 'cat-3' },
  { name: 'Health', kind: 'expense', icon: 'health', color: 'cat-5' },
  { name: 'Subscriptions', kind: 'expense', icon: 'subscriptions', color: 'cat-7' },
  { name: 'Other', kind: 'expense', icon: 'other', color: 'cat-2' },
]

const income: Seed[] = [
  { name: 'Salary', kind: 'income', icon: 'salary', color: 'cat-4' },
  { name: 'Side income', kind: 'income', icon: 'side-income', color: 'cat-5' },
  { name: 'Other', kind: 'income', icon: 'other', color: 'cat-2' },
]

const slug = (s: Seed) => (s.kind === 'income' && s.name === 'Other' ? 'other-income' : s.name.toLowerCase().replace(/ /g, '-'))

/** Fixed ids: two devices seeding at once write the same documents instead of duplicates. */
export const defaultCategories: WithId<Category>[] = [...expense, ...income].map((s, i) => ({
  ...s,
  id: slug(s),
  order: i < expense.length ? i : i - expense.length,
  archived: false,
}))
