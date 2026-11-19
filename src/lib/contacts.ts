import { Capacitor } from '@capacitor/core'
import { Contacts } from '@capacitor-community/contacts'

/** Reading contacts needs the Android app; the browser has no usable picker. */
export const contactsSupported = Capacitor.isNativePlatform()

/**
 * Every email in the phone's contacts, after asking permission. Null when permission is refused.
 * The contacts themselves never leave the phone: only these emails are looked up, one by one, in the directory.
 */
export async function readContactEmails(): Promise<string[] | null> {
  const { contacts } = await Contacts.checkPermissions()
  if (contacts !== 'granted' && (await Contacts.requestPermissions()).contacts !== 'granted') return null
  const { contacts: all } = await Contacts.getContacts({ projection: { emails: true } })
  return all.flatMap((c) => c.emails?.flatMap((e) => (e.address ? [e.address] : [])) ?? [])
}
