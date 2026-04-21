import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'
import { track } from '../lib/posthog'
import type { OnboardingData } from '../types'

interface Props {
  onBack: () => void
  onSuccess: (profile: OnboardingData, dayNumber: number) => void
  onSignUp: () => void
}

const LoginScreen: React.FC<Props> = ({ onBack, onSuccess, onSignUp }) => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const visible = useFadeIn()

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'
  const fieldBg = 'rgba(255,255,255,0.06)'
  const fieldBorder = 'rgba(255,255,255,0.12)'

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    // MOCK LOGIN: skip API, restore profile from localStorage
    setTimeout(() => {
      localStorage.setItem('cycle_account_email', email)
      localStorage.setItem('cycle_is_guest', '0')
      track('login_success')

      const saved = localStorage.getItem('cycle_onboarding_data')
      if (saved) {
        const parsed = JSON.parse(saved)
        const profile: OnboardingData = {
          name: parsed.name,
          treatment: parsed.treatment,
          cycleDays: parsed.cycleDays,
          components: parsed.components,
          vibe: parsed.vibe,
          genres: parsed.genres,
        }
        const currentDay = parseInt(localStorage.getItem('cycle_current_day') || '1', 10)
        onSuccess(profile, currentDay)
      } else {
        // No profile found — go to onboarding
        onSignUp()
      }
      setLoading(false)
    }, 600)
  }

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: accent }

  return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={onBack} className="body-font" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
          <span style={{ fontSize: 16 }}>‹</span> {t('back').replace('← ', '')}
        </button>
      </div>
      <div className="content" style={{ gap: 14 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>{t('login.heading')}</h1>
        <p className="subtext" style={{ color: mutedColor }}>{t('login.subtext')}</p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>{t('login.email')}</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>{t('login.password')}</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('login.passwordPlaceholder')}
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <div className="spacer" />
        <button onClick={handleLogin} disabled={loading || !email || !password}
          className="btn-primary" style={{ background: email && password ? accent : `${accent}44` }}>
          {loading ? t('login.loggingIn') : t('login.button')}
        </button>
        <div className="text-center" style={{ fontSize: 12, color: mutedColor, lineHeight: 1.8 }}>
          {t('login.noAccount')}{' '}
          <button onClick={onSignUp} className="body-font" style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 12, padding: 0, textDecoration: 'underline' }}>{t('login.signUp')}</button>
        </div>
      </div>
    </ScreenShell>
  )
}

export default LoginScreen
