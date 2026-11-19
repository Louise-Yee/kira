import { createContext } from 'react'

/** True while the page change involves a screen without a Fab (Settings, People): only then does the Fab slide. */
export const FabSlideContext = createContext(false)
