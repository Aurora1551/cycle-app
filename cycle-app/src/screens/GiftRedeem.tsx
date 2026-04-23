import React, { useState, useEffect } from 'react'
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
  const [giftValid, setGiftValid] = useState<null | boolean>(null)
  const [giftInfo, setGiftInfo] = useState<{ buyerEmail?: string; recipientName?: string; message?: string; redeemed?: boolean }>({})
  const visible = useFadeIn()

  // Validate gift code server-side on mount
  useEffect(() => {
    if (!giftCode) { setGiftValid(false); return }
    fetch(`/api/gift/lookup/${encodeURIComponent(giftCode)}`)
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.valid) { setGiftValid(false); return }
        setGiftValid(true)
        setGiftInfo({ buyerEmail: data.buyerEmail, recipientName: data.recipientName, message: data.message, redeemed: data.redeemed })
      })
      .catch(() => setGiftValid(false))
  }, [giftCode])

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'
  const fieldBg = 'rgba(255,255,255,0.06)'
  const fieldBorder = 'rgba(255,255,255,0.12)'

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: accent }

  const handleRegister = async () => {
    if (!email || !password) return
    if (password !== confirmPassword) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      // 1. Create account
      const regRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) {
        if (regRes.status === 409) setError('An account already exists for this email. Log in first, then redeem.')
        else setError(regData.error || 'Could not create account. Please try again.')
        setLoading(false)
        return
      }
      // 2. Redeem the gift against this account
      const redeemRes = await fetch('/api/gift/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCode, email: email.trim().toLowerCase() }),
      })
      const redeemData = await redeemRes.json()
      if (!redeemRes.ok) {
        setError(redeemData.error || 'Gift could not be redeemed, but your account was created. Try logging in.')
        setLoading(false)
        return
      }
      // 3. Mark premium + account state
      localStorage.setItem('cycle_account_email', email.trim().toLowerCase())
      localStorage.setItem('cycle_is_guest', '0')
      localStorage.setItem('cycle_premium', '1')
      localStorage.setItem('cycle_plan', 'gift_redeemed')
      localStorage.setItem('cycle_gift_code', giftCode)
      track('gift_redeemed', { giftCode })
      track('account_created')
      setLoading(false)
      onCreateAccount()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  // Invalid / unknown gift code
  if (giftValid === false) return (
    <ScreenShell bg={bg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0, lineHeight: 1.2 }}>Gift not found</h1>
      <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6, fontSize: 13 }}>This gift link is invalid or has already been used. Ask the sender to check the link, or sign up as a regular user.</p>
      <button onClick={onLogin} className="btn-primary" style={{ background: accent, width: '100%' }}>Go to log in</button>
    </ScreenShell>
  )

  // Still loading the validation
  if (giftValid === null) return (
    <ScreenShell bg={bg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: mutedColor, fontStyle: 'italic' }}>Checking your gift…</div>
    </ScreenShell>
  )

  // Already redeemed — can't redeem twice
  if (giftInfo.redeemed) return (
    <ScreenShell bg={bg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 48 }}>✓</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0, lineHeight: 1.2 }}>This gift is already redeemed</h1>
      <p className="subtext text-center" style={{ color: mutedColor, lineHeight: 1.6, fontSize: 13 }}>If that was you, log in to continue your journey. Otherwise, contact <span style={{ color: accent }}>{giftInfo.buyerEmail}</span>.</p>
      <button onClick={onLogin} className="btn-primary" style={{ background: accent, width: '100%' }}>Log in</button>
    </ScreenShell>
  )

  if (step === 'welcome') return (
    <ScreenShell bg={bg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 64 }}>🎁</div>
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0, lineHeight: 1.1 }}>
        Someone gifted you<br />a Cycle
      </h1>
      {senderName && (
        <div className="body-font" style={{fontSize: 14, color: mutedColor, textAlign: 'center' }}>
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
        <button onClick={onLogin} className="body-font btn-bare" style={{ color: accent, fontSize: 12, padding: 0, textDecoration: 'underline' }}>Log in</button>
      </div>
    </ScreenShell>
  )

  return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={() => setStep('welcome')} className="body-font btn-bare" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
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
