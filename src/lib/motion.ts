// Playful but restrained: springs with a small overshoot, never linear/sine.
export const pop = { type: 'spring', bounce: 0.35, duration: 0.5 } as const
export const soft = { type: 'spring', bounce: 0.2, duration: 0.4 } as const
export const press = { scale: 0.96 } as const
