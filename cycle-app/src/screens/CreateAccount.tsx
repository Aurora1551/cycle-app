import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'
import { track } from '../lib/posthog'
import type { OnboardingData } from '../types'

interface Props {
  onBack: () => void
  onSuccess: () => void
  onLogin: () => void
  vibeBg?: string
  vibeAccent?: string
  profileData?: OnboardingData
  dayNumber?: number
}

const CreateAccount: React.FC<Props> = ({ onBack, onSuccess, onLogin, vibeBg = '#1C0F0C', vibeAccent = '#C4614A', profileData, dayNumber }) => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const visible = useFadeIn()

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.45)' : '#9B7B74'
  const fieldBg = dark ? 'rgba(255,255,255,0.06)' : 'white'
  const fieldBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(196,97,74,0.2)'
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  const handleEmailSignUp = async () => {
    if (!email || !password) return
    if (password !== confirmPassword) {
      setError(t('createAccount.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('createAccount.passwordTooShort'))
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) setError('An account already exists for this email. Try logging in.')
        else setError(data.error || 'Unable to create account. Please try again.')
        setLoading(false)
        return
      }
      localStorage.setItem('cycle_account_email', email.trim().toLowerCase())
      localStorage.setItem('cycle_is_guest', '0')
      track('account_created')
      setLoading(false)
      onSuccess()
    } catch (err) {
      setError('Unable to connect. Please try again.')
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: vibeAccent }

  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibeAccent }}>{t('createAccount.saveJourney')}</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>{t('createAccount.heading')}</h1>
        <p className="subtext" style={{ color: mutedColor }}>{t('createAccount.subtext')}</p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>{t('createAccount.email')}</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('createAccount.emailPlaceholder')} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>{t('createAccount.password')}</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('createAccount.passwordPlaceholder')} style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>{t('createAccount.confirmPassword')}</div>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t('createAccount.confirmPasswordPlaceholder')} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleEmailSignUp()} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <div className="spacer" />
        <button onClick={handleEmailSignUp} disabled={loading || !email || !password || !confirmPassword}
          className="btn-primary" style={{ background: email && password && confirmPassword ? vibeAccent : `${vibeAccent}44` }}>
          {loading ? t('createAccount.creating') : t('createAccount.createButton')}
        </button>
        <div className="text-center" style={{ fontSize: 12, color: mutedColor, lineHeight: 1.8 }}>
          {t('createAccount.alreadyHaveAccount')}{' '}
          <button onClick={onLogin} className="btn-icon" style={{ color: vibeAccent, fontSize: 12, padding: 0, textDecoration: 'underline' }}>{t('createAccount.logIn')}</button>
        </div>
        <div className="text-center" style={{ fontSize: 11, color: mutedColor, lineHeight: 1.5 }}>{t('createAccount.legalText')}</div>
      </div>
    </ScreenShell>
  )
}

export default CreateAccount
