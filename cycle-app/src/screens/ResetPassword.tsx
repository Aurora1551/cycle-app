import React, { useState } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell } from '../components/ui'
import { track } from '../lib/posthog'

interface Props {
  token: string
  onSuccess: () => void
  onBack: () => void
}

const ResetPassword: React.FC<Props> = ({ token, onSuccess, onBack }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const visible = useFadeIn()

  const bg = '#0E0E0E'
  const accent = '#C4614A'
  const textColor = '#FDF6F0'
  const mutedColor = 'rgba(253,246,240,0.45)'
  const fieldBg = 'rgba(255,255,255,0.06)'
  const fieldBorder = 'rgba(255,255,255,0.12)'

  const handleSubmit = async () => {
    if (!password || loading) return
    if (password !== confirmPassword) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Unable to reset password. The link may have expired.')
        setLoading(false)
        return
      }
      track('password_reset_completed')
      setDone(true)
      setLoading(false)
    } catch {
      setError('Unable to connect. Please try again.')
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: accent }

  if (done) return (
    <ScreenShell bg={bg} visible={visible}>
      <div className="content" style={{ gap: 14, justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: textColor, lineHeight: 1.15, margin: 0 }}>Password reset</h1>
        <p className="body-font" style={{ color: mutedColor, fontSize: 13, lineHeight: 1.6, padding: '0 12px' }}>
          You can now log in with your new password.
        </p>
        <div className="spacer" />
        <button onClick={onSuccess} className="btn-primary" style={{ background: accent }}>Log in</button>
      </div>
    </ScreenShell>
  )

  return (
    <ScreenShell bg={bg} visible={visible}>
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={onBack} className="body-font btn-bare" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13, fontWeight: 500, color: mutedColor }}>
          <span style={{ fontSize: 16 }}>‹</span> Cancel
        </button>
      </div>
      <div className="content" style={{ gap: 14 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: textColor, lineHeight: 1.15, margin: 0 }}>Set a new password</h1>
        <p className="subtext" style={{ color: mutedColor }}>Choose something at least 8 characters long.</p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>New password</div>
          <input
            type="password" value={password} autoFocus
            onChange={e => { setPassword(e.target.value); if (error) setError('') }}
            placeholder="At least 8 characters"
            style={inputStyle}
          />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Confirm password</div>
          <input
            type="password" value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); if (error) setError('') }}
            placeholder="Confirm new password"
            style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div className="spacer" />
        <button onClick={handleSubmit} disabled={loading || !password || !confirmPassword}
          className="btn-primary" style={{ background: (password && confirmPassword) ? accent : `${accent}44` }}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </div>
    </ScreenShell>
  )
}

export default ResetPassword
