import React, { useState, useEffect } from 'react'

interface Props {
  onStartFree: () => void
  onSelectPlan: (plan: 'free' | 'one-cycle' | 'gift') => void
  name?: string
}

const A = '#C4614A', T = '#1C0F0C', M = '#9B7B74'

const Paywall: React.FC<Props> = ({ onStartFree, onSelectPlan }) => {
  const [selected, setSelected] = useState<'free' | 'one-cycle' | 'gift'>('one-cycle')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const planBtn = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.18s ease',
    boxShadow: active ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none', ...extra,
  })

  return (
    <div className="screen fade-in" style={{ background: '#FDF6F0', opacity: visible ? 1 : 0 }}>
      <div className="content" style={{ padding: '32px 24px 24px', gap: 12 }}>
        <div className="step-label" style={{ color: A }}>Unlock Cycle</div>
        <h1 className="heading-lg" style={{ color: T }}>Choose your<br />plan</h1>
        <p className="subtext" style={{ marginBottom: 4 }}>Less than a single injection supply</p>

        <button onClick={() => setSelected('free')} style={{ ...planBtn(selected === 'free'), background: 'transparent', border: `1.5px dashed ${selected === 'free' ? A : 'rgba(196,97,74,0.3)'}` }}>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T, fontFamily: "'Karla', sans-serif" }}>Try free</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: M }}>£0</div>
          </div>
          <div style={{ fontSize: 11, color: M }}>Days 1–3 · everything included · Spotify links · no card needed</div>
        </button>

        <button onClick={() => setSelected('one-cycle')} style={{ ...planBtn(selected === 'one-cycle', {
          background: selected === 'one-cycle' ? '#1C0F0C' : 'white',
          border: `2px solid ${selected === 'one-cycle' ? A : 'rgba(196,97,74,0.2)'}`,
          boxShadow: selected === 'one-cycle' ? '0 4px 20px rgba(196,97,74,0.25)' : 'none',
          position: 'relative',
        }) }}>
          <div className="mono-xs" style={{ position: 'absolute', top: -10, right: 14, background: A, color: 'white', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 9px', borderRadius: 20 }}>Best Value</div>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: selected === 'one-cycle' ? '#FDF6F0' : T, fontFamily: "'Karla', sans-serif" }}>One Cycle</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#E8A598' }}>£5.99</div>
          </div>
          <div style={{ fontSize: 11, color: selected === 'one-cycle' ? 'rgba(253,246,240,0.5)' : M }}>All days · all content · Spotify links · yours forever</div>
        </button>

        <button onClick={() => setSelected('gift')} style={{ ...planBtn(selected === 'gift'), background: selected === 'gift' ? 'rgba(196,97,74,0.04)' : 'white', border: `1.5px solid ${selected === 'gift' ? A : 'rgba(196,97,74,0.2)'}` }}>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T, fontFamily: "'Karla', sans-serif" }}>Gift a Cycle 🎁</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: A }}>£12.99</div>
          </div>
          <div style={{ fontSize: 11, color: M }}>Send to someone you love · personal message + WhatsApp share</div>
        </button>

        <div className="info-banner" style={{ background: 'rgba(196,97,74,0.05)', border: '1px solid rgba(196,97,74,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 14 }}>🎁</span>
          <span style={{ fontSize: 11, color: T, lineHeight: 1.4, fontFamily: "'Karla', sans-serif" }}>Know someone in treatment? Gift them strength.</span>
        </div>

        <div className="spacer" />
        <button onClick={() => { if (selected === 'free') onStartFree(); else onSelectPlan(selected) }} className="btn-primary" style={{ background: A }}>
          {selected === 'free' ? 'Start free →' : selected === 'gift' ? 'Gift a Cycle →' : 'Start my journey →'}
        </button>
        <div className="mono-xs text-center" style={{ color: M }}>3 days free always available · no card needed</div>
      </div>
    </div>
  )
}

export default Paywall
