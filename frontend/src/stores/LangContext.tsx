import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import en from '@/i18n/en'
type Lang = 'en'

interface LangCtx {
  lang: Lang
  toggle: () => void
  t: (key: string) => string
}

const LangContext = createContext<LangCtx>({ lang: 'en', toggle: () => {}, t: (k) => k })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang] = useState<Lang>('en')

  useEffect(() => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
  }, [lang])

  const toggle = () => {}

  const t = useCallback(
    (key: string): string => {
      return (en as Record<string, string>)[key] ?? key
    },
    [],
  )

  return <LangContext.Provider value={{ lang, toggle, t }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
