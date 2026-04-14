import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { VibeKey } from '../types'
import { VIBES } from '../types'
import { BackButton } from '../components/ui'

interface Props {
  onBack: () => void
  onContinue: (vibe: VibeKey, components: string[]) => void
  initialVibe?: VibeKey | null
  initialComponents?: string[]
  onPreview: (vibe: VibeKey | null) => void
}

const ALL_COMPONENTS = [
  { id: 'quote', emoji: '💬', label: 'Quote' },
  { id: 'anthem', emoji: '🎵', label: 'Song' },
  { id: 'affirmation', emoji: '🌟', label: 'Affirmation' },
  { id: 'journal', emoji: '✍️', label: 'Journal' },
  { id: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { id: 'meditation', emoji: '🧘', label: 'Breathing' },
  { id: 'fuel', emoji: '🍳', label: 'Your Fuel' },
]

const OnboardingStep2: React.FC<Props> = ({ onBack, onContinue, initialVibe, initialComponents, onPreview }) => {
  const { t } = useTranslation()
  const [vibe, setVibe] = useState<VibeKey | null>(initialVibe || null)
  const [components, setComponents] = useState<string[]>(initialComponents || ALL_COMPONENTS.map(c => c.id))
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const activeVibe = vibe ? VIBES.find(v => v.key === vibe) : null
  const accent = activeVibe?.accent || '#C4614A'
  const bg = activeVibe?.bg || '#FDF6F0'
  const text = activeVibe?.text || '#1C0F0C'
  const muted = activeVibe?.muted || '#9B7B74'
  const isDark = ['#1C0F0C', '#0D1F2D', '#120A2A'].includes(bg)

  const handleSelect = (key: VibeKey) => { setVibe(key); onPreview(key) }
  const toggleComponent = (id: string) => setComponents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const canContinue = vibe && components.length > 0

  const handleContinue = () => {
    if (canContinue) onContinue(vibe!, components)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter' && canContinue) handleContinue() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canContinue, vibe, components])

  return (
    <div className="screen" style={{
      opacity: visible ? 1 : 0, background: bg,
      transition: 'background 0.5s ease, opacity 0.4s ease',
    }}>
      <div className="progress-track" style={{ background: `${accent}22`, transition: 'background 0.5s ease' }}>
        <div className="progress-fill" style={{ width: '66%', background: `linear-gradient(90deg, ${accent}, ${accent}bb)`, transition: 'width 0.5s ease, background 0.5s ease' }} />
      </div>

      <BackButton onClick={() => { onPreview(null); onBack() }} color={muted} />

      <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10, overflowY: 'auto' }}>
        <div className="step-label" style={{ color: accent, transition: 'color 0.5s ease' }}>{t('stepOf', { step: 2 }).replace('6', '3')}</div>
        <h1 className="heading" style={{ color: text, transition: 'color 0.5s ease' }}>Shape your experience</h1>
        <p className="subtext" style={{ color: muted, transition: 'color 0.5s ease' }}>Your daily experience</p>

        {/* Vibe selector: 3 on first row, 2 on second */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: accent, letterSpacing: '0.1em', marginBottom: 8, transition: 'color 0.5s ease' }}>YOUR VIBE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {VIBES.map(v => {
              const sel = vibe === v.key
              return (
                <button key={v.key} onClick={() => handleSelect(v.key)} style={{
                  border: sel ? `2px solid ${accent}` : `1.5px solid ${accent}25`,
                  borderRadius: 14, padding: '12px 6px', textAlign: 'center', cursor: 'pointer',
                  background: sel ? `${accent}15` : `${accent}08`,
                  transition: 'all 0.25s ease', position: 'relative',
                  boxShadow: sel ? `0 0 0 3px ${accent}33` : 'none',
                }}>
                  {sel && <div className="check-circle" style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, background: accent, fontSize: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>✓</div>}
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{v.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'Karla', sans-serif", color: text, transition: 'color 0.25s ease' }}>{t(`vibes.${v.key}`)}</div>
                  <div style={{ fontSize: 9, color: muted, lineHeight: 1.2, marginTop: 2, transition: 'color 0.25s ease' }}>{t(`vibeTaglines.${v.key}`)}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Components */}
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: accent, letterSpacing: '0.1em', marginBottom: 8, transition: 'color 0.5s ease' }}>YOUR DAILY CONTENT</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_COMPONENTS.map(c => {
              const sel = components.includes(c.id)
              return (
                <button key={c.id} onClick={() => toggleComponent(c.id)} style={{
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                  border: sel ? `1.5px solid ${accent}` : `1.5px solid ${accent}20`,
                  background: sel ? `${accent}12` : 'transparent',
                  fontFamily: "'Karla', sans-serif", fontSize: 12, fontWeight: sel ? 600 : 400,
                  color: sel ? text : muted, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 13 }}>{c.emoji}</span>
                  {c.label}
                  {sel && <span style={{ fontSize: 10, color: accent }}>✓</span>}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Karla', sans-serif", fontSize: 10, color: muted, marginTop: 6, transition: 'color 0.5s ease' }}>Tap to remove</div>
        </div>

        <div className="spacer" />
        <button onClick={handleContinue} disabled={!canContinue}
          className="btn-primary" style={{ background: canContinue ? accent : `${accent}44`, transition: 'background 0.4s ease' }}>
          Continue
        </button>
        <button onClick={() => onContinue('calm', ALL_COMPONENTS.map(c => c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Karla', sans-serif", fontSize: 12, color: muted, padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default OnboardingStep2
