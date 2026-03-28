import React, { useState, useEffect } from 'react'

interface Props {
  onStartFree: () => void
  onSelectPlan: (plan: 'free' | 'one-cycle' | 'gift') => void
  name?: string
}

const Paywall: React.FC<Props> = ({ onStartFree, onSelectPlan, name }) => {
  const [selected, setSelected] = useState<'free' | 'one-cycle' | 'gift'>('one-cycle')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: 390, minHeight: '100svh', background: '#FDF6F0', display: 'flex', flexDirection: 'column', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <div style={{ padding: '32px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4614A' }}>
          Unlock Cycle
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: '#1C0F0C', lineHeight: 1.1 }}>
          Choose your<br />plan
        </h1>
        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: '#9B7B74', marginBottom: 4 }}>
          Less than a single injection supply
        </p>

        <button onClick={() => setSelected('free')} style={{ background: 'transparent', border: `1.5px dashed ${selected === 'free' ? '#C4614A' : 'rgba(196,97,74,0.3)'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.18s ease', boxShadow: selected === 'free' ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C0F0C', fontFamily: "'Karla', sans-serif" }}>Try free</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#9B7B74' }}>£0</div>
          </div>
          <div style={{ fontSize: 11, color: '#9B7B74' }}>Days 1–3 · everything included · Spotify links · no card needed</div>
        </button>

        <button onClick={() => setSelected('one-cycle')} style={{ background: selected === 'one-cycle' ? '#1C0F0C' : 'white', border: `2px solid ${selected === 'one-cycle' ? '#C4614A' : 'rgba(196,97,74,0.2)'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s ease', position: 'relative', boxShadow: selected === 'one-cycle' ? '0 4px 20px rgba(196,97,74,0.25)' : 'none' }}>
          {(selected === 'one-cycle' || true) && (
            <div style={{ position: 'absolute', top: -10, right: 14, background: '#C4614A', color: 'white', fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20 }}>
              Best Value
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: selected === 'one-cycle' ? '#FDF6F0' : '#1C0F0C', fontFamily: "'Karla', sans-serif" }}>One Cycle</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#E8A598' }}>£5.99</div>
          </div>
          <div style={{ fontSize: 11, color: selected === 'one-cycle' ? 'rgba(253,246,240,0.5)' : '#9B7B74' }}>All days · all content · Spotify links · yours forever</div>
        </button>

        <button onClick={() => setSelected('gift')} style={{ background: selected === 'gift' ? 'rgba(196,97,74,0.04)' : 'white', border: `1.5px solid ${selected === 'gift' ? '#C4614A' : 'rgba(196,97,74,0.2)'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.18s ease', boxShadow: selected === 'gift' ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C0F0C', fontFamily: "'Karla', sans-serif" }}>Gift a Cycle 🎁</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#C4614A' }}>£12.99</div>
          </div>
          <div style={{ fontSize: 11, color: '#9B7B74' }}>Send to someone you love · personal message + WhatsApp share</div>
        </button>

        <div style={{ background: 'rgba(196,97,74,0.05)', border: '1px solid rgba(196,97,74,0.12)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🎁</span>
          <span style={{ fontSize: 11, color: '#1C0F0C', lineHeight: 1.4, fontFamily: "'Karla', sans-serif" }}>Know someone in treatment? Gift them strength.</span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => {
            if (selected === 'free') onStartFree()
            else onSelectPlan(selected)
          }}
          style={{ width: '100%', background: '#C4614A', color: 'white', border: 'none', borderRadius: 14, padding: '16px', fontFamily: "'Karla', sans-serif", fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          {selected === 'free' ? 'Start free →' : selected === 'gift' ? 'Gift a Cycle →' : 'Start my journey →'}
        </button>

        <div style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#9B7B74', letterSpacing: '0.08em' }}>
          3 days free always available · no card needed
        </div>
      </div>
    </div>
  )
}

export default Paywall
