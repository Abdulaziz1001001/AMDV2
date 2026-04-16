import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import en from '@/i18n/en'
import ar from '@/i18n/ar'

type Lang = 'en' | 'ar'

interface LangCtx {
  lang: Lang
  toggle: () => void
  t: (key: string) => string
}

const LangContext = createContext<LangCtx>({ lang: 'en', toggle: () => {}, t: (k) => k })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('amd_lang') as Lang) || 'en')

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    localStorage.setItem('amd_lang', lang)
  }, [lang])

  const toggle = () => setLang((l) => (l === 'en' ? 'ar' : 'en'))

  const t = useCallback(
    (key: string): string => {
      if (lang === 'ar') return (ar as Record<string, string>)[key] ?? key
      return (en as Record<string, string>)[key] ?? key
    },
    [lang],
  )

  return <LangContext.Provider value={{ lang, toggle, t }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
