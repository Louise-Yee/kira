/** Category for an id; a missing one (deleted, never imported) falls back to the default "Other" of that kind. */
export function categoryOrOther<T>(byId: ReadonlyMap<string, T>, id: string, kind: 'expense' | 'income'): T | undefined {
  return byId.get(id) ?? byId.get(kind === 'income' ? 'other-income' : 'other')
}
