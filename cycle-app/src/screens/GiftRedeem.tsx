import React, { useState } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'
import { track } from '../lib/posthog'

interface Props {
  giftCode: string
  senderName?: string
  message?: string
  onCreateAccount: () => void
  onLogin: () => void
}

const GiftRedeem: React.FC<Props> = ({ giftCode, senderName, message, onCreateAccount, onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'welcome' | 'register'>('welcome')
  const visible = useFadeIn()

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'
  const fieldBg = 'rgba(255,255,255,0.06)'
  const fieldBorder = 'rgba(255,255,255,0.12)'

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: accent }

  const handleRegister = () => {
    if (!email || !password) return
    if (password !== confirmPassword) { setError('Passwords don\'t match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    // MOCK: simulate registration success
    setTimeout(() => {
      localStorage.setItem('cycle_account_email', email)
      localStorage.setItem('cycle_is_guest', '0')
      localStorage.setItem('cycle_premium', '1')
      localStorage.setItem('cycle_plan', 'gift_redeemed')
      localStorage.setItem('cycle_gift_code', giftCode)
      track('gift_redeemed', { giftCode })
      track('account_created')
      setLoading(false)
      onCreateAccount()
    }, 600)
  }

  if (step === 'welcome') return (
    <ScreenShell bg={bg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 64 }}>🎁</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0, lineHeight: 1.1 }}>
        Someone gifted you<br />a Cycle
      </h1>
      {senderName && (
        <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, color: mutedColor, textAlign: 'center' }}>
          From <span style={{ color: accent }}>{senderName}</span>
        </div>
      )}
      {message && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '16px 18px', width: '100%',
        }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: textColor, lineHeight: 1.6, textAlign: 'center' }}>
            "{message}"
          </div>
        </div>
      )}
      <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6, fontSize: 13 }}>
        You've been given full access to Cycle — a daily companion through your fertility journey.
        Create an account to begin.
      </p>
      <button onClick={() => setStep('register')} className="btn-primary" style={{ background: accent, width: '100%' }}>
        Create your account
      </button>
      <div style={{ fontSize: 12, color: mutedColor, textAlign: 'center', lineHeight: 1.6 }}>
        Already have an account?{' '}
        <button onClick={onLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 12, padding: 0, textDecoration: 'underline', fontFamily: "'Karla', sans-serif" }}>Log in</button>
      </div>
    </ScreenShell>
  )

  return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={() => setStep('welcome')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 500, color: mutedColor }}>
          <span style={{ fontSize: 16 }}>‹</span> Back
        </button>
      </div>
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: accent }}>YOUR GIFT AWAITS</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>
          Create your account
        </h1>
        <p className="subtext" style={{ color: mutedColor }}>
          Your Cycle has been paid for — just set up your account.
        </p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Confirm password</div>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <div className="spacer" />
        <button onClick={handleRegister} disabled={loading || !email || !password || !confirmPassword}
          className="btn-primary" style={{ background: email && password && confirmPassword ? accent : `${accent}44` }}>
          {loading ? 'Creating...' : 'Start your journey'}
        </button>
        <div className="mono-xs text-center" style={{ color: mutedColor }}>No payment needed — this is a gift</div>
      </div>
    </ScreenShell>
  )
}

export default GiftRedeem
