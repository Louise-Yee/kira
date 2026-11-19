import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import type { Tick } from '@/lib/haptic-pacer'

// The OS decides whether to vibrate (system vibration setting); web falls back to navigator.vibrate.
// Call sites use the semantic functions below so the whole app's feel is tuned here.

const styles: Record<Tick, ImpactStyle> = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }

/** Fire-and-forget: a missing vibrator or blocked call is not worth surfacing. */
function fire(p: Promise<void>) {
  p.catch(() => {})
}

/** Raw impact at a chosen strength: the coin's speed-scaled ticks. */
export function tick(style: Tick) {
  fire(Haptics.impact({ style: styles[style] }))
}

/** Pressing a primary button (the add FAB). */
export const press = () => tick('medium')

/** A sheet opening or being dragged closed. */
export const sheet = () => tick('light')

/** A swipe crossing its commit threshold. */
export const detent = () => tick('light')

/** A "detent" for moving a selection (tabs). */
export function select() {
  fire(Haptics.selectionChanged())
}

/** Something saved or finished. */
export const success = () => fire(Haptics.notification({ type: NotificationType.Success }))

/** A point of no return (delete confirm). */
export const warning = () => fire(Haptics.notification({ type: NotificationType.Warning }))

/** A small shower of coins (joining a group): a few light ticks, then one soft thump as they land. */
export function coinBurst() {
  for (let i = 0; i < 5; i++) setTimeout(() => tick('light'), i * 60)
  setTimeout(() => tick('medium'), 520)
}

/** Something failed. */
export const error = () => fire(Haptics.notification({ type: NotificationType.Error }))
