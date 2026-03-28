import React, { useState, useEffect } from 'react'
import type { VibeKey } from '../types'
import { VIBES, ALL_EXTRA_GENRES } from '../types'

interface Props {
  onBack: () => void
  onContinue: (genres: string[]) => void
  vibe: VibeKey
  initialValue?: string[]
}

const OnboardingMusic: React.FC<Props> = ({ onBack, onContinue, vibe, initialValue }) => {
  const vibeTheme = VIBES.find(v => v.key === vibe) || VIBES[0]
  const defaultGenres = vibeTheme.genres

  const [selected, setSelected] = useState<string[]>(initialValue || [...defaultGenres])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const { bg, accent, text, muted } = vibeTheme
  const progress = (6 / 6) * 100

  const extraGenres = ALL_EXTRA_GENRES.filter(g => !defaultGenres.includes(g))

  const toggle = (genre: string) => {
    setSelected(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const isLight = ['#FDF0EC', '#FFFBF0', '#FDF6F0'].includes(bg)

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
      width: '100%',
      maxWidth: 390,
      minHeight: '100svh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ height: 3, width: '100%', background: `${accent}22`, flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
          borderRadius: 2,
        }} />
      </div>

      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.1em',
          color: muted,
          padding: '14px 20px 6px',
          textAlign: 'left',
          display: 'block',
        }}
      >
        ← back
      </button>

      <div style={{ padding: '12px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>
          Step 6 of 6
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: text, lineHeight: 1.1 }}>
          Your music taste
        </h1>

        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: muted, lineHeight: 1.5, marginTop: -4 }}>
          Suggested for {vibeTheme.emoji} {vibeTheme.label} — swap any out.
        </p>

        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
            Your picks
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {defaultGenres.map(genre => {
              const isOn = selected.includes(genre)
              return (
                <button
                  key={genre}
                  onClick={() => toggle(genre)}
                  style={{
                    fontSize: 12,
                    padding: '7px 14px',
                    borderRadius: 24,
                    fontWeight: 500,
                    fontFamily: "'Karla', sans-serif",
                    cursor: 'pointer',
                    border: `1.5px solid ${isOn ? accent : `${accent}33`}`,
                    background: isOn ? `${accent}14` : 'transparent',
                    color: isOn ? accent : muted,
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {genre}
                  {isOn && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          height: 1,
          background: `${accent}20`,
        }} />

        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: muted, marginBottom: 10 }}>
            Add more
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {extraGenres.map(genre => {
              const isOn = selected.includes(genre)
              return (
                <button
                  key={genre}
                  onClick={() => toggle(genre)}
                  style={{
                    fontSize: 12,
                    padding: '7px 14px',
                    borderRadius: 24,
                    fontWeight: 500,
                    fontFamily: "'Karla', sans-serif",
                    cursor: 'pointer',
                    border: `1.5px solid ${isOn ? accent : (isLight ? 'rgba(196,97,74,0.18)' : 'rgba(255,255,255,0.12)')}`,
                    background: isOn ? `${accent}14` : (isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)'),
                    color: isOn ? accent : muted,
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {genre}
                  {isOn && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: muted, letterSpacing: '0.1em', textAlign: 'center' }}>
          {selected.length} genre{selected.length !== 1 ? 's' : ''} selected
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => selected.length > 0 && onContinue(selected)}
          disabled={selected.length === 0}
          style={{
            width: '100%',
            background: selected.length > 0 ? accent : `${accent}44`,
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: selected.length > 0 ? 'pointer' : 'default',
            letterSpacing: '0.02em',
            transition: 'background 0.2s ease',
          }}
        >
          See my journey →
        </button>
      </div>
    </div>
  )
}

export default OnboardingMusic
