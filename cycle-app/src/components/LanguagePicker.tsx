import React from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import { track } from '../lib/posthog'

interface Props {
  open: boolean
  onClose: () => void
  accent?: string
  bg?: string
  isDark?: boolean
}

const LanguagePicker: React.FC<Props> = ({ open, onClose, accent = '#C4614A', bg = '#0E0E0E', isDark = true }) => {
  const { i18n, t } = useTranslation()

  if (!open) return null

  const textColor = isDark ? '#FDF6F0' : '#1a1a1a'
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : 'rgba(0,0,0,0.4)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : `${accent}20`

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('cycle_language', code)
    track('language_selected', { language: code })
    onClose()
  }

  return (
    <div className="modal-overlay modal-overlay-dark modal-center" style={{ zIndex: 200 }}>
      <div style={{ width: '100%', maxWidth: 320, background: bg, borderRadius: 20, padding: '24px 20px', border: `1px solid ${cardBorder}` }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: textColor, textAlign: 'center', marginBottom: 16 }}>
          {t('languagePicker.title')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {LANGUAGES.map(lang => {
            const isActive = i18n.language === lang.code || i18n.language?.startsWith(lang.code)
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isActive ? `${accent}18` : 'transparent',
                  border: `1.5px solid ${isActive ? accent : cardBorder}`,
                  borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, fontWeight: isActive ? 600 : 400, color: textColor }}>{lang.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: mutedColor, marginLeft: 8 }}>{lang.code.toUpperCase()}</span>
                </div>
                {isActive && <span style={{ fontSize: 14, color: accent }}>✓</span>}
              </button>
            )
          })}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, background: `${accent}20`, border: `1px solid ${accent}40`, borderRadius: 14, padding: '12px', fontSize: 14, fontFamily: "'Karla', sans-serif", color: accent, cursor: 'pointer' }}>
          {t('close')}
        </button>
      </div>
    </div>
  )
}

export default LanguagePicker
