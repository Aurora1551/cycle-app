import React, { useState, useEffect } from 'react'

interface Props {
  onBack: () => void
  vibeAccent?: string
  vibeBg?: string
}

const GiftFlow: React.FC<Props> = ({ onBack, vibeAccent = '#C4614A', vibeBg = '#FDF6F0' }) => {
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [step, setStep] = useState<'compose' | 'confirm' | 'sent'>('compose')
  const [visible, setVisible] = useState(false)

  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(vibeBg)
  const textColor = isDark ? '#FDF6F0' : '#1C0F0C'
  const mutedColor = isDark ? 'rgba(253,246,240,0.4)' : '#9B7B74'
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(196,97,74,0.15)'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const defaultMessage = `Hey${recipientName ? ` ${recipientName}` : ''},\n\nI wanted to give you something that helped me through my fertility journey — a little daily companion called Cycle.\n\nIt has daily quotes, meditations, a journal, music playlists and affirmations — all personalised for where you are in your treatment.\n\nYou don't have to go through this alone. 💛\n\nWith so much love ♡`

  const whatsappText = `${defaultMessage}${message ? `\n\nMy personal note to you:\n${message}` : ''}\n\n→ Find Cycle at: cycle.app`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

  const inputStyle: React.CSSProperties = {
    width: '100%', background: cardBg, border: `1.5px solid ${cardBorder}`,
    borderRadius: 12, padding: '12px 14px', fontFamily: "'Karla', sans-serif",
    fontSize: 14, color: textColor, outline: 'none', caretColor: vibeAccent,
    boxSizing: 'border-box',
  }

  if (step === 'sent') return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibeBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28, opacity: visible ? 1 : 0, transition: 'opacity 0.4s' }}>
      <div style={{ fontSize: 60 }}>🎁</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, textAlign: 'center' }}>
        Gift sent with love
      </h2>
      <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 14, color: mutedColor, textAlign: 'center', lineHeight: 1.6 }}>
        You just gave someone strength they didn't know they needed.
      </p>
      <button onClick={onBack} style={{ background: vibeAccent, color: 'white', border: 'none', borderRadius: 14, padding: '16px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Karla', sans-serif" }}>
        Back to my day
      </button>
    </div>
  )

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: vibeBg, display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: mutedColor, padding: '20px 24px 0', textAlign: 'left' }}>
        ← back
      </button>

      <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: vibeAccent }}>
          Gift a Cycle
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: textColor, lineHeight: 1.1 }}>
          Send someone strength
        </h1>

        <div style={{ background: `${vibeAccent}10`, border: `1px solid ${vibeAccent}25`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: textColor, lineHeight: 1.5 }}>
            Know someone in fertility treatment? Gift them a full cycle of Cycle — personalised daily content, meditations, music & more.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor }}>Their name (optional)</div>
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor }}>Add a personal message (optional)</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write something from the heart..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '14px' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: mutedColor, marginBottom: 8 }}>
            Preview message
          </div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 12, color: textColor, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {defaultMessage.slice(0, 200)}...
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => setStep('sent'), 1000)} style={{ display: 'block', width: '100%', background: '#25D366', color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', letterSpacing: '0.02em' }}>
          Send via WhatsApp 💚
        </a>

        <div style={{ textAlign: 'center', fontSize: 11, color: mutedColor }}>
          Gift price: £12.99 · the most meaningful £12.99 you'll spend
        </div>
      </div>
    </div>
  )
}

export default GiftFlow
