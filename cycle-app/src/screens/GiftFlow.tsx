import React, { useState } from 'react'
import { isDarkBg } from '../lib/theme'
import { useFadeIn } from '../hooks/useFadeIn'
import { ScreenShell, BackButton } from '../components/ui'

interface Props {
  onBack: () => void
  vibeAccent?: string
  vibeBg?: string
}

type Step = 'compose' | 'payment' | 'success'

const GiftFlow: React.FC<Props> = ({ onBack, vibeAccent = '#C4614A', vibeBg = '#FDF6F0' }) => {
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<Step>('compose')
  const [copied, setCopied] = useState(false)
  const visible = useFadeIn()

  const dark = isDarkBg(vibeBg)
  const textColor = dark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = dark ? 'rgba(253,246,240,0.4)' : '#9B7B74'
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'
  const cardBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'

  const giftLink = 'https://cycle.app/gift/abc123'
  const whatsappText = `Hey${recipientName ? ` ${recipientName}` : ''},\n\nI wanted to give you something that helped me through my fertility journey — a daily companion called Cycle.${message ? `\n\nFrom me to you:\n${message}` : ''}\n\n→ Start here: ${giftLink}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1.5px solid ${cardBorder}`,
    borderRadius: 12, padding: '12px 14px', fontFamily: "'Karla', sans-serif",
    fontSize: 14, color: textColor, outline: 'none', caretColor: vibeAccent, boxSizing: 'border-box',
  }

  if (step === 'success') return (
    <ScreenShell bg={vibeBg} visible={visible} style={{ alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28 }}>
      <div style={{ fontSize: 64 }}>🎁</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: textColor, textAlign: 'center', margin: 0 }}>Gift sent with love</h2>
      <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, color: mutedColor, textAlign: 'center', lineHeight: 1.6 }}>You just gave someone strength they didn't know they needed.</p>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', borderRadius: 14, padding: '18px', fontSize: 16, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>Send via WhatsApp 💚</a>
      <button onClick={() => { navigator.clipboard.writeText(giftLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ width: '100%', background: 'transparent', color: copied ? vibeAccent : mutedColor, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '14px', fontSize: 14, cursor: 'pointer' }}>{copied ? '✓ Link copied!' : 'Copy gift link'}</button>
      <button onClick={onBack} style={{ background: 'none', border: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, color: mutedColor, cursor: 'pointer' }}>Back to my day</button>
    </ScreenShell>
  )

  if (step === 'payment') return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={() => setStep('compose')} color={mutedColor} />
      <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibeAccent }}>Payment</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>Gift a Cycle <span style={{ color: vibeAccent }}>· £12.99</span></h1>
        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, color: mutedColor, lineHeight: 1.5 }}>{recipientName ? `For ${recipientName} — ` : ''}Full access to all days, personalised content, and Spotify links.</p>
        <button onClick={() => setStep('success')} style={{ width: '100%', background: '#000', color: 'white', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>🍎</span> Pay with Apple Pay</button>
        <button onClick={() => setStep('success')} style={{ width: '100%', background: 'white', color: '#1a73e8', border: '2px solid #dadce0', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ fontSize: 18 }}>G</span> Pay with Google Pay</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: cardBorder }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: mutedColor }}>or pay by card</span>
          <div style={{ flex: 1, height: 1, background: cardBorder }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Card number</div>
            <input type="text" placeholder="1234 5678 9012 3456" style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Expiry</div>
              <input type="text" placeholder="MM / YY" style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
            </div>
            <div style={{ flex: 1, background: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>CVC</div>
              <input type="text" placeholder="123" style={{ ...inputStyle, border: 'none', padding: 0, background: 'transparent' }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setStep('success')} style={{ width: '100%', background: vibeAccent, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Pay £12.99 →</button>
        <div style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 8, color: mutedColor }}>Secure · encrypted · GDPR compliant</div>
      </div>
    </ScreenShell>
  )

  return (
    <ScreenShell bg={vibeBg} visible={visible}>
      <BackButton onClick={onBack} color={mutedColor} />
      <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibeAccent }}>Gift a Cycle</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1, margin: 0 }}>Send someone strength</h1>
        <div style={{ background: `${vibeAccent}10`, border: `1px solid ${vibeAccent}25`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: textColor, lineHeight: 1.5 }}>Know someone in fertility treatment? Gift them a full cycle of Cycle — personalised daily content, meditations, music & more.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor }}>Their name (optional)</div>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor }}>Personal message (optional)</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write something from the heart..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '14px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor, marginBottom: 8 }}>Preview message</div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 12, color: textColor, lineHeight: 1.6, whiteSpace: 'pre-line' }}>Hey{recipientName ? ` ${recipientName}` : ''},{'\n\n'}I wanted to give you something special — a daily companion called Cycle...</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setStep('payment')} style={{ width: '100%', background: vibeAccent, color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Continue to payment · £12.99 →</button>
        <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor }}>The most meaningful £12.99 you'll spend</div>
      </div>
    </ScreenShell>
  )
}

export default GiftFlow
