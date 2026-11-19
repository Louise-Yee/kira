/**
 * An email as a directory key: trimmed and lowercased. Null if it can't be one
 * (no "@", or a "/", which Firestore doesn't allow in a document id).
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase()
  return e && e.includes('@') && !e.includes('/') ? e : null
}
