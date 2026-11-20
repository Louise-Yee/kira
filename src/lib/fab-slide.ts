import { createContext } from 'react'

/** True while the page change involves a screen without a Fab (Settings, People): only then does the Fab slide. */
export const FabSlideContext = createContext(false)

/** True inside the tab that peeks in beside the current one during a swipe: it shows no Fab of its own. */
export const PeekContext = createContext(false)
