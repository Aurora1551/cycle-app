import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/posthog'

interface Props {
  onBack: () => void
  onSuccess: () => void
  vibeBg?: string
  vibeAccent?: string
}

const CreateAccount: React.FC<Props> = ({ onBack, onSuccess, vibeBg = '#1C0F0C', vibeAccent = '#C4614A' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)

  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibeBg)
  const textColor = isDark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = isDark ? 'rgba(253,246,240,0.45)' : '#9B7B74'
  const fieldBg = isDark ? 'rgba(255,255,255,0.06)' : 'white'
  const fieldBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(196,97,74,0.2)'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleEmailSignUp = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      track('account_created')
      onSuccess()
    }
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const inputStyle = (val: string): React.CSSProperties => ({
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: "'Karla', sans-serif",
    fontSize: 15,
    color: textColor,
    caretColor: vibeAccent,
    paddingTop: val ? 0 : 4,
  })

  const fieldStyle: React.CSSProperties = {
    background: fieldBg,
    border: `1.5px solid ${fieldBorder}`,
    borderRadius: 12,
    padding: '12px 14px',
  }

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibeBg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: mutedColor, padding: '20px 24px 0', textAlign: 'left', display: 'block' }}>
        ← back
      </button>

      <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibeAccent }}>
          Save your journey
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
          Create an account
        </h1>
        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: mutedColor, lineHeight: 1.5 }}>
          Create an account so you never lose your progress.
        </p>

        <div style={fieldStyle}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle(email)} />
        </div>

        <div style={fieldStyle}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" style={inputStyle(password)} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#E8907A', fontFamily: "'Karla', sans-serif", background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor, letterSpacing: '0.1em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)' }} />
        </div>

        {(['Google', 'Apple'] as const).map(provider => (
          <button
            key={provider}
            onClick={provider === 'Google' ? handleGoogleSignIn : undefined}
            style={{ width: '100%', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'}`, borderRadius: 12, padding: '13px', fontFamily: "'Karla', sans-serif", fontSize: 14, fontWeight: 500, color: textColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 16 }}>{provider === 'Google' ? '🌐' : '🍎'}</span>
            Continue with {provider}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleEmailSignUp}
          disabled={loading || !email || !password}
          style={{ width: '100%', background: email && password ? vibeAccent : `${vibeAccent}44`, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, cursor: email && password ? 'pointer' : 'default', letterSpacing: '0.02em', transition: 'background 0.2s ease' }}
        >
          {loading ? 'Creating account...' : 'Create account and start →'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor, lineHeight: 1.8 }}>
          Already have an account?{' '}
          <button
            onClick={onSuccess}
            style={{ background: 'none', border: 'none', color: vibeAccent, fontSize: 11, cursor: 'pointer', fontFamily: "'Karla', sans-serif", padding: 0, textDecoration: 'underline' }}
          >
            Log in
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor, lineHeight: 1.5 }}>
          By continuing you agree to our privacy policy.<br />Your data is never shared or sold.
        </div>
      </div>
    </div>
  )
}

export default CreateAccount
