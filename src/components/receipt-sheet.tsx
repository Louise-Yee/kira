import { useEffect, useState } from 'react'
import { PillButton } from '@/components/pill-button'
import { Sheet } from '@/components/sheet'
import type { Split, WithId } from '@/lib/db'
import { buildReceipt } from '@/lib/receipt-data'
import { renderReceipt } from '@/lib/receipt-canvas'
import { canShareImages, shareImage } from '@/lib/share-image'
import { canShareLinks, receiptUrl, shareLink } from '@/lib/share-link'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  split: WithId<Split> | undefined
  /** The payment QR (data URL) from Settings, if set. */
  qr: string | undefined
  /** Creates (or finds) the receipt link for one person and returns its id. */
  onCreateLink: (split: WithId<Split>, person: number) => string
}

/** Preview a split's receipt image and share it: everyone's, or one person's (so others' items stay private). */
export function ReceiptSheet({ open, onClose, split, qr, onCreateLink }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Receipt" tall>
      {/* Mounted only while open; `split` stays set while the sheet slides out. */}
      {split && <Body split={split} qr={qr} onCreateLink={onCreateLink} />}
    </Sheet>
  )
}

function Body({ split, qr, onCreateLink }: Pick<Props, 'qr' | 'onCreateLink'> & { split: WithId<Split> }) {
  // null = everyone, otherwise a person index.
  const [only, setOnly] = useState<number | null>(null)
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Render ahead of the tap: sharing has to start straight from the user's gesture.
  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    renderReceipt(buildReceipt(split, only ?? undefined), qr).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImage({ blob, url })
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't create the receipt."),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [split, only, qr])

  const share = async () => {
    if (!image) return
    const who = only === null ? 'receipt' : split.people[only].toLowerCase().replace(/\W+/g, '-')
    const result = await shareImage(image.blob, `${split.title.toLowerCase().replace(/\W+/g, '-')}-${who}.png`, split.title)
    setNotice(result === 'downloaded' ? 'Saved to your downloads.' : null)
  }

  const link = async () => {
    if (only === null) return
    const result = await shareLink(receiptUrl(onCreateLink(split, only)), split.title).catch(() => null)
    setNotice(result === 'copied' ? 'Link copied.' : result === null ? "Couldn't copy the link." : null)
  }

  const audience = [{ label: 'Everyone', value: null }, ...split.people.map((name, i) => ({ label: name, value: i }))]
  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="flex flex-wrap gap-2">
        {audience.map((a) => (
          <button
            key={a.label}
            type="button"
            aria-pressed={only === a.value}
            onClick={() => {
              setImage(null)
              setOnly(a.value)
            }}
            className={cn(
              'h-11 rounded-full px-4 text-base font-semibold',
              only === a.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {only !== null && (
        <p className="px-1 text-base text-muted-foreground">Only {split.people[only]}'s items and total are shown.</p>
      )}
      {error ? (
        <p className="text-base text-destructive">{error}</p>
      ) : image ? (
        <img src={image.url} alt={`Receipt for ${split.title}`} className="w-full rounded-2xl" />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-secondary text-base text-muted-foreground">Creating receipt…</div>
      )}
      {!qr && <p className="px-1 text-base text-muted-foreground">Add your payment QR in Settings to show it on the receipt.</p>}
      {notice && <p className="px-1 text-base text-muted-foreground">{notice}</p>}
      <PillButton disabled={!image} onClick={share}>
        {canShareImages() ? 'Share image' : 'Download'}
      </PillButton>
      {only !== null && (
        <PillButton variant="secondary" onClick={link}>
          {canShareLinks() ? 'Share link' : 'Copy link'}
        </PillButton>
      )}
    </div>
  )
}
