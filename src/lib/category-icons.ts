import {
  Banknote,
  Briefcase,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PawPrint,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  Car,
  type LucideIcon,
} from 'lucide-react'

/** The fixed icon set for categories. Categories store the key, never the component. */
export const categoryIcons = {
  food: Utensils,
  groceries: ShoppingCart,
  transport: Car,
  bills: Receipt,
  rent: House,
  shopping: ShoppingBag,
  entertainment: Clapperboard,
  health: HeartPulse,
  subscriptions: Repeat,
  salary: Wallet,
  'side-income': Banknote,
  work: Briefcase,
  gift: Gift,
  travel: Plane,
  education: GraduationCap,
  coffee: Coffee,
  fuel: Fuel,
  phone: Smartphone,
  fitness: Dumbbell,
  pets: PawPrint,
  other: Tag,
} as const satisfies Record<string, LucideIcon>

export type CategoryIconName = keyof typeof categoryIcons
export const categoryIconNames = Object.keys(categoryIcons) as CategoryIconName[]

/** Category colour token name ("cat-3") -> CSS value. Unknown tokens fall back to muted. */
export const catColor = (token: string): string => (/^cat-[1-8]$/.test(token) ? `var(--${token})` : 'var(--muted-foreground)')
