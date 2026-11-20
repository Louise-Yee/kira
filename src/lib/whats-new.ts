import { useEffect, useState } from 'react'
import { newEntries } from '@/lib/changelog'
import { APP_VERSION } from '@/lib/update'

// Per device, not per account: each device updates on its own, and it costs no reads.
const SEEN_KEY = 'kira.lastSeenVersion'

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION)
  } catch {
    // storage blocked: it just shows again next launch
  }
}

/** "What's new" once after an update: what this device hasn't seen yet. Closing it marks this version as seen. */
export function useWhatsNew() {
  const [entries] = useState(() => newEntries(readSeen(), APP_VERSION))
  const [closed, setClosed] = useState(false)
  // A fresh install has nothing new to show, but starts counting from here.
  useEffect(() => {
    if (readSeen() === null) writeSeen()
  }, [])
  const close = () => {
    writeSeen()
    setClosed(true)
  }
  return { entries, open: entries.length > 0 && !closed, close }
}
