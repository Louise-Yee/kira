import { createContext } from 'react'

/** True while the page change involves Settings (the one screen without a Fab): only then does the Fab slide. */
export const FabSlideContext = createContext(false)
