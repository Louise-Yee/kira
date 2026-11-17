export const navPositions = ['left', 'right', 'bottom'] as const
export type NavPos = (typeof navPositions)[number]
