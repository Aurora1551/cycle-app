import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { VibeKey } from '../types'
import { VIBES, ALL_EXTRA_GENRES } from '../types'

interface Props {
  onBack: () => void
  onContinue: (genres: string[]) => void
  vibe: VibeKey
  initialValue?: string[]
}

const LATIN_GENRES = ['Latin pop', 'Reggaeton', 'Latin ballads']

const OnboardingMusic: React.FC<Props> = ({ onBack, onContinue, vibe, initialValue }) => {
  const { t, i18n } = useTranslation()
  const vibeTheme = VIBES.find(v => v.key === vibe) || VIBES[0]
  const isLatinLang = i18n.language?.startsWith('es') || i18n.language?.startsWith('pt')
  const defaultGenres = isLatinLang ? LATIN_GENRES : vibeTheme.genres
  const [selected, setSelected] = useState<string[]>(initialValue || [...defaultGenres])
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  // Allow Enter key to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Enter' && selected.length > 0) onContinue(selected) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, onContinue])

  const { bg, accent, text, muted } = vibeTheme
  const extraGenres = ALL_EXTRA_GENRES.filter(g => !defaultGenres.includes(g))
  const toggle = (genre: string) => setSelected(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])
  const isLight = ['#FDF0EC', '#FFFBF0', '#FDF6F0'].includes(bg)

  const chipStyle = (isOn: boolean, isDefault: boolean): React.CSSProperties => ({
    border: `1.5px solid ${isOn ? accent : isDefault ? `${accent}33` : (isLight ? 'rgba(196,97,74,0.18)' : 'rgba(255,255,255,0.12)')}`,
    background: isOn ? `${accent}14` : isDefault ? 'transparent' : (isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)'),
    color: isOn ? accent : muted,
  })

  return (
    <div className="screen fade-in" style={{ opacity: visible ? 1 : 0, background: bg }}>
      <div className="progress-track" style={{ background: `${accent}22` }}>
        <div className="progress-fill" style={{ width: '100%', background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }} />
      </div>
      <button onClick={onBack} className="btn-back" style={{ color: muted }}>{t('back')}</button>

      <div className="content" style={{ gap: 14 }}>
        <div className="step-label" style={{ color: accent }}>{t('stepOf', { step: 3 }).replace('6', '3')}</div>
        <h1 className="heading" style={{ color: text }}>{t('onboardingMusic.heading')}</h1>
        <p className="subtext" style={{ color: muted, marginTop: -4 }}>{t('onboardingMusic.subtext', { emoji: vibeTheme.emoji, vibe: vibeTheme.label })}</p>

        <div>
          <div className="flex-wrap">
            {defaultGenres.map(genre => {
              const isOn = selected.includes(genre)
              return <button key={genre} onClick={() => toggle(genre)} className="chip" style={chipStyle(isOn, true)}>{genre}{isOn && <span style={{ fontSize: 10 }}>✓</span>}</button>
            })}
          </div>
        </div>

        <div style={{ height: 1, background: `${accent}20` }} />

        <div>
          <div className="mono-hint" style={{ color: muted, marginBottom: 10 }}>{t('onboardingMusic.addMore')}</div>
          <div className="flex-wrap">
            {extraGenres.map(genre => {
              const isOn = selected.includes(genre)
              return <button key={genre} onClick={() => toggle(genre)} className="chip" style={chipStyle(isOn, false)}>{genre}{isOn && <span style={{ fontSize: 10 }}>✓</span>}</button>
            })}
          </div>
        </div>

        <div className="mono-sm text-center" style={{ color: muted }}>{selected.length} {t('onboardingMusic.genresSelected')}</div>
        <div className="spacer" />
        <button onClick={() => selected.length > 0 && onContinue(selected)} disabled={selected.length === 0}
          className="btn-primary" style={{ background: selected.length > 0 ? accent : `${accent}44` }}>
          {t('onboardingMusic.seeJourney')}
        </button>
        <button onClick={() => onContinue(['pop', 'ambient'])} className="body-font btn-bare" style={{ fontSize: 12, color: muted, padding: '12px 0', minHeight: 44, width: '100%', textAlign: 'center' }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default OnboardingMusic
