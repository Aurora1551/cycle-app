import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent'>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const visible = useFadeIn()

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'
  const fieldBg = 'rgba(255,255,255,0.06)'
  const fieldBorder = 'rgba(255,255,255,0.12)'

  const handleLogin = async () => {
    if (!email || !password || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.locked) {
          setLocked(true)
          setError(data.error || 'Too many attempts. Try resetting your password.')
        } else {
          setAttemptsLeft(typeof data.attemptsRemaining === 'number' ? data.attemptsRemaining : null)
          setError(data.error || 'Invalid email or password')
        }
        track('login_failed', { locked: !!data.locked })
        setLoading(false)
        return
      }
      track('login_success')
      localStorage.setItem('cycle_account_email', email.trim().toLowerCase())
      localStorage.setItem('cycle_is_guest', '0')
      const profile = data.profile || (() => {
        try { return JSON.parse(localStorage.getItem('cycle_onboarding_data') || 'null') } catch { return null }
      })()
      if (profile && profile.name && profile.vibe) {
        const currentDay = parseInt(localStorage.getItem('cycle_current_day') || '1', 10)
        onSuccess(profile as OnboardingData, currentDay)
      } else {
        // No profile yet — continue to onboarding
        onSignUp()
      }
    } catch (err) {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!forgotEmail || forgotLoading) return
    setForgotLoading(true)
    try {
      await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      })
      setMode('forgot-sent')
      track('forgot_password_requested')
    } catch {
      // Even on error, show the generic "sent" state so we don't leak existence of emails
      setMode('forgot-sent')
    } finally {
      setForgotLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: accent }

  // Forgot-password sent confirmation
  if (mode === 'forgot-sent') return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={() => { setMode('login'); setForgotEmail(''); setError('') }} className="body-font btn-bare" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
          <span style={{ fontSize: 16 }}>‹</span> Back to log in
        </button>
      </div>
      <div className="content" style={{ gap: 14, justifyContent: 'center' }}>
        <div style={{ fontSize: 48, textAlign: 'center' }}>📬</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: textColor, lineHeight: 1.15, margin: 0, textAlign: 'center' }}>Check your email</h1>
        <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6 }}>
          If an account exists for <span style={{ color: accent }}>{forgotEmail}</span>, we've sent a link to reset your password.
        </p>
        <p className="subtext text-center" style={{ color: mutedColor, fontSize: 12 }}>
          The link expires in 30 minutes. Don't forget to check your spam folder.
        </p>
      </div>
    </ScreenShell>
  )

  // Forgot-password form
  if (mode === 'forgot') return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={() => { setMode('login'); setError('') }} className="body-font btn-bare" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
          <span style={{ fontSize: 16 }}>‹</span> Back to log in
        </button>
      </div>
      <div className="content" style={{ gap: 14 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: textColor, lineHeight: 1.15, margin: 0 }}>Forgot your password?</h1>
        <p className="subtext" style={{ color: mutedColor }}>Enter your email and we'll send you a reset link.</p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Email</div>
          <input
            type="email"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleForgot()}
          />
        </div>

        <div className="spacer" />
        <button onClick={handleForgot} disabled={forgotLoading || !forgotEmail} className="btn-primary" style={{ background: forgotEmail ? accent : `${accent}44` }}>
          {forgotLoading ? 'Sending...' : 'Send reset link'}
        </button>
        <div className="text-center" style={{ fontSize: 12, color: mutedColor, lineHeight: 1.8 }}>
          Don't have an account?{' '}
          <button onClick={onSignUp} className="body-font btn-bare" style={{ color: accent, fontSize: 12, padding: 0, textDecoration: 'underline' }}>Create one</button>
        </div>
      </div>
    </ScreenShell>
  )

  // Login form (default)
  return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={onBack} className="body-font btn-bare" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
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
            onChange={e => { setEmail(e.target.value); if (error) setError('') }}
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
            onChange={e => { setPassword(e.target.value); if (error) setError('') }}
            placeholder={t('login.passwordPlaceholder')}
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            {error}
            {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft <= 3 && !locked && (
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining before your account is temporarily locked.
              </div>
            )}
          </div>
        )}

        <div className="text-center" style={{ fontSize: 12 }}>
          <button onClick={() => { setForgotEmail(email); setMode('forgot'); setError('') }} className="body-font btn-bare" style={{ color: locked ? accent : mutedColor, fontSize: 12, padding: 0, textDecoration: 'underline', fontWeight: locked ? 600 : 400 }}>
            Forgot your password?
          </button>
        </div>

        <div className="spacer" />
        <button onClick={handleLogin} disabled={loading || locked || !email || !password}
          className="btn-primary" style={{ background: (email && password && !locked) ? accent : `${accent}44` }}>
          {loading ? t('login.loggingIn') : t('login.button')}
        </button>
        <div className="text-center" style={{ fontSize: 12, color: mutedColor, lineHeight: 1.8 }}>
          {t('login.noAccount')}{' '}
          <button onClick={onSignUp} className="body-font btn-bare" style={{ color: accent, fontSize: 12, padding: 0, textDecoration: 'underline' }}>{t('login.signUp')}</button>
        </div>
      </div>
    </ScreenShell>
  )
}

export default LoginScreen
