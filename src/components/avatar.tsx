import { useState } from 'react'
import { cn } from '@/lib/utils'

type Props = { photoURL?: string | null; name: string; className?: string }

/** A round profile photo, or the name's first letter when there is none or it fails to load. Size via `className`. */
export function Avatar({ photoURL, name, className }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  return photoURL && failed !== photoURL ? (
    <img
      src={photoURL}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(photoURL)}
      className={cn('size-12 shrink-0 rounded-full', className)}
    />
  ) : (
    <div
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-xl font-bold text-primary-foreground',
        className,
      )}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  )
}
