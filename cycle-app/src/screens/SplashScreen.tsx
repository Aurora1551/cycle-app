import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import LanguagePicker from '../components/LanguagePicker'
import { VIBE_CONTENT } from '../lib/constants'

interface SplashScreenProps {
  onBegin: () => void
  onHaveAccount: () => void
  onGift?: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onBegin, onHaveAccount, onGift }) => {
  const [visible, setVisible] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const currentLang = LANGUAGES.find(l => i18n.language === l.code || i18n.language?.startsWith(l.code)) || LANGUAGES[0]

  // Use saved vibe if available, otherwise default to fierce
  let savedVibe = 'fierce'
  try {
    const d = JSON.parse(localStorage.getItem('cycle_onboarding_data') || '{}')
    if (d.vibe) savedVibe = d.vibe
  } catch {}
  const vibeContent = VIBE_CONTENT[savedVibe] || VIBE_CONTENT.fierce

  return (
    <div className="screen" style={{
      background: '#0E0E0E', padding: '40px 32px 32px',
      opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease',
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      minHeight: '100svh',
    }}>
      {/* Language selector */}
      <button onClick={() => setLangOpen(true)} style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(253,246,240,0.5)', letterSpacing: '0.1em' }}>{currentLang.code.toUpperCase()}</span>
      </button>

      {/* Vibe tagline at top */}
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
        color: 'rgba(253,246,240,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase',
        marginTop: 48, marginBottom: 40,
      }}>
        {vibeContent.splash.tagline}
      </div>

      {/* Orb */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #E8A598, #C4614A)',
        boxShadow: '0 12px 36px rgba(196,97,74,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 24, animation: 'float 3s ease-in-out infinite',
      }}>
        🌸
      </div>

      {/* App name */}
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 700,
        color: '#FDF6F0', letterSpacing: '-0.5px', marginBottom: 8, lineHeight: 1,
      }}>
        {t('appName')}
      </h1>

      {/* Vibe subtitle */}
      <p style={{
        fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300,
        color: 'rgba(253,246,240,0.4)', letterSpacing: '0.02em', textAlign: 'center',
        lineHeight: 1.4,
      }}>
        {vibeContent.splash.subtitle}
      </p>

      {/* Spacer pushes buttons to bottom */}
      <div style={{ flex: 1 }} />

      {/* Begin button pinned to bottom */}
      <button onClick={onBegin} className="btn-primary" style={{ background: '#C4614A', marginBottom: 12, width: '100%' }}>
        {t('begin')}
      </button>

      <div className="mono-xs" style={{ color: '#333', margin: '4px 0' }}>{t('or')}</div>

      <button onClick={onHaveAccount} className="btn-ghost" style={{
        color: 'rgba(253,246,240,0.5)', border: '1px solid rgba(255,255,255,0.12)', width: '100%',
      }}>
        {t('haveAccount')}
      </button>

      {onGift && <>
        <div className="mono-xs" style={{ color: '#333', margin: '4px 0' }}>{t('or')}</div>
        <button onClick={onGift} className="btn-ghost" style={{
          color: 'rgba(253,246,240,0.5)', border: '1px solid rgba(255,255,255,0.12)', width: '100%',
        }}>
          {t('giftToSomeone', 'Gift it to someone')}
        </button>
      </>}

      <LanguagePicker open={langOpen} onClose={() => setLangOpen(false)} />
    </div>
  )
}

export default SplashScreen
