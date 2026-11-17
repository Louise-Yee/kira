import { useState } from 'react'
import { motion } from 'motion/react'
import { signIn } from '@/lib/firebase'
import { pop } from '@/lib/motion'
import { AsciiCoin } from '@/components/ascii'
import { PillButton } from '@/components/pill-button'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 16, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { ...pop, delay: 0.08 * i },
})

export function SignIn() {
  const [error, setError] = useState('')
  return (
    // Always dark: the texture needs a dark ground.
    <main className="dark flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground">
      <motion.div {...rise(0)}>
        <AsciiCoin className="size-[min(78vw,320px)]" />
      </motion.div>
      <motion.h1
        {...rise(1)}
        className="font-heading text-8xl leading-[0.9] font-light tracking-tight [font-stretch:75%]"
      >
        kira
      </motion.h1>
      <motion.p {...rise(2)} className="mt-3 text-base text-muted-foreground">
        Every ringgit, accounted for.
      </motion.p>
      <PillButton
        {...rise(3)}
        variant="inverse"
        onClick={() =>
          signIn().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Sign-in failed'))
        }
        className="mt-10"
      >
        <GoogleIcon />
        Continue with Google
      </PillButton>
      {error && <p className="mt-4 max-w-xs text-center text-base text-destructive">{error}</p>}
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}
