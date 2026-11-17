import { motion } from 'motion/react'
import type { AppUser } from '@/lib/firebase'
import { pop } from '@/lib/motion'
import { Ascii } from '@/components/ascii'
import { coinField, type Field } from '@/lib/coin'

// Coin peeking in from the right edge of the balance card; x scaled for the ~2.5:1 card.
const heroField: Field = (nx, ny) => coinField((nx - 0.8) * 1.5, ny * 0.6, 0)

export function Home({ user }: { user: AppUser }) {
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
