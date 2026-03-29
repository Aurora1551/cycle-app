import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'
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
  const visible = useFadeIn()

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.45)' : '#9B7B74'
  const fieldBg = dark ? 'rgba(255,255,255,0.06)' : 'white'
  const fieldBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(196,97,74,0.2)'
  const divider = dark ? 'rgba(255,255,255,0.08)' : 'rgba(196,97,74,0.12)'

  const handleEmailSignUp = async () => {
    if (!email || !password) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else { track('account_created'); onSuccess() }
  }

  const handleGoogleSignIn = async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }) }

  const fieldStyle: React.CSSProperties = { background: fieldBg, border: `1.5px solid ${fieldBorder}`, borderRadius: 12, padding: '12px 14px' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: "'Karla', sans-serif", fontSize: 15, color: textColor, caretColor: vibeAccent }

  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: vibeAccent }}>Save your journey</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>Create an account</h1>
        <p className="subtext" style={{ color: mutedColor }}>Create an account so you never lose your progress.</p>

        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <div className="field-label" style={{ color: mutedColor }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" style={inputStyle} />
        </div>

        {error && <div style={{ fontSize: 12, color: '#E8907A', background: 'rgba(232,144,122,0.1)', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}

        <div className="divider" style={{ margin: '4px 0' }}>
          <div className="divider-line" style={{ background: divider }} />
          <span className="mono-sm" style={{ color: mutedColor }}>or</span>
          <div className="divider-line" style={{ background: divider }} />
        </div>

        {(['Google', 'Apple'] as const).map(provider => (
          <button key={provider} onClick={provider === 'Google' ? handleGoogleSignIn : undefined} className="flex-center" style={{
            width: '100%', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'}`,
            borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 500, color: textColor, cursor: 'pointer', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>{provider === 'Google' ? '🌐' : '🍎'}</span> Continue with {provider}
          </button>
        ))}

        <div className="spacer" />
        <button onClick={handleEmailSignUp} disabled={loading || !email || !password}
          className="btn-primary" style={{ background: email && password ? vibeAccent : `${vibeAccent}44` }}>
          {loading ? 'Creating account...' : 'Create account and start →'}
        </button>
        <div className="text-center" style={{ fontSize: 11, color: mutedColor, lineHeight: 1.8 }}>
          Already have an account?{' '}
          <button onClick={onSuccess} className="btn-icon" style={{ color: vibeAccent, fontSize: 11, padding: 0, textDecoration: 'underline' }}>Log in</button>
        </div>
        <div className="text-center" style={{ fontSize: 11, color: mutedColor, lineHeight: 1.5 }}>By continuing you agree to our privacy policy.<br />Your data is never shared or sold.</div>
      </div>
    </ScreenShell>
  )
}

export default CreateAccount
