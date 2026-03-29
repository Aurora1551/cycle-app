import React from 'react'
import type { VibeTypo } from '../types'

interface ScreenShellProps {
  bg: string
  visible: boolean
  children: React.ReactNode
  transition?: string
  style?: React.CSSProperties
}

export const ScreenShell: React.FC<ScreenShellProps> = ({ bg, visible, children, transition = 'opacity 0.4s ease', style }) => (
  <div style={{
    width: '100%', maxWidth: 390, minHeight: '100svh',
    background: bg, display: 'flex', flexDirection: 'column',
    opacity: visible ? 1 : 0, transition,
    ...style,
  }}>
    {children}
  </div>
)

interface CardProps {
  cardBg: string
  cardBorder: string
  children: React.ReactNode
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({ cardBg, cardBorder, children, style }) => (
  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '18px', ...style }}>
    {children}
  </div>
)

interface SectionLabelProps {
  color: string
  children: React.ReactNode
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ color, children }) => (
  <div style={{
    fontFamily: "'DM Mono', monospace", fontSize: 8,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    color, marginBottom: 10,
  }}>
    {children}
  </div>
)

interface ToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  accent: string
  isDark: boolean
}

export const Toggle: React.FC<ToggleProps> = ({ value, onChange, accent, isDark }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      width: 46, height: 26, borderRadius: 13,
      background: value ? accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: 3, left: value ? 23 : 3,
      width: 20, height: 20, borderRadius: '50%', background: 'white',
      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }} />
  </button>
)

interface PrimaryButtonProps {
  accent: string
  typo: VibeTypo
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ accent, typo, onClick, disabled, children, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%', background: disabled ? `${accent}44` : accent,
      color: 'white', border: 'none', borderRadius: 14, padding: '16px',
      fontFamily: typo.bodyFont, fontWeight: 600, fontSize: 15,
      cursor: disabled ? 'default' : 'pointer', letterSpacing: '0.02em',
      transition: 'background 0.2s ease',
      ...style,
    }}
  >
    {children}
  </button>
)

interface GhostButtonProps {
  color: string
  borderColor: string
  typo: VibeTypo
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}

export const GhostButton: React.FC<GhostButtonProps> = ({ color, borderColor, typo, onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', background: 'transparent', color,
      border: `1.5px solid ${borderColor}`, borderRadius: 14, padding: '15px',
      fontFamily: typo.bodyFont, fontSize: 14, fontWeight: 400, cursor: 'pointer',
      ...style,
    }}
  >
    {children}
  </button>
)

interface BackButtonProps {
  onClick: () => void
  color: string
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: "'DM Mono', monospace", fontSize: 11,
      letterSpacing: '0.1em', color, padding: '20px 24px 0', textAlign: 'left',
    }}
  >
    ← back
  </button>
)
