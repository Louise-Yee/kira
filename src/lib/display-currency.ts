import { createContext, useContext } from 'react'
import { HOME } from '@/lib/money'

/** The currency totals are shown in and new entries start in (`settings.displayCurrency`). RM until set. */
export const DisplayCurrency = createContext(HOME)

export const useDisplayCurrency = () => useContext(DisplayCurrency)
