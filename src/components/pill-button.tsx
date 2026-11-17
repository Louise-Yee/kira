import type { ComponentProps } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { press } from '@/lib/motion'

const MotionButton = motion.create(Button)

/** The 56px (or `pill-sm` 44px) pill button: variants default (cobalt), secondary, inverse, destructive. */
export function PillButton({ size = 'pill', ...props }: ComponentProps<typeof MotionButton>) {
  return <MotionButton size={size} whileTap={press} {...props} />
}
