import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { VibeKey } from '../types'
import { VIBES } from '../types'

interface Props {
  onBack: () => void
  onContinue: (vibe: VibeKey) => void
  initialValue?: VibeKey | null
  onPreview: (vibe: VibeKey | null) => void
}

const OnboardingVibe: React.FC<Props> = ({ onBack, onContinue, initialValue, onPreview }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<VibeKey | null>(initialValue || null)
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const activeVibe = selected ? VIBES.find(v => v.key === selected) : null
  const accent = activeVibe?.accent || '#C4614A'
  const text = activeVibe?.text || '#1C0F0C'
  const muted = activeVibe?.muted || '#9B7B74'
  const bg = activeVibe?.bg || '#FDF6F0'
  const progress = (5 / 6) * 100

  const handleSelect = (key: VibeKey) => { setSelected(key); onPreview(key); setTimeout(() => onContinue(key), 400) }

  return (
    <div className="screen" style={{
      opacity: visible ? 1 : 0, background: bg,
      transition: 'background 0.5s ease, opacity 0.4s ease',
    }}>
      <div className="progress-track" style={{ background: `${accent}22`, transition: 'background 0.5s ease' }}>
        <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}bb)`, transition: 'width 0.5s ease, background 0.5s ease' }} />
      </div>

      <button onClick={onBack} className="btn-back" style={{ color: muted, transition: 'color 0.5s ease' }}>{t('back')}</button>

      <div className="content-sm">
        <div className="step-label" style={{ color: accent, transition: 'color 0.5s ease' }}>{t('stepOf', { step: 5 })}</div>
        <h1 className="heading" style={{ color: text, transition: 'color 0.5s ease' }}>{t('onboardingVibe.heading')}</h1>
        <p className="subtext" style={{ color: muted, transition: 'color 0.5s ease' }}>{t('onboardingVibe.subtext')}</p>

        <div className="grid-2">
          {VIBES.map(v => {
            const sel = selected === v.key
            return (
              <button key={v.key} onClick={() => handleSelect(v.key)} className="sel-btn-lg" style={{
                flexDirection: 'column', display: 'flex',
                background: sel ? `${accent}18` : `${accent}08`,
                border: sel ? `2px solid ${accent}` : `1.5px solid ${accent}25`,
                borderRadius: 14, padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.25s ease', boxShadow: sel ? `0 0 0 3px ${accent}33` : 'none',
                position: 'relative',
              }}
              >
                {sel && <div className="check-circle" style={{ position: 'absolute', top: 8, right: 10, width: 16, height: 16, background: accent, fontSize: 9 }}>✓</div>}
                <div style={{ fontSize: 26, marginBottom: 6 }}>{v.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Karla', sans-serif", color: text, marginBottom: 3, transition: 'color 0.25s ease' }}>{t(`vibes.${v.key}`)}</div>
                <div style={{ fontSize: 10, color: muted, lineHeight: 1.3, transition: 'color 0.25s ease' }}>{t(`vibeTaglines.${v.key}`)}</div>
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="info-banner" style={{ background: `${accent}11`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.4s ease' }}>
            <span style={{ fontSize: 20 }}>{activeVibe?.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily: "'Karla', sans-serif" }}>{t(`vibes.${selected}`)} {t('onboardingVibe.vibeSelected')}</div>
              <div style={{ fontSize: 11, color: muted }}>{t(`vibeTaglines.${selected}`)}</div>
            </div>
          </div>
        )}

        <div className="spacer" />
        <button onClick={() => selected && onContinue(selected)} disabled={!selected}
          className="btn-primary" style={{ background: selected ? accent : `${accent}44`, transition: 'background 0.4s ease' }}>
          {t('continue')}
        </button>
        <button onClick={() => onContinue('calm')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Karla', sans-serif", fontSize: 12, color: 'rgba(253,246,240,0.35)', padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default OnboardingVibe
