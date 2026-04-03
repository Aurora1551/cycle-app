import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import it from './locales/it'
import pt from './locales/pt'

export const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
] as const

export type LangCode = typeof LANGUAGES[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, es, fr, de, it, pt },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cycle_language',
      caches: ['localStorage'],
    },
  })

export default i18n
