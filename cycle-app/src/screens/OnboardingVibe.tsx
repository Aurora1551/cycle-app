import React, { useState, useEffect } from 'react'
import type { VibeKey } from '../types'
import { VIBES } from '../types'


interface Props {
  onBack: () => void
  onContinue: (vibe: VibeKey) => void
  initialValue?: VibeKey | null
  onPreview: (vibe: VibeKey | null) => void
}

const OnboardingVibe: React.FC<Props> = ({ onBack, onContinue, initialValue, onPreview }) => {
  const [selected, setSelected] = useState<VibeKey | null>(initialValue || null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const activeVibe = selected ? VIBES.find(v => v.key === selected) : null
  const accent = activeVibe?.accent || '#C4614A'
  const text = activeVibe?.text || '#1C0F0C'
  const muted = activeVibe?.muted || '#9B7B74'
  const bg = activeVibe?.bg || '#FDF6F0'
  const progress = (5 / 6) * 100

  const handleSelect = (key: VibeKey) => {
    setSelected(key)
    onPreview(key)
  }

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      width: '100%',
      maxWidth: 390,
      minHeight: '100svh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      transition: 'background 0.5s ease, opacity 0.4s ease',
    }}>
      <div style={{ height: 3, width: '100%', background: `${accent}22`, flexShrink: 0, transition: 'background 0.5s ease' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
          borderRadius: 2,
          transition: 'width 0.5s ease, background 0.5s ease',
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
          transition: 'color 0.5s ease',
        }}
      >
        ← back
      </button>

      <div style={{ padding: '12px 24px 32px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, transition: 'color 0.5s ease' }}>
          Step 5 of 6
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: text, lineHeight: 1.1, transition: 'color 0.5s ease' }}>
          What's your vibe?
        </h1>

        <p style={{ fontFamily: "'Karla', sans-serif", fontSize: 13, fontWeight: 300, color: muted, lineHeight: 1.5, transition: 'color 0.5s ease' }}>
          This shapes your whole experience — try each one.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VIBES.map(v => {
            const isSelected = selected === v.key
            return (
              <button
                key={v.key}
                onClick={() => handleSelect(v.key)}
                style={{
                  background: isSelected ? v.bg : `${v.bg}${isSelected ? 'ff' : '44'}`,
                  border: isSelected ? `2px solid ${v.accent}` : `1.5px solid ${v.accent}33`,
                  borderRadius: 14,
                  padding: '14px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: isSelected ? `0 0 0 3px ${v.accent}33` : 'none',
                  position: 'relative',
                }}
                onMouseEnter={() => !selected && onPreview(v.key)}
                onMouseLeave={() => !selected && onPreview(null)}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: v.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: 26, marginBottom: 6 }}>{v.emoji}</div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'Karla', sans-serif",
                  color: isSelected ? v.text : text,
                  marginBottom: 3,
                  transition: 'color 0.25s ease',
                }}>
                  {v.label}
                </div>
                <div style={{
                  fontSize: 10,
                  color: isSelected ? v.muted : muted,
                  lineHeight: 1.3,
                  transition: 'color 0.25s ease',
                }}>
                  {v.tagline}
                </div>
              </button>
            )
          })}
        </div>

        {selected && (
          <div style={{
            background: `${accent}11`,
            border: `1px solid ${accent}33`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 0.4s ease',
          }}>
            <span style={{ fontSize: 20 }}>{activeVibe?.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily: "'Karla', sans-serif" }}>
                {activeVibe?.label} vibe selected
              </div>
              <div style={{ fontSize: 11, color: muted }}>
                Music: {activeVibe?.genres.join(' · ')}
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => selected && onContinue(selected)}
          disabled={!selected}
          style={{
            width: '100%',
            background: selected ? accent : `${accent}44`,
            color: 'white',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontFamily: "'Karla', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: selected ? 'pointer' : 'default',
            transition: 'background 0.4s ease',
            letterSpacing: '0.02em',
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

export default OnboardingVibe
