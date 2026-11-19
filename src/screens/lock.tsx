import { useEffect } from 'react'
import { Lock } from 'lucide-react'
import { logOut } from '@/lib/firebase'
import { PillButton } from '@/components/pill-button'

type Props = {
  onUnlock: () => void
  /** Clears the lock so a signed-out user isn't stuck behind it. */
  onReset: () => Promise<void>
}

export function LockScreen({ onUnlock, onReset }: Props) {
  // Ask straight away; if cancelled, the button below asks again.
  useEffect(() => {
    onUnlock()
  }, [onUnlock])
  return (
    // Always dark, like sign-in.
    <main className="dark flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 pt-(--inset-top) pb-(--inset-bottom) text-foreground">
      <Lock className="size-12" aria-hidden />
      <h1 className="font-heading text-6xl leading-[0.9] font-light tracking-tight [font-stretch:75%]">kira</h1>
      <PillButton variant="inverse" onClick={onUnlock}>
        Unlock
      </PillButton>
      <PillButton variant="secondary" size="pill-sm" onClick={() => onReset().then(logOut)}>
        Sign out
      </PillButton>
    </main>
  )
}
