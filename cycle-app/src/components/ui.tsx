import React from 'react'
import type { VibeTypo } from '../types'

interface ScreenShellProps {
  bg: string
  visible: boolean
  children: React.ReactNode
  transition?: string
  style?: React.CSSProperties
  accent?: string
  text?: string
  muted?: string
  cardBg?: string
  cardBorder?: string
  typo?: VibeTypo
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  bg, visible, children, transition = 'opacity 0.4s ease', style,
  accent, text, muted, cardBg, cardBorder, typo,
}) => (
  <div className="screen" style={{
    background: bg, opacity: visible ? 1 : 0, transition,
    '--accent': accent, '--text': text, '--muted': muted, '--bg': bg,
    '--card-bg': cardBg, '--card-border': cardBorder,
    '--heading-font': typo?.headingFont, '--heading-weight': typo?.headingWeight,
    '--heading-style': typo?.headingStyle, '--body-font': typo?.bodyFont,
    '--body-weight': typo?.bodyWeight,
    ...style,
  } as React.CSSProperties}>
    {children}
  </div>
)

interface CardProps {
  cardBg: string
  cardBorder: string
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export const Card: React.FC<CardProps> = ({ cardBg, cardBorder, children, style, className }) => (
  <div className={className} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '18px', ...style }}>
    {children}
  </div>
)

interface SectionLabelProps {
  color: string
  children: React.ReactNode
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ color, children }) => (
  <div className="mono-hint" style={{ color, marginBottom: 10 }}>
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
    className="btn-primary"
    style={{
      background: disabled ? `${accent}44` : accent,
      fontFamily: typo.bodyFont,
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
    className="btn-ghost"
    style={{
      color, border: `1.5px solid ${borderColor}`,
      fontFamily: typo.bodyFont, fontWeight: 400,
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
  <button onClick={onClick} className="btn-back" style={{ color }}>
    ← back
  </button>
)
