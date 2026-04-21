import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onStartFree: () => void
  onSelectPlan: (plan: 'free' | 'one-cycle' | 'gift') => void
  onBack?: () => void
  name?: string
}

const A = '#C4614A', T = '#1C0F0C', M = '#9B7B74'

const Paywall: React.FC<Props> = ({ onStartFree, onSelectPlan, onBack }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<'free' | 'one-cycle' | 'gift'>('one-cycle')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  // Enter key advances with current selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { if (selected === 'free') onStartFree(); else onSelectPlan(selected) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, onStartFree, onSelectPlan])

  const planBtn = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.18s ease',
    boxShadow: active ? '0 0 0 3px rgba(196,97,74,0.1)' : 'none', ...extra,
  })

  return (
    <div className="screen fade-in" style={{ background: '#FDF6F0', opacity: visible ? 1 : 0 }}>
      <div className="content" style={{ padding: '32px 24px 24px', gap: 12 }}>
        {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 6px', minHeight: 44, fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 500, color: M }}><span style={{ fontSize: 16 }}>‹</span> Back</button>}
        <div className="step-label" style={{ color: A }}>{t('paywall.unlock')}</div>
        <h1 className="heading-lg" style={{ color: T }}>{t('paywall.choosePlan')}</h1>
        <p className="subtext" style={{ marginBottom: 4 }}>{t('paywall.subtext')}</p>

        <button onClick={() => setSelected('free')} style={{ ...planBtn(selected === 'free'), background: 'transparent', border: `1.5px dashed ${selected === 'free' ? A : 'rgba(196,97,74,0.3)'}` }}>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T, fontFamily: "'Karla', sans-serif" }}>{t('paywall.tryFree')}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: M }}>{t('paywall.tryFreePrice')}</div>
          </div>
          <div style={{ fontSize: 11, color: M }}>{t('paywall.tryFreeDetails')}</div>
        </button>

        <button onClick={() => setSelected('one-cycle')} style={{ ...planBtn(selected === 'one-cycle', {
          background: selected === 'one-cycle' ? '#1C0F0C' : 'white',
          border: `2px solid ${selected === 'one-cycle' ? A : 'rgba(196,97,74,0.2)'}`,
          boxShadow: selected === 'one-cycle' ? '0 4px 20px rgba(196,97,74,0.25)' : 'none',
          position: 'relative',
        }) }}>
          <div className="mono-xs" style={{ position: 'absolute', top: -10, right: 14, background: A, color: 'white', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 9px', borderRadius: 20 }}>{t('paywall.bestValue')}</div>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: selected === 'one-cycle' ? '#FDF6F0' : T, fontFamily: "'Karla', sans-serif" }}>{t('paywall.oneCycle')}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#E8A598' }}>{t('paywall.oneCyclePrice')}</div>
          </div>
          <div style={{ fontSize: 11, color: selected === 'one-cycle' ? 'rgba(253,246,240,0.5)' : M }}>{t('paywall.oneCycleDetails')}</div>
        </button>

        <button onClick={() => setSelected('gift')} style={{ ...planBtn(selected === 'gift'), background: selected === 'gift' ? 'rgba(196,97,74,0.04)' : 'white', border: `1.5px solid ${selected === 'gift' ? A : 'rgba(196,97,74,0.2)'}` }}>
          <div className="flex-between" style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T, fontFamily: "'Karla', sans-serif" }}>{t('paywall.giftCycle')}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: A }}>{t('paywall.giftPrice')}</div>
          </div>
          <div style={{ fontSize: 11, color: M }}>{t('paywall.giftDetails')}</div>
        </button>

        {/* What you'll get */}
        <div style={{ background: 'rgba(196,97,74,0.04)', border: `1px solid rgba(196,97,74,0.1)`, borderRadius: 14, padding: '14px 16px', marginTop: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: A, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>What you'll get every day</div>
          {[
            { emoji: '&#128172;', text: 'Personalised daily quote' },
            { emoji: '&#127925;', text: 'Curated music for your mood' },
            { emoji: '&#9998;', text: 'Guided journaling prompts' },
            { emoji: '&#10024;', text: '35-second breathing exercise' },
            { emoji: '&#9889;', text: 'Daily affirmation' },
            { emoji: '&#128155;', text: 'A note just for you' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: f.emoji }} />
              <span style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, color: T }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="spacer" />
        <button onClick={() => { if (selected === 'free') onStartFree(); else onSelectPlan(selected) }} className="btn-primary" style={{ background: A }}>
          {selected === 'free' ? t('paywall.startFree') : selected === 'gift' ? t('paywall.giftButton') : t('paywall.startJourney')}
        </button>
        <div className="mono-xs text-center" style={{ color: M }}>{t('paywall.freeDaysHint')}</div>
      </div>
    </div>
  )
}

export default Paywall
